import {
  type CalculationResult,
  type HouseInput,
  type Material,
  type PriceMap,
  type ProjectSummary,
  type Recipe,
  type UpdateMaterialPriceInput,
  type UpdateRecipeInput,
} from "@casitacalc/shared";
import { DEFAULT_REGION, type RegionCode } from "@casitacalc/shared";
import { ReferencePriceStatus, type ModerationStatus, Prisma, ProjectVisibility } from "@prisma/client";
import { calculateHouse } from "@casitacalc/calculator-core";
import { prisma } from "./client";
import { getPublishedPrices, type PublishedPriceInfo } from "./pricing";
import { materialToDomain, projectToHouseInput, recipeToDomain, resultToDomain } from "./mappers";

// ── Proyectos ───────────────────────────────────────────────────────────────

export async function createProject(
  input: HouseInput,
  ownerTokenHash: string,
): Promise<string> {
  const { aberturas, ...datos } = input;
  const project = await prisma.project.create({
    data: {
      ...datos,
      ownerTokenHash,
      openings: {
        create: aberturas.map((a) => ({
          tipo: a.tipo,
          cantidad: a.cantidad,
        })),
      },
    },
    select: { id: true },
  });
  return project.id;
}

export async function getProjectHouseInput(id: string): Promise<HouseInput | null> {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { openings: true },
  });
  return project ? projectToHouseInput(project) : null;
}

export async function updateProject(
  id: string,
  input: HouseInput,
): Promise<void> {
  const { aberturas, ...datos } = input;
  await prisma.$transaction([
    prisma.opening.deleteMany({ where: { projectId: id } }),
    prisma.project.update({
      where: { id },
      data: {
        ...datos,
        openings: {
          create: aberturas.map((a) => ({
            tipo: a.tipo,
            cantidad: a.cantidad,
          })),
        },
      },
    }),
  ]);
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } });
}

type ProjectConResumen = {
  id: string;
  nombreProyecto: string;
  anchoM: Prisma.Decimal;
  largoM: Prisma.Decimal;
  sistemaConstructivo: string;
  createdAt: Date;
  visibility: ProjectVisibility;
  moderationStatus: ModerationStatus;
  results: { totalGeneral: Prisma.Decimal }[];
};

function toSummary(p: ProjectConResumen): ProjectSummary {
  return {
    id: p.id,
    nombreProyecto: p.nombreProyecto,
    superficieM2: Number(p.anchoM) * Number(p.largoM),
    sistemaConstructivo: p.sistemaConstructivo,
    fechaCreacion: p.createdAt.toISOString(),
    costoEstimado:
      p.results[0] !== undefined ? Number(p.results[0].totalGeneral) : null,
    visibility: p.visibility,
    moderationStatus: p.moderationStatus,
  };
}

const RESULTADO_RECIENTE = {
  results: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { totalGeneral: true },
  },
} as const;

/** Resúmenes de los proyectos del visitante (por hash de su cookie). */
export async function listProjectSummaries(
  ownerTokenHash: string,
  limit?: number,
): Promise<ProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: { ownerTokenHash },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: RESULTADO_RECIENTE,
  });
  return projects.map(toSummary);
}

export async function countProjectsByOwner(ownerTokenHash: string): Promise<number> {
  return prisma.project.count({ where: { ownerTokenHash } });
}

// ── Compartir y moderación ──────────────────────────────────────────────────

/** Activa el link de compartido: UNLISTED + shareToken. */
export async function enableShare(id: string, shareToken: string): Promise<void> {
  await prisma.project.update({
    where: { id },
    data: { visibility: "UNLISTED", shareToken },
  });
}

/** Dejar de compartir: vuelve a PRIVATE e invalida el token anterior. */
export async function disableShare(id: string): Promise<void> {
  await prisma.project.update({
    where: { id },
    data: { visibility: "PRIVATE", shareToken: null },
  });
}

/**
 * Solicita publicación pública: pasa a PENDING.
 * Devuelve el proyecto actualizado o null si ya está PENDING/APPROVED.
 */
export async function requestPublication(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { moderationStatus: true },
  });
  if (!project) return "NOT_FOUND" as const;
  if (project.moderationStatus === "PENDING" || project.moderationStatus === "APPROVED") {
    return null;
  }
  return prisma.project.update({
    where: { id },
    data: { moderationStatus: "PENDING" },
  });
}

export type AdminProjectFilter =
  | "all"
  | "private"
  | "shared"
  | "pending"
  | "public"
  | "rejected";

const WHERE_POR_FILTRO: Record<
  AdminProjectFilter,
  Partial<{ visibility: ProjectVisibility; moderationStatus: ModerationStatus }>
> = {
  all: {},
  private: { visibility: "PRIVATE" },
  shared: { visibility: "UNLISTED" },
  pending: { moderationStatus: "PENDING" },
  public: { visibility: "PUBLIC" },
  rejected: { moderationStatus: "REJECTED" },
};

/** Tabla de administración con filtro opcional. */
export async function listProjectsForAdmin(
  filter: AdminProjectFilter = "all",
  limit?: number,
): Promise<ProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: WHERE_POR_FILTRO[filter],
    orderBy: { createdAt: "desc" },
    take: limit,
    include: RESULTADO_RECIENTE,
  });
  return projects.map(toSummary);
}

/**
 * Cambia el estado de moderación desde admin.
 * Aprobar fuerza PUBLIC; rechazar vuelve a PRIVATE.
 */
export async function setModeration(
  id: string,
  moderationStatus: ModerationStatus,
): Promise<void> {
  const data: {
    moderationStatus: ModerationStatus;
    visibility?: ProjectVisibility;
  } = { moderationStatus };
  if (moderationStatus === "APPROVED") data.visibility = "PUBLIC";
  if (moderationStatus === "REJECTED") data.visibility = "PRIVATE";
  await prisma.project.update({ where: { id }, data });
}

/** Override manual de visibilidad desde admin. */
export async function setVisibility(
  id: string,
  visibility: ProjectVisibility,
): Promise<void> {
  await prisma.project.update({ where: { id }, data: { visibility } });
}

// ── Acceso público ──────────────────────────────────────────────────────────

/** Proyecto por shareToken; solo si sigue en UNLISTED. */
export async function getProjectByShareToken(token: string) {
  return prisma.project.findFirst({
    where: { shareToken: token, visibility: "UNLISTED" },
    include: { openings: { orderBy: { id: "asc" } } },
  });
}

/** Galería pública: solo PUBLIC + APPROVED. */
export async function listApprovedPublicProjects(limit?: number) {
  const projects = await prisma.project.findMany({
    where: { visibility: "PUBLIC", moderationStatus: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: RESULTADO_RECIENTE,
  });
  return projects.map((p) => {
    const s = toSummary(p);
    return {
      id: s.id,
      nombreProyecto: s.nombreProyecto,
      superficieM2: s.superficieM2,
      sistemaConstructivo: s.sistemaConstructivo,
      fechaCreacion: s.fechaCreacion,
      costoEstimado: s.costoEstimado,
    };
  });
}

/** Detalle público por id; solo PUBLIC + APPROVED. */
export async function getApprovedPublicProject(id: string) {
  return prisma.project.findFirst({
    where: { id, visibility: "PUBLIC", moderationStatus: "APPROVED" },
    include: { openings: { orderBy: { id: "asc" } } },
  });
}

/** Proyecto completo (datos + aberturas) para pantalla de detalle. */
export async function getProjectFull(id: string) {
  const row = await prisma.project.findUnique({
    where: { id },
    include: { openings: { orderBy: { id: "asc" } } },
  });
  return row;
}

// ── Materiales y precios ────────────────────────────────────────────────────

export async function listMaterials(): Promise<Material[]> {
  const rows = await prisma.material.findMany({ orderBy: [{ categoria: "asc" }, { nombre: "asc" }] });
  return rows.map(materialToDomain);
}

/** Mapa codigo → precioActual para el motor. */
export async function getPriceMap(): Promise<PriceMap> {
  const rows = await prisma.material.findMany({
    select: { codigo: true, precioActual: true },
  });
  return Object.fromEntries(rows.map((r) => [r.codigo, Number(r.precioActual)]));
}

export interface EffectivePriceInfo extends PublishedPriceInfo {
  /** true si viene de un relevamiento PUBLISHED (no del precio base). */
  fromReferencePrice: boolean;
}

/**
 * Precio efectivo por material para una región: el último
 * MaterialReferencePrice PUBLISHED pisa al precio base del catálogo.
 * Nunca usa DRAFT (regla de consumo, sección precios).
 */
export async function getEffectivePrices(
  region: RegionCode = DEFAULT_REGION,
): Promise<Record<string, EffectivePriceInfo>> {
  const [materials, published] = await Promise.all([
    prisma.material.findMany({
      select: {
        codigo: true,
        precioActual: true,
        fuente: true,
        fechaActualizacionPrecio: true,
      },
    }),
    getPublishedPrices(region),
  ]);

  const effective: Record<string, EffectivePriceInfo> = {};
  for (const m of materials) {
    effective[m.codigo] = {
      precio: Number(m.precioActual),
      fuente: m.fuente,
      fecha: m.fechaActualizacionPrecio?.toISOString() ?? new Date(0).toISOString(),
      region,
      fromReferencePrice: false,
    };
  }
  for (const [codigo, info] of published) {
    effective[codigo] = { ...info, fromReferencePrice: true };
  }
  return effective;
}

export async function updateMaterialPrice(
  id: string,
  input: UpdateMaterialPriceInput,
): Promise<Material | null> {
  const updated = await prisma.material.update({
    where: { id },
    data: {
      precioActual: input.precio,
      fechaActualizacionPrecio: new Date(),
      fuente: "Manual",
    },
  });
  return materialToDomain(updated);
}

/**
 * Fecha del último cambio efectivo de precios: el validFrom más reciente entre
 * los relevamientos PUBLISHED de la región y la última edición manual del
 * catálogo. La usan las vistas de resultados para avisar que un cálculo quedó
 * desactualizado; null si nunca hubo precios.
 */
export async function getPreciosActualizadoEn(
  region: RegionCode = DEFAULT_REGION,
): Promise<Date | null> {
  const [publicado, manual] = await Promise.all([
    prisma.materialReferencePrice.aggregate({
      where: { region, status: ReferencePriceStatus.PUBLISHED },
      _max: { validFrom: true },
    }),
    prisma.material.aggregate({ _max: { fechaActualizacionPrecio: true } }),
  ]);
  const candidatos = [publicado._max.validFrom, manual._max.fechaActualizacionPrecio].filter(
    (d): d is Date => d !== null,
  );
  if (candidatos.length === 0) return null;
  return new Date(Math.max(...candidatos.map((d) => d.getTime())));
}

// ── Recetas ────────────────────────────────────────────────────────────────

export async function listRecipes(): Promise<Recipe[]> {
  const rows = await prisma.recipe.findMany({ include: { items: true } });
  return rows.map(recipeToDomain);
}

export async function updateRecipeItems(
  codigo: string,
  input: UpdateRecipeInput,
): Promise<void> {
  const recipe = await prisma.recipe.findUnique({ where: { codigo }, select: { id: true } });
  if (!recipe) throw new Error(`Receta "${codigo}" no encontrada`);
  await prisma.$transaction([
    prisma.recipeItem.deleteMany({ where: { recipeId: recipe.id } }),
    prisma.recipeItem.createMany({
      data: input.items.map((i) => ({
        recipeId: recipe.id,
        codigoMaterial: i.codigoMaterial,
        cantidadPorUnidad: i.cantidadPorUnidad,
        desperdicioPct: i.desperdicioPct,
      })),
    }),
  ]);
}

// ── Cálculo ────────────────────────────────────────────────────────────────

/**
 * Calcula un proyecto con recetas y precios de la DB y persiste el resultado.
 * Usa el último precio PUBLISHED del relevamiento para la región (si existe)
 * y conserva por ítem la fuente/fecha/región del precio aplicado.
 */
export async function calculateAndSaveResult(
  projectId: string,
  region: RegionCode = DEFAULT_REGION,
): Promise<CalculationResult | null> {
  const house = await getProjectHouseInput(projectId);
  if (!house) return null;

  const [recipes, effectivePrices] = await Promise.all([listRecipes(), getEffectivePrices(region)]);
  const prices: PriceMap = Object.fromEntries(
    Object.entries(effectivePrices).map(([codigo, info]) => [codigo, info.precio]),
  );
  const result = calculateHouse(house, { recipes, prices });
  if (result.items.length === 0) throw new Error("Las recetas están vacías; corré el seed");

  await prisma.calculationResult.create({
    data: {
      projectId,
      totalGeneral: result.totalGeneral,
      geometriaJson: result.geometria,
      items: {
        create: result.items.map((i) => {
          const meta = effectivePrices[i.codigoMaterial];
          const fechaMeta = meta?.fecha;
          const tieneFechaReal =
            fechaMeta !== undefined && fechaMeta !== new Date(0).toISOString();
          return {
            codigoMaterial: i.codigoMaterial,
            nombreMaterial: i.nombreMaterial,
            rubro: i.rubro,
            recetaCodigo: i.recetaCodigo ?? null,
            cantidad: i.cantidad,
            unidad: i.unidad,
            desperdicioPct: i.desperdicioPct,
            cantidadFinal: i.cantidadFinal,
            precioUnitario: i.precioUnitario ?? null,
            subtotal: i.subtotal ?? null,
            fuentePrecio: meta?.fuente ?? null,
            fechaPrecio: tieneFechaReal ? new Date(fechaMeta!) : null,
            regionPrecio: meta && meta.fromReferencePrice ? meta.region : null,
          };
        }),
      },
    },
  });

  return result;
}

export async function getLatestResult(projectId: string) {
  const row = await prisma.calculationResult.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  if (!row) return null;

  const domain = resultToDomain(row);

  // Los subtotales por rubro son derivados: se reconstruyen desde los ítems.
  const subtotalesPorRubro: Record<string, number> = {};
  for (const item of domain.items) {
    if (item.subtotal !== undefined) {
      const previo = subtotalesPorRubro[item.rubro] ?? 0;
      subtotalesPorRubro[item.rubro] = Math.round((previo + item.subtotal) * 100) / 100;
    }
  }

  return { ...domain, subtotalesPorRubro, fechaCreacion: row.createdAt.toISOString() };
}
