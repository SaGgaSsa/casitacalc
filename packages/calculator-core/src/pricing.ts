import {
  CurrencyEnum,
  EXCEEDS_INFLATION,
  INSUFFICIENT_SAMPLE_SIZE,
  MIN_REFERENCE_SAMPLES,
  MONTHLY_INFLATION_RATE,
  PackageUnit,
  PackageUnitEnum,
  PACKAGE_UNIT_TO_MATERIAL_UNIT,
  RegionCode,
  RejectionReason,
  RowStatus,
  Unit,
  expectedBagFromMaterialCode,
  type NormalizedPriceObservationInput,
} from "@casitacalc/shared";

// ── Formato CSV normalizado ──────────────────────────────────────────────────

/** Columnas oficiales del CSV de CasitaCalc, en orden. */
export const PRICE_CSV_COLUMNS = [
  "source",
  "region",
  "collected_at",
  "material_code",
  "external_id",
  "title",
  "url",
  "currency",
  "raw_price",
  "package_quantity",
  "package_unit",
  "brand",
  "seller",
  "accepted",
  "rejection_reason",
] as const;

export type PriceCsvColumn = (typeof PRICE_CSV_COLUMNS)[number];

/** Columnas obligatorias del CSV. */
export const PRICE_CSV_REQUIRED_COLUMNS: PriceCsvColumn[] = [
  "source",
  "region",
  "collected_at",
  "material_code",
  "title",
  "url",
  "currency",
  "raw_price",
  "package_quantity",
  "package_unit",
];

/** Límite defensivo de tamaño para un CSV (2 MB). */
export const MAX_CSV_BYTES = 2 * 1024 * 1024;

// ── Parser RFC 4180 mínimo (sin dependencias) ───────────────────────────────

export interface ParsedCsvRow {
  /** Número de línea real en el archivo (1-indexado), para reportar errores. */
  line: number;
  data: Record<string, string>;
}

export interface ParsedCsv {
  headers: string[];
  rows: ParsedCsvRow[];
  errors: { line: number; message: string }[];
}

/**
 * Parser CSV con soporte de comillas, comas y saltos embebidos (RFC 4180).
 * No interpreta tipos: devuelve strings crudos por columna.
 */
export function parseCsvText(text: string): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let started = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && !started) {
      inQuotes = true;
      started = true;
      continue;
    }
    if (char === ",") {
      record.push(field);
      field = "";
      started = false;
      continue;
    }
    if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      started = false;
      continue;
    }
    field += char;
    started = true;
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  // Descarta registros totalmente vacíos (líneas en blanco finales).
  const meaningful = records.filter((r) => r.some((cell) => cell.trim() !== ""));

  const errors: ParsedCsv["errors"] = [];
  const rows: ParsedCsvRow[] = [];

  const headerCells = meaningful[0] ?? [];
  const headers = headerCells.map((h) => h.trim());

  for (let idx = 1; idx < meaningful.length; idx++) {
    const cells = meaningful[idx] ?? [];
    const line = idx + 1;
    if (cells.length !== headers.length) {
      errors.push({
        line,
        message: `Cantidad de columnas (${cells.length}) no coincide con el encabezado (${headers.length})`,
      });
      continue;
    }
    const data: Record<string, string> = {};
    headers.forEach((h, i) => {
      data[h] = (cells[i] ?? "").trim();
    });
    rows.push({ line, data });
  }

  return { headers, rows, errors };
}

// ── Clave anti-duplicados ────────────────────────────────────────────────────

/**
 * Identidad estable de una observación:
 * - con externalId: source + externalId + collectedAt
 * - sin externalId: source + materialCode + url + collectedAt
 */
export function observationDedupeKey(input: {
  source: string;
  externalId?: string | null;
  materialCode: string;
  url: string;
  collectedAt: Date;
}): string {
  const day = input.collectedAt.toISOString();
  return input.externalId
    ? `${input.source}|${input.externalId}|${day}`
    : `${input.source}|${input.materialCode}|${input.url}|${day}`;
}

/**
 * Hash determinista (FNV-1a 64 bits en hex) de la clave anti-duplicados.
 * No es criptográfico: solo necesita identificar observaciones iguales.
 */
export function hashDedupeKey(key: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < key.length; i++) {
    h ^= BigInt(key.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, "0");
}

// ── Validación y normalización ───────────────────────────────────────────────

export interface PriceRowContext {
  /** Códigos de fuente habilitadas en DB (ej. ["EASY","MERCADOLIBRE"]). */
  enabledSources: string[];
  /** Catálogo interno: código → unidad del material. */
  materialsByCode: Record<string, { unidad: Unit }>;
  /** Claves (hashDedupeKey) ya presentes en el historial. */
  existingDedupeHashes?: Set<string>;
}

export interface ValidatedPriceRow {
  line: number;
  status: RowStatus;
  /** DTO normalizado solo si la fila es utilizable. */
  dto: NormalizedPriceObservationInput | null;
  /** Precio calculado server-side (siempre, aunque la fila venga rechazada). */
  normalizedUnitPrice?: number;
  normalizedUnit?: Unit;
  reason?: RejectionReason | null;
  /** Explicación humana en español para el preview. */
  message?: string;
}

const NUMBER_RE = /^\d+(\.\d{1,4})?$/;

function parseMoney(value: string): number | null {
  const clean = value.replace(/\s/g, "");
  if (!NUMBER_RE.test(clean)) return null;
  return Number(clean);
}

function parseDateCell(value: string): Date | null {
  const clean = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(clean) ? `${clean}T00:00:00.000Z` : clean;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseBoolCell(value: string): boolean | null {
  const clean = value.trim().toLowerCase();
  if (clean === "true" || clean === "1" || clean === "si" || clean === "sí") return true;
  if (clean === "false" || clean === "0" || clean === "no") return false;
  return null;
}

function invalid(line: number, reason: RejectionReason, message: string, dto: NormalizedPriceObservationInput | null = null, normalizedUnitPrice?: number): ValidatedPriceRow {
  return { line, status: RowStatus.INVALID, dto, reason, message, normalizedUnitPrice };
}

/**
 * Valida una fila cruda del CSV contra el contexto (fuentes, materiales,
 * historial) y produce el DTO interno. Los errores de una fila no afectan
 * a las demás.
 */
export function validatePriceCsvRow(
  row: ParsedCsvRow,
  ctx: PriceRowContext,
  seenKeysInFile: Set<string>,
): ValidatedPriceRow {
  const { line, data } = row;
  const get = (col: PriceCsvColumn) => data[col]?.trim() ?? "";

  // 1) Campos obligatorios presentes.
  for (const col of PRICE_CSV_REQUIRED_COLUMNS) {
    if (get(col) === "") {
      return invalid(line, RejectionReason.MISSING_REQUIRED_FIELD, `Falta el campo obligatorio "${col}"`);
    }
  }

  // 2) Fuente conocida y habilitada.
  const source = get("source").toUpperCase();
  if (!ctx.enabledSources.includes(source)) {
    return invalid(line, RejectionReason.UNKNOWN_SOURCE, `"${source}" no es una fuente registrada y habilitada`);
  }

  // 3) Región conocida.
  const region = get("region").toUpperCase();
  if (!(Object.values(RegionCode) as string[]).includes(region)) {
    return invalid(line, RejectionReason.UNKNOWN_REGION, `"${region}" no es una región válida`);
  }

  // 4) Material existente.
  const materialCode = get("material_code").toUpperCase();
  const material = ctx.materialsByCode[materialCode];
  if (!material) {
    return invalid(line, RejectionReason.UNKNOWN_MATERIAL_CODE, `"${materialCode}" no existe en el catálogo`);
  }

  // 5) Moneda soportada.
  const currency = get("currency").toUpperCase();
  if (!CurrencyEnum.safeParse(currency).success) {
    return invalid(line, RejectionReason.UNKNOWN_CURRENCY, `"${currency}" no es una moneda soportada`);
  }

  // 6) Precio positivo.
  const rawPrice = parseMoney(get("raw_price"));
  if (rawPrice === null || rawPrice <= 0) {
    return invalid(line, RejectionReason.NEGATIVE_PRICE, `"${get("raw_price")}" no es un precio válido (mayor a 0)`);
  }

  // 7) Cantidad de paquete positiva.
  const packageQuantityRaw = get("package_quantity");
  const packageQuantity = parseMoney(packageQuantityRaw);
  if (packageQuantity === null || packageQuantity <= 0) {
    return invalid(line, RejectionReason.INVALID_PACKAGE_QUANTITY, `"${packageQuantityRaw}" no es una cantidad válida`);
  }

  // 8) Unidad de paquete conocida y compatible con el material.
  const packageUnit = get("package_unit").toUpperCase();
  const parsedUnit = PackageUnitEnum.safeParse(packageUnit);
  if (!parsedUnit.success) {
    return invalid(line, RejectionReason.UNKNOWN_PACKAGE_QUANTITY, `"${packageUnit}" no es una unidad de paquete reconocida`);
  }
  if (parsedUnit.data === PackageUnit.UNIT && !Number.isInteger(packageQuantity)) {
    return invalid(line, RejectionReason.INVALID_PACKAGE_QUANTITY, "La cantidad debe ser entera para UNIT");
  }
  const expectedBag = expectedBagFromMaterialCode(materialCode);
  if (
    expectedBag &&
    (parsedUnit.data === PackageUnit.BAG_25KG ||
      parsedUnit.data === PackageUnit.BAG_40KG ||
      parsedUnit.data === PackageUnit.BAG_50KG) &&
    parsedUnit.data !== expectedBag
  ) {
    return invalid(
      line,
      RejectionReason.INCOMPATIBLE_UNIT,
      `El material ${materialCode} espera ${expectedBag}, recibió ${packageUnit}`,
    );
  }
  const normalizedUnit = PACKAGE_UNIT_TO_MATERIAL_UNIT[parsedUnit.data];
  if (normalizedUnit !== material.unidad) {
    return invalid(
      line,
      RejectionReason.INCOMPATIBLE_UNIT,
      `La unidad ${packageUnit} (${normalizedUnit}) no corresponde al material ${materialCode} (${material.unidad})`,
    );
  }

  // 9) Fecha de relevamiento válida y no futura (tolerancia de 1 día).
  const collectedAt = parseDateCell(get("collected_at"));
  if (!collectedAt) {
    return invalid(line, RejectionReason.INVALID_DATE, `"${get("collected_at")}" no es una fecha válida`);
  }
  if (collectedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return invalid(line, RejectionReason.INVALID_DATE, "La fecha de relevamiento no puede ser futura");
  }

  // 10) Marca de aceptación del proveedor.
  let accepted = true;
  if (get("accepted") !== "") {
    const parsedBool = parseBoolCell(get("accepted"));
    if (parsedBool === null) {
      return invalid(line, RejectionReason.MISSING_REQUIRED_FIELD, 'El campo "accepted" debe ser true o false');
    }
    accepted = parsedBool;
  }
  const reasonCell = get("rejection_reason");

  // Construye el DTO y valida el contrato completo (incluye URL).
  const dtoCandidate: NormalizedPriceObservationInput = {
    source,
    region: region as RegionCode,
    collectedAt,
    materialCode,
    externalId: get("external_id") || null,
    title: get("title"),
    url: get("url"),
    currency,
    rawPrice,
    packageQuantity,
    packageUnit: parsedUnit.data,
    brand: get("brand") || null,
    seller: get("seller") || null,
    accepted,
    rejectionReason: reasonCell || null,
  };

  const urlOk = /^https?:\/\/\S+$/.test(get("url"));
  if (!urlOk) {
    return invalid(line, RejectionReason.MISSING_REQUIRED_FIELD, `"${get("url")}" no es una URL http(s) válida`);
  }

  // 11) Precio normalizado: SIEMPRE lo calcula CasitaCalc, nunca el proveedor.
  const normalizedUnitPrice = round2(rawPrice / packageQuantity);

  // 12) Duplicados dentro del archivo y contra el historial.
  const key = observationDedupeKey({
    source,
    externalId: dtoCandidate.externalId,
    materialCode,
    url: dtoCandidate.url,
    collectedAt,
  });
  const hash = hashDedupeKey(key);
  if (seenKeysInFile.has(hash)) {
    return invalid(line, RejectionReason.DUPLICATE_ROW, "Fila duplicada dentro del archivo", dtoCandidate, normalizedUnitPrice);
  }
  seenKeysInFile.add(hash);
  if (ctx.existingDedupeHashes?.has(hash)) {
    return invalid(line, RejectionReason.DUPLICATE_IN_DB, "Esta observación ya fue importada", dtoCandidate, normalizedUnitPrice);
  }

  if (!accepted) {
    return {
      ...invalid(
        line,
        reasonCell && reasonCell in RejectionReason
          ? (reasonCell as RejectionReason)
          : RejectionReason.MISSING_REQUIRED_FIELD,
        reasonCell || "Marcada como rechazada por el proveedor",
        dtoCandidate,
        normalizedUnitPrice,
      ),
      dto: dtoCandidate,
    };
  }

  return {
    line,
    status: RowStatus.VALID,
    dto: dtoCandidate,
    normalizedUnitPrice,
    normalizedUnit,
  };
}

// ── Mediana y propuestas de precio de referencia ────────────────────────────

/** Mediana estadística (promedio central si cantidad par). */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const midValue = sorted[mid];
  if (midValue === undefined) return null;
  return sorted.length % 2 === 1
    ? midValue
    : round2(((sorted[mid - 1] ?? midValue) + midValue) / 2);
}

export interface ReferencePriceProposal {
  materialCode: string;
  sampleSize: number;
  /** Mediana redondeada a 2 decimales; null si no hay muestras aceptadas. */
  medianPrice: number | null;
  insufficientSample: boolean;
  /** Último precio PUBLISHED del material; null si nunca tuvo. */
  previousPrice: number | null;
  /** Mediana estrictamente superior a anterior × (1 + inflación mensual). */
  exceedsInflation: boolean;
}

export interface ReferenceProposalResult {
  proposals: ReferencePriceProposal[];
  warnings: string[];
}

export interface ReferenceProposalOptions {
  /** Último precio publicado por código de material; ausente = sin historial. */
  previousPrices?: Map<string, number>;
  /** Tasa mensual; default MONTHLY_INFLATION_RATE de shared. */
  monthlyRate?: number;
}

/**
 * Agrupa observaciones aceptadas por material y propone la mediana.
 * Nunca promedio simple. Con menos de MIN_REFERENCE_SAMPLES muestras marca
 * INSUFFICIENT_SAMPLE_SIZE pero igual devuelve la propuesta para revisión.
 * Con precio anterior publicado marca EXCEEDS_INFLATION si la mediana supera
 * anterior × (1 + tasa mensual); sin historial no marca nunca.
 */
export function computeReferenceProposals(
  observations: { materialCode: string; normalizedUnitPrice: number }[],
  options: ReferenceProposalOptions = {},
): ReferenceProposalResult {
  const porMaterial = new Map<string, number[]>();
  for (const obs of observations) {
    const list = porMaterial.get(obs.materialCode) ?? [];
    list.push(obs.normalizedUnitPrice);
    porMaterial.set(obs.materialCode, list);
  }

  const rate = options.monthlyRate ?? MONTHLY_INFLATION_RATE;
  const proposals: ReferencePriceProposal[] = [];
  const warnings: string[] = [];
  for (const [materialCode, prices] of [...porMaterial.entries()].sort()) {
    const sampleSize = prices.length;
    const medianPrice = median(prices);
    const insufficientSample = sampleSize < MIN_REFERENCE_SAMPLES;
    if (insufficientSample) warnings.push(`${INSUFFICIENT_SAMPLE_SIZE}:${materialCode}`);

    const previousPrice = options.previousPrices?.get(materialCode) ?? null;
    const threshold =
      previousPrice !== null ? round2(previousPrice * (1 + rate)) : null;
    const exceedsInflation = medianPrice !== null && threshold !== null && medianPrice > threshold;
    if (exceedsInflation) warnings.push(`${EXCEEDS_INFLATION}:${materialCode}`);

    proposals.push({
      materialCode,
      sampleSize,
      medianPrice,
      insufficientSample,
      previousPrice,
      exceedsInflation,
    });
  }
  return { proposals, warnings };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
