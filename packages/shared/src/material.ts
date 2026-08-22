import { z } from "zod";
import { UnitEnum } from "./enums";

/**
 * Material del catálogo. `codigo` es estable y lo usa el motor de cálculo;
 * el `id` de base de datos queda desacoplado.
 */
export const MaterialSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1).max(60),
  nombre: z.string().min(1).max(120),
  categoria: z.string().min(1).max(60),
  unidad: UnitEnum,
  precioDefault: z.number().nonnegative(),
  /** Precio editable por el usuario; si no se seteó, se usa precioDefault. */
  precioActual: z.number().nonnegative(),
  fechaActualizacionPrecio: z.string().datetime().optional(),
  fuente: z.string().optional(),
});

export type Material = z.infer<typeof MaterialSchema>;

export const UpdateMaterialPriceSchema = z.object({
  precio: z.number().nonnegative({ message: "El precio no puede ser negativo" }),
});

export type UpdateMaterialPriceInput = z.infer<typeof UpdateMaterialPriceSchema>;

/** Mapa código → precio usado por applyPrices() del motor. */
export type PriceMap = Record<string, number>;
