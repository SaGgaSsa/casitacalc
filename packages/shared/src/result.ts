import { z } from "zod";
import { UnitEnum } from "./enums";

/** Item del cómputo de materiales: un material con su cantidad y precio. */
export const CalculationResultItemSchema = z.object({
  /** Código estable del material (ej: LADRILLO_HUECO_12x18x33). */
  codigoMaterial: z.string(),
  nombreMaterial: z.string(),
  /** Rubro al que pertenece: Mampostería, Techo, Baños... */
  rubro: z.string(),
  /** Cantidad neta calculada sin desperdicio. */
  cantidad: z.number().nonnegative(),
  unidad: UnitEnum,
  /** % de desperdicio aplicado sobre la cantidad neta. */
  desperdicioPct: z.number().min(0).max(100),
  /** Cantidad final redondeada según unidad (discretos → entero hacia arriba). */
  cantidadFinal: z.number().positive(),
  precioUnitario: z.number().nonnegative().optional(),
  subtotal: z.number().nonnegative().optional(),
  /** Trazabilidad del precio aplicado (relevamiento publicado o catálogo). */
  fuentePrecio: z.string().optional(),
  fechaPrecio: z.string().datetime().optional(),
  regionPrecio: z.string().optional(),
});

export type CalculationResultItem = z.infer<typeof CalculationResultItemSchema>;

export const CalculationResultSchema = z.object({
  items: z.array(CalculationResultItemSchema),
  /** Subtotal por rubro (solo si se aplicaron precios). */
  subtotalesPorRubro: z.record(z.string(), z.number()),
  totalGeneral: z.number().nonnegative(),
  /** Geometría derivada usada en el cálculo (para mostrar en pantalla). */
  geometria: z.object({
    superficiePlantaM2: z.number(),
    perimetroM: z.number(),
    areaParedesBrutaM2: z.number(),
    areaAberturasM2: z.number(),
    /** Base de mampostería y revoques = área bruta (las aberturas no descuentan). */
    areaMuroComputableM2: z.number(),
    superficieTechoM2: z.number(),
  }),
});

export type CalculationResult = z.infer<typeof CalculationResultSchema>;
