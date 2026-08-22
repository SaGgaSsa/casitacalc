import { z } from "zod";

/** Unidades de medida soportadas para materiales. */
export const Unit = {
  UN: "un",
  BOLSA: "bolsa",
  KG: "kg",
  L: "l",
  M2: "m2",
  M3: "m3",
  ML: "ml",
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

export const UNIT_LABELS: Record<Unit, string> = {
  un: "un",
  bolsa: "bolsa",
  kg: "kg",
  l: "L",
  m2: "m²",
  m3: "m³",
  ml: "ml",
};

/** Sistemas constructivos implementados en el MVP (extensible a futuro). */
export const ConstructionSystem = {
  LADRILLO_HUECO: "LADRILLO_HUECO",
} as const;
export type ConstructionSystem =
  (typeof ConstructionSystem)[keyof typeof ConstructionSystem];

/** Tipos de techo implementados en el MVP. */
export const RoofType = {
  CHAPA: "CHAPA",
  LOSA: "LOSA",
} as const;
export type RoofType = (typeof RoofType)[keyof typeof RoofType];

/** Tipos de aberturas. */
export const OpeningType = {
  PUERTA: "PUERTA",
  VENTANA: "VENTANA",
} as const;
export type OpeningType = (typeof OpeningType)[keyof typeof OpeningType];

// ── Schemas Zod derivados (fuente única de verdad) ─────────────────────────

export const UnitEnum = z.enum(Object.values(Unit) as [Unit, ...Unit[]]);
export const ConstructionSystemEnum = z.enum(
  Object.values(ConstructionSystem) as [ConstructionSystem, ...ConstructionSystem[]],
);
export const RoofTypeEnum = z.enum(Object.values(RoofType) as [RoofType, ...RoofType[]]);
export const OpeningTypeEnum = z.enum(
  Object.values(OpeningType) as [OpeningType, ...OpeningType[]],
);
