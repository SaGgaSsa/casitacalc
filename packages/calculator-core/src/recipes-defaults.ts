import {
  ConstructionSystem,
  MATERIAL_CATALOG,
  RoofType,
  Rubro,
  Unit,
  type Recipe,
} from "@casitacalc/shared";

/** Info mínima del catálogo que necesita el motor para calcular y etiquetar. */
export interface MaterialCatalogEntry {
  nombre: string;
  unidad: Unit;
}

/** Catálogo indexado por código estable de material. */
export type MaterialCatalog = Record<string, MaterialCatalogEntry>;

/**
 * Catálogo derivado del archivo maestro `packages/shared/src/materials.json`
 * (fuente única compartida con el seed y el relevamiento de precios).
 */
export const DEFAULT_MATERIAL_CATALOG: MaterialCatalog = Object.fromEntries(
  MATERIAL_CATALOG.map((m) => [m.codigo, { nombre: m.nombre, unidad: m.unidad }]),
);

const D = { NINGUNO: 0, BAJO: 5, MEDIO: 10 };

/**
 * Recetas por defecto (valores referenciales editables).
 * En producción se cargan desde la DB (`Recipe` + `RecipeItem`) y estas
 * quedan como fallback para tests y demo.
 */
export const DEFAULT_RECIPES: Recipe[] = [
  {
    codigo: "MURO_LADRILLO_HUECO",
    rubro: Rubro.MAMPOSTERIA,
    sistemaConstructivo: ConstructionSystem.LADRILLO_HUECO,
    items: [
      { codigoMaterial: "LADRILLO_HUECO_12X18X33", cantidadPorUnidad: 16, desperdicioPct: D.MEDIO },
      { codigoMaterial: "CEMENTO_PORTLAND_25KG", cantidadPorUnidad: 0.24, desperdicioPct: D.BAJO },
      { codigoMaterial: "CAL_HIDRATADA_25KG", cantidadPorUnidad: 0.1, desperdicioPct: D.BAJO },
      { codigoMaterial: "ARENA_GRUESA", cantidadPorUnidad: 0.022, desperdicioPct: D.MEDIO },
    ],
  },
  {
    codigo: "TECHO_CHAPA",
    rubro: Rubro.TECHO,
    tipoTecho: RoofType.CHAPA,
    items: [
      { codigoMaterial: "CHAPA_TRAPEZOIDAL_C25", cantidadPorUnidad: 1.05, desperdicioPct: D.BAJO },
      { codigoMaterial: "TIRANTE_MADERA_2X3", cantidadPorUnidad: 2, desperdicioPct: D.MEDIO },
      { codigoMaterial: "TORNILLO_AUTOPERFORANTE", cantidadPorUnidad: 8, desperdicioPct: D.BAJO },
      { codigoMaterial: "FILM_BARRERA_HIDRICA", cantidadPorUnidad: 1.05, desperdicioPct: D.MEDIO },
    ],
  },
  {
    codigo: "TECHO_LOSA",
    rubro: Rubro.TECHO,
    tipoTecho: RoofType.LOSA,
    items: [
      { codigoMaterial: "ACERO_LOSA_ADL15", cantidadPorUnidad: 10, desperdicioPct: D.BAJO },
      { codigoMaterial: "CEMENTO_PORTLAND_25KG", cantidadPorUnidad: 2, desperdicioPct: D.BAJO },
      { codigoMaterial: "ARENA_FINA", cantidadPorUnidad: 0.055, desperdicioPct: D.MEDIO },
      { codigoMaterial: "PIEDRA_BOLA", cantidadPorUnidad: 0.085, desperdicioPct: D.MEDIO },
    ],
  },
  {
    codigo: "BANO_PAQUETE",
    rubro: Rubro.BANOS,
    items: [
      { codigoMaterial: "INODORO_COMPLETO", cantidadPorUnidad: 1, desperdicioPct: D.NINGUNO },
      { codigoMaterial: "LAVATORIO_PEDESTAL", cantidadPorUnidad: 1, desperdicioPct: D.NINGUNO },
      { codigoMaterial: "GRIFERIA_LAVATORIO", cantidadPorUnidad: 1, desperdicioPct: D.NINGUNO },
      { codigoMaterial: "DUCHA_JUEGO", cantidadPorUnidad: 1, desperdicioPct: D.NINGUNO },
      { codigoMaterial: "CANO_PVC_100_4M", cantidadPorUnidad: 2, desperdicioPct: D.NINGUNO },
      { codigoMaterial: "CANO_PVC_40_4M", cantidadPorUnidad: 2, desperdicioPct: D.BAJO },
      { codigoMaterial: "DESAGUE_PISO", cantidadPorUnidad: 1, desperdicioPct: D.NINGUNO },
      { codigoMaterial: "SIFON_LAVATORIO", cantidadPorUnidad: 1, desperdicioPct: D.NINGUNO },
      { codigoMaterial: "CERAMICA_PISO", cantidadPorUnidad: 6, desperdicioPct: D.MEDIO },
      { codigoMaterial: "CERAMICA_PARED", cantidadPorUnidad: 14, desperdicioPct: D.MEDIO },
      { codigoMaterial: "PEGAMENTO_CERAMICO_30KG", cantidadPorUnidad: 4, desperdicioPct: D.BAJO },
      { codigoMaterial: "PASTINA", cantidadPorUnidad: 3, desperdicioPct: D.BAJO },
    ],
  },
];
