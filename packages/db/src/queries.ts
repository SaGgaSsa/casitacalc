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
import { calculateHouse } from "@casitacalc/calculator-core";
import { prisma } from "./client";
import { materialToDomain, projectToHouseInput, recipeToDomain, resultToDomain } from "./mappers";

// ── Proyectos ───────────────────────────────────────────────────────────────

export async function createProject(input: HouseInput): Promise<string> {
  const { aberturas, ...datos } = input;
  const project = await prisma.project.create({
    data: {
      ...datos,
      openings: {
        create: aberturas.map((a) => ({
          tipo: a.tipo,
          anchoM: a.anchoM,
          altoM: a.altoM,
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
            anchoM: a.anchoM,
            altoM: a.altoM,
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

export async function listProjectSummaries(limit?: number): Promise<ProjectSummary[]> {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      results: { orderBy: { createdAt: "desc" }, take: 1, select: { totalGeneral: true } },
    },
  });

  return projects.map((p) => ({
    id: p.id,
    nombreProyecto: p.nombreProyecto,
    superficieM2: Number(p.anchoM) * Number(p.largoM),
    sistemaConstructivo: p.sistemaConstructivo,
    fechaCreacion: p.createdAt.toISOString(),
    costoEstimado:
      p.results[0] !== undefined ? Number(p.results[0].totalGeneral) : null,
  }));
}

export async function countProjects(): Promise<number> {
  return prisma.project.count();
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

/** Proyecto completo (datos + aberturas) para pantalla de detalle. */
export async function getProjectFull(id: string) {
  const row = await prisma.project.findUnique({
    where: { id },
    include: { openings: { orderBy: { id: "asc" } } },
  });
  return row;
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
 * Devuelve el cómputo completo.
 */
export async function calculateAndSaveResult(projectId: string): Promise<CalculationResult | null> {
  const house = await getProjectHouseInput(projectId);
  if (!house) return null;

  const [recipes, prices] = await Promise.all([listRecipes(), getPriceMap()]);
  const result = calculateHouse(house, { recipes, prices });
  if (result.items.length === 0) throw new Error("Las recetas están vacías; corré el seed");

  await prisma.calculationResult.create({
    data: {
      projectId,
      totalGeneral: result.totalGeneral,
      geometriaJson: result.geometria,
      items: {
        create: result.items.map((i) => ({
          codigoMaterial: i.codigoMaterial,
          nombreMaterial: i.nombreMaterial,
          rubro: i.rubro,
          cantidad: i.cantidad,
          unidad: i.unidad,
          desperdicioPct: i.desperdicioPct,
          cantidadFinal: i.cantidadFinal,
          precioUnitario: i.precioUnitario ?? null,
          subtotal: i.subtotal ?? null,
        })),
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
  return row ? resultToDomain(row) : null;
}
