import { z } from "zod";
import { OpeningTypeEnum } from "./enums";

export const OpeningSchema = z.object({
  tipo: OpeningTypeEnum,
  /** Ancho en metros. Ej: puerta 0.80, ventana 1.20 */
  anchoM: z.number().positive().max(10),
  /** Alto en metros. Ej: puerta 2.00, ventana 1.10 */
  altoM: z.number().positive().max(6),
  cantidad: z.number().int().min(1).max(50),
});

export type Opening = z.infer<typeof OpeningSchema>;

/** m² totales que ocupa la abertura (ancho * alto * cantidad). */
export function openingArea(opening: Opening): number {
  return opening.anchoM * opening.altoM * opening.cantidad;
}
