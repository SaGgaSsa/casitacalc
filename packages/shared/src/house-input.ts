import { z } from "zod";
import {
  ConstructionSystemEnum,
  RoofTypeEnum,
  RoofType,
} from "./enums";
import { OpeningSchema, type Opening } from "./opening";

export const MIN_ROOF_ANGLE_DEG = 5;
export const MAX_ROOF_ANGLE_DEG = 60;
export const MIN_NOMBRE_LENGTH = 4;
export const MAX_PROJECTS_PER_VISITOR = 10;

/** Al menos una letra Unicode en el nombre. */
const TIENE_LETRA_RE = /\p{L}/u;
/** Cuatro o más caracteres idénticos consecutivos (ej: "aaaa"). */
const REPETICION_EXCESIVA_RE = /(.)\1{3,}/u;

/**
 * Heurística anti-basura: rechaza nombres tipo "aaaaaa" u "hhhjhhh".
 * Exige una letra, al menos 3 caracteres distintos y sin repeticiones excesivas.
 */
export function esNombreDescriptivo(nombre: string): boolean {
  if (!TIENE_LETRA_RE.test(nombre)) return false;
  if (new Set(nombre.toLowerCase()).size < 3) return false;
  if (REPETICION_EXCESIVA_RE.test(nombre)) return false;
  return true;
}

/** Objeto base sin refinamientos (permite .extend/.partial en DTOs). */
export const HouseInputObjectSchema = z.object({
  nombreProyecto: z
    .string()
    .trim()
    .min(MIN_NOMBRE_LENGTH, {
      message: `El nombre debe tener al menos ${MIN_NOMBRE_LENGTH} caracteres`,
    })
    .max(80)
    .refine(esNombreDescriptivo, {
      message:
        "El nombre parece texto aleatorio; escribí un nombre descriptivo para la vivienda",
    }),
  /** Ancho de la planta (m). */
  anchoM: z.number().positive().max(100),
  /** Largo de la planta (m). */
  largoM: z.number().positive().max(100),
  /** Altura de paredes (m). Típicamente 2.60–3.00 en viviendas AR. */
  alturaParedesM: z.number().min(2).max(8),
  sistemaConstructivo: ConstructionSystemEnum,
  tipoTecho: RoofTypeEnum,
  /**
   * Inclinación del techo en grados. Obligatoria para CHAPA (mín. 5°),
   * ignorada para LOSA (debe ser 0).
   */
  anguloTechoGrados: z.number().min(0).max(MAX_ROOF_ANGLE_DEG),
  cantidadBanios: z.number().int().min(0).max(10),
  aberturas: z.array(OpeningSchema).max(50),
});

/**
 * Datos de entrada para calcular una vivienda rectangular simple.
 * Todas las medidas en metros; ángulos en grados.
 */
export const HouseInputSchema = HouseInputObjectSchema.superRefine((data, ctx) => {
  if (data.tipoTecho === RoofType.CHAPA && data.anguloTechoGrados < MIN_ROOF_ANGLE_DEG) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: MIN_ROOF_ANGLE_DEG,
      type: "number",
      inclusive: true,
      path: ["anguloTechoGrados"],
      message: `Un techo de chapa necesita una inclinación mínima de ${MIN_ROOF_ANGLE_DEG}°`,
    });
  }
  if (data.tipoTecho === RoofType.LOSA && data.anguloTechoGrados !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["anguloTechoGrados"],
      message: "Un techo de losa es plano: la inclinación debe ser 0°",
    });
  }
});

export type HouseInput = z.infer<typeof HouseInputSchema>;
export type HouseInputObject = z.infer<typeof HouseInputObjectSchema>;

/** Superficie cubierta de la planta (m²). */
export function floorArea(input: Pick<HouseInput, "anchoM" | "largoM">): number {
  return input.anchoM * input.largoM;
}
