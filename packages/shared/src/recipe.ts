import { z } from "zod";
import {
  ConstructionSystemEnum,
  OpeningTypeEnum,
  RoofTypeEnum,
  RoofType,
} from "./enums";

/** Rubros del cómputo (agrupan items en la pantalla de resultados). */
export const Rubro = {
  MAMPOSTERIA: "Mampostería",
  TECHO: "Techo",
  BANOS: "Baños",
  REVOQUES: "Revoques",
  CONTRAPISO: "Contrapiso",
  PISOS: "Pisos",
  ABERTURAS: "Aberturas",
} as const;
export type RubroValue = (typeof Rubro)[keyof typeof Rubro];

const RubroEnum = z.enum([
  Rubro.MAMPOSTERIA,
  Rubro.TECHO,
  Rubro.BANOS,
  Rubro.REVOQUES,
  Rubro.CONTRAPISO,
  Rubro.PISOS,
  Rubro.ABERTURAS,
] as [RubroValue, ...RubroValue[]]);

/**
 * Receta por unidad base:
 *  - muros      → 1 m² de muro computable (área bruta; las aberturas no descuentan)
 *  - revoques   → 1 m² de muro computable, por cara (una receta por cara)
 *  - contrapiso → 1 m² de planta
 *  - pisos      → 1 m² de piso general (planta menos baños)
 *  - techo      → 1 m² de superficie de techo
 *  - baños      → 1 baño completo (paquete estándar)
 *  - aberturas  → 1 abertura del tipo indicado (las dimensiones vienen del input)
 */
export const RecipeItemSchema = z.object({
  codigoMaterial: z.string().min(1),
  cantidadPorUnidad: z.number().positive(),
  desperdicioPct: z.number().min(0).max(100),
});
export type RecipeItem = z.infer<typeof RecipeItemSchema>;

export const RecipeSchema = z
  .object({
    codigo: z.string().min(1),
    rubro: RubroEnum,
    sistemaConstructivo: ConstructionSystemEnum.optional(),
    tipoTecho: RoofTypeEnum.optional(),
    /** Solo rubro Aberturas: a qué tipo de abertura aplica la receta. */
    tipoAbertura: OpeningTypeEnum.optional(),
    items: z.array(RecipeItemSchema).min(1),
  })
  .refine(
    (r) =>
      r.rubro !== Rubro.TECHO ||
      (r.tipoTecho !== undefined &&
        r.sistemaConstructivo === undefined &&
        r.tipoAbertura === undefined),
    { message: "Las recetas de techo deben declarar tipoTecho" },
  )
  .refine(
    (r) =>
      r.rubro !== Rubro.ABERTURAS ||
      (r.tipoAbertura !== undefined &&
        r.sistemaConstructivo === undefined &&
        r.tipoTecho === undefined),
    { message: "Las recetas de aberturas deben declarar tipoAbertura" },
  )
  .refine(
    (r) => r.rubro !== Rubro.MAMPOSTERIA || r.sistemaConstructivo !== undefined,
    { message: "Las recetas de muros deben declarar sistemaConstructivo" },
  );

export type Recipe = z.infer<typeof RecipeSchema>;

export const UpdateRecipeSchema = z.object({
  items: z.array(RecipeItemSchema).min(1),
});
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;
