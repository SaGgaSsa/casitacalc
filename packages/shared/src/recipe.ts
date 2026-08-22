import { z } from "zod";
import { ConstructionSystemEnum, RoofTypeEnum, RoofType } from "./enums";

/** Rubros del cómputo (agrupan items en la pantalla de resultados). */
export const Rubro = {
  MAMPOSTERIA: "Mampostería",
  TECHO: "Techo",
  BANOS: "Baños",
} as const;
export type RubroValue = (typeof Rubro)[keyof typeof Rubro];

const RubroEnum = z.enum([
  Rubro.MAMPOSTERIA,
  Rubro.TECHO,
  Rubro.BANOS,
] as [RubroValue, ...RubroValue[]]);

/**
 * Receta por unidad base:
 *  - muros   → 1 m² de muro neto
 *  - techo   → 1 m² de superficie de techo
 *  - baños   → 1 baño completo
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
    items: z.array(RecipeItemSchema).min(1),
  })
  .refine(
    (r) =>
      r.rubro !== Rubro.TECHO ||
      (r.tipoTecho !== undefined && r.sistemaConstructivo === undefined),
    { message: "Las recetas de techo deben declarar tipoTecho" },
  )
  .refine(
    (r) =>
      r.rubro === Rubro.TECHO || r.rubro === Rubro.BANOS || r.sistemaConstructivo !== undefined,
    { message: "Las recetas de muros deben declarar sistemaConstructivo" },
  );

export type Recipe = z.infer<typeof RecipeSchema>;

export const UpdateRecipeSchema = z.object({
  items: z.array(RecipeItemSchema).min(1),
});
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;
