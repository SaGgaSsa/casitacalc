import {
  ConstructionSystem,
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
 * Catálogo por defecto (referencia). En la app real viene de la tabla
 * `Material` de la base de datos vía el paquete `db`.
 */
export const DEFAULT_MATERIAL_CATALOG: MaterialCatalog = {
  LADRILLO_HUECO_18X18X33: { nombre: "Ladrillo hueco 18x18x33", unidad: Unit.UN },
  CEMENTO_PORTLAND_50KG: { nombre: "Cemento Portland 50 kg", unidad: Unit.BOLSA },
  CAL_HIDRATADA_25KG: { nombre: "Cal hidratada 25 kg", unidad: Unit.BOLSA },
  ARENA_GRUESA: { nombre: "Arena gruesa de construcción", unidad: Unit.M3 },
  ARENA_FINA: { nombre: "Arena fina", unidad: Unit.M3 },
  PIEDRA_BOLA: { nombre: "Piedra bola 20/40", unidad: Unit.M3 },
  ACERO_LOSA_ADL15: { nombre: "Acero para losa (malla + hierros)", unidad: Unit.KG },
  CHAPA_TRAPEZOIDAL_C25: { nombre: "Chapa trapezoidal C25", unidad: Unit.ML },
  TIRANTE_MADERA_2X3: { nombre: "Tirante de madera 2\"x3\"", unidad: Unit.ML },
  TORNILLO_AUTOPERFORANTE: { nombre: "Tornillo autoperforante techa", unidad: Unit.UN },
  FILM_BARRERA_HIDRICA: { nombre: "Film barrera de humedad", unidad: Unit.M2 },
  INODORO_COMPLETO: { nombre: "Inodoro completo con mochila", unidad: Unit.UN },
  LAVATORIO_PEDESTAL: { nombre: "Lavatorio con pedestal", unidad: Unit.UN },
  GRIFERIA_LAVATORIO: { nombre: "Grifería de lavatorio", unidad: Unit.UN },
  DUCHA_JUEGO: { nombre: "Juego de ducha", unidad: Unit.UN },
  CANO_PVC_100_4M: { nombre: "Caño PVC 110 mm x 4 m", unidad: Unit.UN },
  CANO_PVC_40_4M: { nombre: "Caño PVC 40 mm x 4 m", unidad: Unit.UN },
  DESAGUE_PISO: { nombre: "Desagüe de piso", unidad: Unit.UN },
  SIFON_LAVATORIO: { nombre: "Sifón lavatorio", unidad: Unit.UN },
  CERAMICA_PISO: { nombre: "Cerámica de piso", unidad: Unit.M2 },
  CERAMICA_PARED: { nombre: "Cerámica de pared", unidad: Unit.M2 },
  PEGAMENTO_CERAMICO_30KG: { nombre: "Pegamento cerámico 30 kg", unidad: Unit.BOLSA },
  PASTINA: { nombre: "Pastina", unidad: Unit.KG },
};

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
      { codigoMaterial: "LADRILLO_HUECO_18X18X33", cantidadPorUnidad: 16, desperdicioPct: D.MEDIO },
      { codigoMaterial: "CEMENTO_PORTLAND_50KG", cantidadPorUnidad: 0.12, desperdicioPct: D.BAJO },
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
      { codigoMaterial: "CEMENTO_PORTLAND_50KG", cantidadPorUnidad: 1, desperdicioPct: D.BAJO },
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
