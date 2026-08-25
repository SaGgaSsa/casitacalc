import {
  MAX_CSV_BYTES,
  computeReferenceProposals,
  hashDedupeKey,
  observationDedupeKey,
  parseCsvText,
  validatePriceCsvRow,
  type PriceRowContext,
} from "@casitacalc/calculator-core";
import {
  CollectionStatus,
  MIN_REFERENCE_SAMPLES,
  RegionEnum,
  RejectionReason,
  ReferencePriceStatus,
  RowStatus,
  Unit,
  type NormalizedPriceObservationInput,
  type RegionCode,
} from "@casitacalc/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

// ── Tipos del preview / detalle (contrato compartido con la UI) ─────────────

export interface PriceImportPreviewRow {
  line: number;
  status: RowStatus;
  materialCode: string | null;
  materialNombre: string | null;
  title: string;
  url: string | null;
  rawPrice: number | null;
  packageQuantity: number | null;
  packageUnit: string | null;
  normalizedUnitPrice: number | null;
  reason: string | null;
  message: string | null;
}

export interface PriceImportPreviewProposal {
  materialCode: string;
  materialNombre: string;
  sampleSize: number;
  medianPrice: number | null;
  insufficientSample: boolean;
  /** Último precio PUBLISHED del material; null si nunca tuvo. */
  previousPrice: number | null;
  /** La mediana supera el umbral de inflación: requiere forceAll para importar. */
  exceedsInflation: boolean;
}

/** Resultado de validar un archivo SIN persistir nada. */
export interface PriceImportPreview {
  filename: string;
  totalRows: number;
  validRows: number;
  /** Filas válidas de materiales que NO superan el umbral: se importan sin force. */
  importableRows: number;
  /** Filas válidas de materiales marcados por inflación: requieren forceAll. */
  flaggedRows: number;
  warningRows: number;
  invalidRows: number;
  parseErrors: { line: number; message: string }[];
  sources: string[];
  region: RegionCode;
  collectedAtMin: string | null;
  collectedAtMax: string | null;
  rows: PriceImportPreviewRow[];
  proposals: PriceImportPreviewProposal[];
  /** Warnings tipo "INSUFFICIENT_SAMPLE_SIZE:MATERIAL_CODE". */
  warnings: string[];
}

export class PriceImportError extends Error {
  constructor(
    message: string,
    readonly code:
      | "EMPTY_FILE"
      | "TOO_LARGE"
      | "MISSING_HEADER"
      | "MIXED_REGIONS"
      | "NO_VALID_ROWS"
      | "NOT_FOUND"
      | "INVALID_STATE",
  ) {
    super(message);
    this.name = "PriceImportError";
  }
}

interface ValidatedFile {
  preview: PriceImportPreview;
  accepted: {
    dto: NormalizedPriceObservationInput;
    normalizedUnitPrice: number;
    normalizedUnit: Unit;
  }[];
  sourceIdsByCode: Map<string, string>;
  materialIdsByCode: Map<string, string>;
  region: RegionCode;
  collectedAtMin: Date;
  collectedAtMax: Date;
}

// ── Pipeline común: preview y confirmación corren EXACTAMENTE lo mismo ──────

async function loadContext(): Promise<{
  ctx: PriceRowContext;
  sourceIdsByCode: Map<string, string>;
  materialInfo: Map<string, { id: string; nombre: string; unidad: Unit }>;
}> {
  const [sources, materials] = await Promise.all([
    prisma.priceSource.findMany({ where: { enabled: true }, select: { code: true, id: true } }),
    prisma.material.findMany({
      select: { codigo: true, id: true, nombre: true, unidad: true },
      orderBy: { codigo: "asc" },
    }),
  ]);
  const materialsByCode: Record<string, { unidad: Unit }> = {};
  const materialInfo = new Map<string, { id: string; nombre: string; unidad: Unit }>();
  for (const m of materials) {
    materialsByCode[m.codigo] = { unidad: m.unidad as Unit };
    materialInfo.set(m.codigo, { id: m.id, nombre: m.nombre, unidad: m.unidad as Unit });
  }
  return {
    ctx: { enabledSources: sources.map((s) => s.code), materialsByCode },
    sourceIdsByCode: new Map(sources.map((s) => [s.code, s.id])),
    materialInfo,
  };
}

function candidateHash(parsedRows: { data: Record<string, string> }[]): Set<string> {
  // Claves de identidad según las celdas crudas, para consultar el historial
  // antes de validar fila por fila.
  const hashes = new Set<string>();
  for (const { data } of parsedRows) {
    let collectedAt: Date | null = null;
    if (data.collected_at) {
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(data.collected_at.trim())
        ? `${data.collected_at.trim()}T00:00:00.000Z`
        : data.collected_at.trim();
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) collectedAt = d;
    }
    if (!collectedAt) continue; // la validación fila por fila lo reporta
    hashes.add(
      hashDedupeKey(
        observationDedupeKey({
          source: data.source?.trim().toUpperCase() ?? "",
          externalId: data.external_id?.trim() || null,
          materialCode: data.material_code?.trim().toUpperCase() ?? "",
          url: data.url?.trim() ?? "",
          collectedAt,
        }),
      ),
    );
  }
  return hashes;
}

/**
 * Valida un CSV contra fuentes/materiales/historial SIN escribir nada.
 * Es el corazón del importador: server-side y reproducible.
 */
export async function validatePriceCsv(input: {
  filename: string;
  content: string;
}): Promise<ValidatedFile> {
  if (!input.content || input.content.trim() === "") {
    throw new PriceImportError("El archivo está vacío", "EMPTY_FILE");
  }
  if (Buffer.byteLength(input.content, "utf8") > MAX_CSV_BYTES) {
    throw new PriceImportError("El archivo supera el límite de 2 MB", "TOO_LARGE");
  }

  const [{ ctx, sourceIdsByCode, materialInfo }, parsed] = await Promise.all([
    loadContext(),
    Promise.resolve(parseCsvText(input.content)),
  ]);

  const REQUIRED = [
    "source", "region", "collected_at", "material_code", "title", "url",
    "currency", "raw_price", "package_quantity", "package_unit",
  ];
  const missing = REQUIRED.filter((h) => !parsed.headers.includes(h));
  if (missing.length > 0) {
    throw new PriceImportError(
      `Encabezado inválido: faltan las columnas ${missing.join(", ")}`,
      "MISSING_HEADER",
    );
  }

  const existing = await prisma.priceObservation.findMany({
    where: { dedupeHash: { in: [...candidateHash(parsed.rows)] } },
    select: { dedupeHash: true },
  });
  const existingHashes = new Set(existing.map((e) => e.dedupeHash));

  const seenInFile = new Set<string>();
  const previewRows: PriceImportPreviewRow[] = [];
  const accepted: ValidatedFile["accepted"] = [];

  for (const row of parsed.rows) {
    const result = validatePriceCsvRow(
      row,
      { ...ctx, existingDedupeHashes: existingHashes },
      seenInFile,
    );
    const dto = result.dto;
    previewRows.push({
      line: result.line,
      status: result.status,
      materialCode: dto?.materialCode ?? row.data.material_code?.toUpperCase() ?? null,
      materialNombre: dto ? materialInfo.get(dto.materialCode)?.nombre ?? null : null,
      title: dto?.title ?? row.data.title ?? "",
      url: dto?.url ?? row.data.url?.trim() ?? null,
      rawPrice: dto?.rawPrice ?? null,
      packageQuantity: dto?.packageQuantity ?? null,
      packageUnit: dto?.packageUnit ?? row.data.package_unit?.toUpperCase() ?? null,
      normalizedUnitPrice: result.normalizedUnitPrice ?? null,
      reason: result.reason ?? null,
      message: result.message ?? null,
    });
    if (
      result.status === RowStatus.VALID &&
      dto &&
      result.normalizedUnitPrice !== undefined &&
      result.normalizedUnit
    ) {
      accepted.push({ dto, normalizedUnitPrice: result.normalizedUnitPrice, normalizedUnit: result.normalizedUnit });
    }
  }

  // Región única por archivo: la colección y sus observaciones heredan una sola.
  const regions = [
    ...new Set(
      parsed.rows.map((r) => r.data.region?.trim().toUpperCase()).filter((v): v is string => Boolean(v)),
    ),
  ];
  if (regions.length > 1) {
    throw new PriceImportError(
      `El archivo mezcla regiones (${regions.join(", ")}); separá un archivo por región`,
      "MIXED_REGIONS",
    );
  }
  const regionParsed = RegionEnum.safeParse(regions[0]);
  if (!regionParsed.success) {
    throw new PriceImportError("El archivo no tiene una región válida", "MISSING_HEADER");
  }

  const dates = accepted.map((a) => a.dto.collectedAt.getTime());
  const collectedAtMin = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
  const collectedAtMax = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

  const publicados = await getPublishedPrices(regionParsed.data);
  const previousPrices = new Map([...publicados].map(([codigo, info]) => [codigo, info.precio]));
  const { proposals, warnings } = computeReferenceProposals(
    accepted.map((a) => ({ materialCode: a.dto.materialCode, normalizedUnitPrice: a.normalizedUnitPrice })),
    { previousPrices },
  );
  const flaggedCodes = new Set(proposals.filter((p) => p.exceedsInflation).map((p) => p.materialCode));
  const flaggedRows = accepted.filter((a) => flaggedCodes.has(a.dto.materialCode)).length;

  const preview: PriceImportPreview = {
    filename: input.filename,
    totalRows: parsed.rows.length,
    validRows: accepted.length,
    importableRows: accepted.length - flaggedRows,
    flaggedRows,
    warningRows: previewRows.filter((r) => r.status === RowStatus.WARNING).length,
    invalidRows: previewRows.filter((r) => r.status === RowStatus.INVALID).length + parsed.errors.length,
    parseErrors: parsed.errors,
    sources: [
      ...new Set(
        parsed.rows.map((r) => r.data.source?.trim().toUpperCase()).filter((v): v is string => Boolean(v)),
      ),
    ],
    region: regionParsed.data,
    collectedAtMin: dates.length > 0 ? collectedAtMin.toISOString() : null,
    collectedAtMax: dates.length > 0 ? collectedAtMax.toISOString() : null,
    rows: previewRows,
    proposals: proposals.map((p) => ({
      materialCode: p.materialCode,
      materialNombre: materialInfo.get(p.materialCode)?.nombre ?? p.materialCode,
      sampleSize: p.sampleSize,
      medianPrice: p.medianPrice,
      insufficientSample: p.insufficientSample,
      previousPrice: p.previousPrice,
      exceedsInflation: p.exceedsInflation,
    })),
    warnings,
  };

  return {
    preview,
    accepted,
    sourceIdsByCode,
    materialIdsByCode: new Map([...materialInfo.entries()].map(([code, v]) => [code, v.id])),
    region: regionParsed.data,
    collectedAtMin,
    collectedAtMax,
  };
}

// ── Preview público del servicio ────────────────────────────────────────────

export async function previewPriceImport(input: {
  filename: string;
  content: string;
}): Promise<PriceImportPreview> {
  const { preview } = await validatePriceCsv(input);
  return preview;
}

// ── Confirmación: crea colección + observaciones + referencias DRAFT ────────

export async function confirmPriceImport(input: {
  filename: string;
  content: string;
  createdBy: string;
  /** Importa también materiales marcados por superar el umbral de inflación. */
  forceAll?: boolean;
}): Promise<{ collectionId: string; preview: PriceImportPreview }> {
  const validated = await validatePriceCsv(input);
  if (validated.accepted.length === 0) {
    throw new PriceImportError("Ninguna fila es válida; no se importa nada", "NO_VALID_ROWS");
  }

  const { sourceIdsByCode, materialIdsByCode, region } = validated;
  // Sin force, los materiales que superan el umbral de inflación quedan fuera.
  const flaggedCodes = new Set(
    validated.preview.proposals.filter((p) => p.exceedsInflation).map((p) => p.materialCode),
  );
  const accepted = input.forceAll
    ? validated.accepted
    : validated.accepted.filter((a) => !flaggedCodes.has(a.dto.materialCode));
  if (accepted.length === 0) {
    throw new PriceImportError(
      "Todos los materiales superan el umbral de inflación; repetí la operación forzando la importación",
      "NO_VALID_ROWS",
    );
  }

  // Fuente única del relevamiento si todo el archivo comparte fuente.
  const sourceCodes = [...new Set(accepted.map((a) => a.dto.source))];
  const firstSource = sourceCodes[0];
  const singleSourceId =
    sourceCodes.length === 1 && firstSource !== undefined
      ? sourceIdsByCode.get(firstSource) ?? null
      : null;

  const collection = await prisma.$transaction(async (tx) => {
    const created = await tx.priceCollection.create({
      data: {
        sourceId: singleSourceId,
        region,
        collectedAt: validated.collectedAtMax,
        originalFilename: input.filename.slice(0, 200),
        status: CollectionStatus.DRAFT,
        totalRows: validated.preview.totalRows,
        acceptedRows: accepted.length,
        rejectedRows:
          validated.preview.invalidRows + (validated.accepted.length - accepted.length),
        createdBy: input.createdBy,
      },
      select: { id: true },
    });

    for (const item of accepted) {
      await tx.priceObservation.create({
        data: {
          collectionId: created.id,
          materialId: materialIdsByCode.get(item.dto.materialCode)!,
          sourceId: sourceIdsByCode.get(item.dto.source)!,
          externalId: item.dto.externalId ?? null,
          title: item.dto.title,
          url: item.dto.url,
          rawPrice: item.dto.rawPrice,
          currency: item.dto.currency.toUpperCase(),
          packageQuantity: item.dto.packageQuantity,
          packageUnit: item.dto.packageUnit,
          normalizedUnitPrice: item.normalizedUnitPrice,
          normalizedUnit: item.normalizedUnit,
          seller: item.dto.seller ?? null,
          brand: item.dto.brand ?? null,
          accepted: true,
          rejectionReason: null,
          collectedAt: item.dto.collectedAt,
          metadata: (item.dto.metadata as Prisma.InputJsonValue) ?? undefined,
          dedupeHash: hashDedupeKey(
            observationDedupeKey({
              source: item.dto.source,
              externalId: item.dto.externalId,
              materialCode: item.dto.materialCode,
              url: item.dto.url,
              collectedAt: item.dto.collectedAt,
            }),
          ),
        },
      });
    }

    await createReferencePrices(tx, created.id, region, validated.collectedAtMin);

    return created;
  });

  return { collectionId: collection.id, preview: validated.preview };
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Agrupa observaciones aceptadas de una colección y crea referencias DRAFT. */
async function createReferencePrices(tx: Tx, collectionId: string, region: RegionCode, validFrom: Date) {
  const observations = await tx.priceObservation.findMany({
    where: { collectionId, accepted: true },
    select: { materialId: true, normalizedUnitPrice: true, material: { select: { codigo: true } } },
  });

  const byMaterial = new Map<string, number[]>();
  for (const obs of observations) {
    const list = byMaterial.get(obs.materialId) ?? [];
    list.push(Number(obs.normalizedUnitPrice));
    byMaterial.set(obs.materialId, list);
  }

  const collection = await tx.priceCollection.findUniqueOrThrow({
    where: { id: collectionId },
    select: { sourceId: true },
  });

  for (const [materialId, prices] of byMaterial) {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const midValue = sorted[mid];
    if (midValue === undefined) continue;
    const mediana =
      sorted.length % 2 === 1
        ? midValue
        : Math.round(((sorted[mid - 1] ?? midValue) + midValue) / 2 * 100) / 100;

    await tx.materialReferencePrice.create({
      data: {
        materialId,
        sourceId: collection.sourceId,
        region,
        price: mediana,
        sampleSize: prices.length,
        insufficientSample: prices.length < MIN_REFERENCE_SAMPLES,
        collectionId,
        validFrom,
        status: ReferencePriceStatus.DRAFT,
      },
    });
  }
}

// ── Consultas para admin ────────────────────────────────────────────────────

export async function listPriceCollections(limit = 50) {
  const rows = await prisma.priceCollection.findMany({
    orderBy: { importedAt: "desc" },
    take: limit,
    include: {
      source: { select: { code: true, name: true } },
      _count: { select: { observations: true, referencePrices: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    filename: c.originalFilename,
    sourceName: c.source?.name ?? "Mixta",
    region: c.region,
    collectedAt: c.collectedAt.toISOString(),
    importedAt: c.importedAt.toISOString(),
    status: c.status,
    totalRows: c.totalRows,
    acceptedRows: c.acceptedRows,
    rejectedRows: c.rejectedRows,
    createdBy: c.createdBy,
    referenceCount: c._count.referencePrices,
  }));
}

export type PriceCollectionSummary = Awaited<ReturnType<typeof listPriceCollections>>[number];

/** Vista Material/Fuente/Muestras/Mediana/Estado requerida por admin. */
export async function getCollectionDetail(id: string) {
  const collection = await prisma.priceCollection.findUnique({
    where: { id },
    include: { source: { select: { code: true, name: true } } },
  });
  if (!collection) return null;

  const [observations, references] = await Promise.all([
    prisma.priceObservation.findMany({
      where: { collectionId: id },
      include: {
        material: { select: { codigo: true, nombre: true } },
        source: { select: { code: true, name: true } },
      },
      orderBy: [{ materialId: "asc" }, { normalizedUnitPrice: "asc" }],
    }),
    prisma.materialReferencePrice.findMany({
      where: { collectionId: id },
      include: {
        material: { select: { codigo: true, nombre: true, unidad: true } },
        source: { select: { name: true } },
      },
      orderBy: { materialId: "asc" },
    }),
  ]);

  const usadasPorReferencia = new Map<string, number>();
  const rechazadasPorMaterial = new Map<string, number>();
  for (const obs of observations) {
    if (obs.accepted) {
      usadasPorReferencia.set(obs.materialId, (usadasPorReferencia.get(obs.materialId) ?? 0) + 1);
    } else {
      rechazadasPorMaterial.set(obs.materialId, (rechazadasPorMaterial.get(obs.materialId) ?? 0) + 1);
    }
  }

  return {
    id: collection.id,
    filename: collection.originalFilename,
    sourceName: collection.source?.name ?? "Mixta",
    region: collection.region,
    status: collection.status,
    collectedAt: collection.collectedAt.toISOString(),
    importedAt: collection.importedAt.toISOString(),
    createdBy: collection.createdBy,
    totalRows: collection.totalRows,
    acceptedRows: collection.acceptedRows,
    rejectedRows: collection.rejectedRows,
    references: references.map((r) => ({
      id: r.id,
      materialCodigo: r.material.codigo,
      materialNombre: r.material.nombre,
      unidad: r.material.unidad,
      fuente: r.source?.name ?? "Mixta",
      sampleSize: r.sampleSize,
      insufficientSample: r.insufficientSample,
      usadas: usadasPorReferencia.get(r.materialId) ?? 0,
      rechazadas: rechazadasPorMaterial.get(r.materialId) ?? 0,
      precioPropuesto: Number(r.price),
      estado: r.status,
    })),
    observations: observations.map((o) => ({
      id: o.id,
      materialCodigo: o.material.codigo,
      materialNombre: o.material.nombre,
      titulo: o.title,
      url: o.url,
      fuente: o.source.name,
      rawPrice: Number(o.rawPrice),
      packageQuantity: Number(o.packageQuantity),
      packageUnit: o.packageUnit,
      normalizedUnitPrice: Number(o.normalizedUnitPrice),
      normalizedUnit: o.normalizedUnit,
      accepted: o.accepted,
      rejectionReason: o.rejectionReason,
      collectedAt: o.collectedAt.toISOString(),
    })),
  };
}

export type PriceCollectionDetail = NonNullable<Awaited<ReturnType<typeof getCollectionDetail>>>;

// ── Acciones de administración ──────────────────────────────────────────────

/** Publica todas las referencias DRAFT de la colección. Nunca automático. */
export async function publishReferencePrices(collectionId: string): Promise<number> {
  const refs = await prisma.materialReferencePrice.findMany({
    where: { collectionId, status: ReferencePriceStatus.DRAFT },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.materialReferencePrice.updateMany({
      where: { id: { in: refs.map((r) => r.id) } },
      data: { status: ReferencePriceStatus.PUBLISHED },
    }),
    prisma.priceCollection.update({
      where: { id: collectionId },
      data: { status: CollectionStatus.PUBLISHED },
    }),
  ]);
  return refs.length;
}

/** Rechaza la colección completa: sus referencias vuelven/van a REJECTED. */
export async function rejectReferencePrices(collectionId: string): Promise<void> {
  await prisma.$transaction([
    prisma.materialReferencePrice.updateMany({
      where: { collectionId, status: ReferencePriceStatus.DRAFT },
      data: { status: ReferencePriceStatus.REJECTED },
    }),
    prisma.priceCollection.update({
      where: { id: collectionId },
      data: { status: CollectionStatus.REJECTED },
    }),
  ]);
}

export async function rejectSingleReferencePrice(referenceId: string): Promise<void> {
  await prisma.materialReferencePrice.update({
    where: { id: referenceId },
    data: { status: ReferencePriceStatus.REJECTED },
  });
}

/** Override manual del precio propuesto (mantiene trazabilidad de muestra). */
export async function updateReferencePrice(referenceId: string, price: number): Promise<void> {
  if (!(price > 0)) throw new PriceImportError("El precio debe ser positivo", "INVALID_STATE");
  await prisma.materialReferencePrice.update({
    where: { id: referenceId },
    data: { price },
  });
}

/**
 * Excluye una observación (aceptada → rechazada por admin) y recalcula la
 * mediana de su referencia si todavía está en DRAFT.
 */
export async function excludeObservation(observationId: string): Promise<void> {
  const obs = await prisma.priceObservation.findUnique({
    where: { id: observationId },
    select: { collectionId: true, materialId: true, accepted: true },
  });
  if (!obs) throw new PriceImportError("Observación no encontrada", "NOT_FOUND");

  await prisma.priceObservation.update({
    where: { id: observationId },
    data: { accepted: false, rejectionReason: RejectionReason.EXCLUDED_BY_ADMIN },
  });

  const reference = await prisma.materialReferencePrice.findFirst({
    where: { collectionId: obs.collectionId, materialId: obs.materialId },
    select: { id: true, status: true },
  });
  if (!reference || reference.status !== ReferencePriceStatus.DRAFT) return;

  const remaining = await prisma.priceObservation.findMany({
    where: { collectionId: obs.collectionId, materialId: obs.materialId, accepted: true },
    select: { normalizedUnitPrice: true },
  });

  if (remaining.length === 0) {
    await prisma.materialReferencePrice.delete({ where: { id: reference.id } });
    return;
  }
  const prices = remaining.map((r) => Number(r.normalizedUnitPrice)).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const mediana =
    prices.length % 2 === 1
      ? prices[mid]
      : Math.round(((prices[mid - 1]! + prices[mid]!) / 2) * 100) / 100;

  await prisma.materialReferencePrice.update({
    where: { id: reference.id },
    data: { price: mediana, sampleSize: prices.length, insufficientSample: prices.length < 5 },
  });
}

/** Recalcula todas las referencias DRAFT desde las observaciones aceptadas. */
export async function recalculateDraftReferences(collectionId: string): Promise<number> {
  const collection = await prisma.priceCollection.findUnique({
    where: { id: collectionId },
    select: { region: true, collectedAt: true, status: true },
  });
  if (!collection) throw new PriceImportError("Colección no encontrada", "NOT_FOUND");
  if (collection.status === CollectionStatus.PUBLISHED) {
    throw new PriceImportError("La colección ya está publicada", "INVALID_STATE");
  }

  await prisma.materialReferencePrice.deleteMany({
    where: { collectionId, status: ReferencePriceStatus.DRAFT },
  });
  await createReferencePricesTxWrapper(collectionId, collection.region as RegionCode, collection.collectedAt);

  const count = await prisma.materialReferencePrice.count({ where: { collectionId } });
  return count;
}

async function createReferencePricesTxWrapper(collectionId: string, region: RegionCode, validFrom: Date) {
  await prisma.$transaction(async (tx) => {
    await createReferencePrices(tx, collectionId, region, validFrom);
  });
}

// ── Precio vigente e historial (secciones 18/19) ────────────────────────────

export interface PublishedPriceInfo {
  precio: number;
  fuente: string | null;
  fecha: string;
  region: RegionCode;
}

/**
 * Último precio PUBLISHED por material para la región pedida.
 * Regla de consumo de la calculadora: jamás usa un DRAFT.
 */
export async function getPublishedPrices(region: RegionCode): Promise<Map<string, PublishedPriceInfo>> {
  const refs = await prisma.materialReferencePrice.findMany({
    where: { region, status: ReferencePriceStatus.PUBLISHED },
    orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }],
    select: {
      materialId: true,
      price: true,
      validFrom: true,
      source: { select: { name: true } },
      material: { select: { codigo: true } },
    },
  });

  const latest = new Map<string, PublishedPriceInfo>();
  for (const ref of refs) {
    if (latest.has(ref.material.codigo)) continue; // ya quedó el más reciente
    latest.set(ref.material.codigo, {
      precio: Number(ref.price),
      fuente: ref.source?.name ?? null,
      fecha: ref.validFrom.toISOString(),
      region,
    });
  }
  return latest;
}

export interface MaterialPriceHistoryEntry {
  id: string;
  precio: number;
  region: RegionCode;
  status: string;
  sampleSize: number;
  fuente: string | null;
  fechaRelevamiento: string;
  importadoEn: string;
  /** Variación % vs la entrada anterior (cronológica). */
  variacionPct: number | null;
}

/** Historial completo (histórico inmutable) para un material+región. */
export async function getMaterialPriceHistory(
  materialCodigo: string,
  region?: RegionCode,
): Promise<MaterialPriceHistoryEntry[]> {
  const refs = await prisma.materialReferencePrice.findMany({
    where: {
      material: { codigo: materialCodigo },
      ...(region ? { region } : {}),
    },
    orderBy: [{ validFrom: "asc" }, { createdAt: "asc" }],
    include: {
      source: { select: { name: true } },
      collection: { select: { collectedAt: true, importedAt: true } },
    },
  });

  let previous: number | null = null;
  return refs.map((r) => {
    const price = Number(r.price);
    const variacionPct =
      previous !== null && previous > 0
        ? Math.round(((price - previous) / previous) * 10000) / 100
        : null;
    previous = price;
    return {
      id: r.id,
      precio: price,
      region: r.region as RegionCode,
      status: r.status,
      sampleSize: r.sampleSize,
      fuente: r.source?.name ?? null,
      fechaRelevamiento: (r.collection?.collectedAt ?? r.validFrom).toISOString(),
      importadoEn: (r.collection?.importedAt ?? r.createdAt).toISOString(),
      variacionPct,
    };
  });
}
