import type {
  CalculationResult as CalculationResultRow,
  CalculationResultItem,
  Opening,
  Project,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  ConstructionSystem,
  RoofType,
  Unit,
  type CalculationResult,
  type HouseInput,
  type Material,
  type Opening as OpeningDomain,
  type Recipe,
} from "@casitacalc/shared";

export function toNum(d: Prisma.Decimal | number): number {
  return Number(d);
}

/** Fila Project (+openings) → input de dominio para el motor. */
export function projectToHouseInput(
  project: Project & { openings: Opening[] },
): HouseInput {
  return {
    nombreProyecto: project.nombreProyecto,
    anchoM: toNum(project.anchoM),
    largoM: toNum(project.largoM),
    alturaParedesM: toNum(project.alturaParedesM),
    sistemaConstructivo: project.sistemaConstructivo as ConstructionSystem,
    tipoTecho: project.tipoTecho as RoofType,
    anguloTechoGrados: toNum(project.anguloTechoGrados),
    cantidadBanios: project.cantidadBanios,
    aberturas: project.openings.map(openingToDomain),
  };
}

export function openingToDomain(o: Opening): OpeningDomain {
  return {
    tipo: o.tipo as OpeningDomain["tipo"],
    anchoM: toNum(o.anchoM),
    altoM: toNum(o.altoM),
    cantidad: o.cantidad,
  };
}

type MaterialRow = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  precioDefault: Prisma.Decimal;
  precioActual: Prisma.Decimal;
  fechaActualizacionPrecio: Date | null;
  fuente: string | null;
};

export function materialToDomain(m: MaterialRow): Material {
  return {
    id: m.id,
    codigo: m.codigo,
    nombre: m.nombre,
    categoria: m.categoria,
    unidad: m.unidad as Material["unidad"],
    precioDefault: toNum(m.precioDefault),
    precioActual: toNum(m.precioActual),
    fechaActualizacionPrecio: m.fechaActualizacionPrecio?.toISOString(),
    fuente: m.fuente ?? undefined,
  };
}

type RecipeRow = {
  codigo: string;
  rubro: string;
  sistemaConstructivo: string | null;
  tipoTecho: string | null;
  tipoAbertura: string | null;
  items: {
    codigoMaterial: string;
    cantidadPorUnidad: Prisma.Decimal;
    desperdicioPct: Prisma.Decimal;
  }[];
};

export function recipeToDomain(r: RecipeRow): Recipe {
  return {
    codigo: r.codigo,
    rubro: r.rubro as Recipe["rubro"],
    sistemaConstructivo:
      (r.sistemaConstructivo as Recipe["sistemaConstructivo"]) ?? undefined,
    tipoTecho: (r.tipoTecho as Recipe["tipoTecho"]) ?? undefined,
    tipoAbertura: (r.tipoAbertura as Recipe["tipoAbertura"]) ?? undefined,
    items: r.items.map((i) => ({
      codigoMaterial: i.codigoMaterial,
      cantidadPorUnidad: toNum(i.cantidadPorUnidad),
      desperdicioPct: toNum(i.desperdicioPct),
    })),
  };
}

type ResultRow = CalculationResultRow & { items: CalculationResultItem[] };

/** Resultado guardado en DB → tipo de dominio CalculationResult. */
export function resultToDomain(r: ResultRow): CalculationResult {
  const items = r.items.map(
    (i): import("@casitacalc/shared").CalculationResultItem => ({
      codigoMaterial: i.codigoMaterial,
      nombreMaterial: i.nombreMaterial,
      rubro: i.rubro,
      recetaCodigo: i.recetaCodigo ?? undefined,
      cantidad: toNum(i.cantidad),
      unidad: i.unidad as Unit,
      desperdicioPct: toNum(i.desperdicioPct),
      cantidadFinal: toNum(i.cantidadFinal),
      precioUnitario: i.precioUnitario === null ? undefined : toNum(i.precioUnitario),
      subtotal: i.subtotal === null ? undefined : toNum(i.subtotal),
      fuentePrecio: i.fuentePrecio ?? undefined,
      fechaPrecio: i.fechaPrecio?.toISOString(),
      regionPrecio: i.regionPrecio ?? undefined,
    }),
  );

  return {
    items,
    subtotalesPorRubro: {} as CalculationResult["subtotalesPorRubro"],
    totalGeneral: toNum(r.totalGeneral),
    geometria: r.geometriaJson as CalculationResult["geometria"],
  };
}
