import { z } from "zod";
import { OpeningTypeEnum } from "./enums";

export const OpeningSchema = z.object({
  tipo: OpeningTypeEnum,
  /**
   * Cantidad de unidades de este tipo (puerta exterior, ventana exterior...).
   * Sin dimensiones: la medida de referencia vive en el motor, no en el input.
   */
  cantidad: z.number().int().min(1).max(50),
});

export type Opening = z.infer<typeof OpeningSchema>;
