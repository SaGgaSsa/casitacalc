import { z } from "zod";
import { Unit } from "./enums";

// ── Fuentes de precios ──────────────────────────────────────────────────────

/**
 * Códigos de fuente de precios. La tabla `PriceSource` en DB permite agregar
 * fuentes nuevas (Sodimac, corralones, APIs) sin tocar el modelo principal;
 * este enum cubre las semillas iniciales.
 */
export const PriceSourceCode = {
  EASY: "EASY",
  MERCADOLIBRE: "MERCADOLIBRE",
  MANUAL: "MANUAL",
} as const;
export type PriceSourceCode = (typeof PriceSourceCode)[keyof typeof PriceSourceCode];

export const PriceSourceCodeEnum = z.enum(
  Object.values(PriceSourceCode) as [PriceSourceCode, ...PriceSourceCode[]],
);

export const PRICE_SOURCE_LABELS: Record<PriceSourceCode, string> = {
  EASY: "Easy",
  MERCADOLIBRE: "Mercado Libre",
  MANUAL: "Manual",
};

// ── Regiones ────────────────────────────────────────────────────────────────

/** Regiones de relevamiento iniciales; extensible sin cambiar el modelo. */
export const RegionCode = {
  CABA: "CABA",
  GBA: "GBA",
} as const;
export type RegionCode = (typeof RegionCode)[keyof typeof RegionCode];

export const RegionEnum = z.enum(Object.values(RegionCode) as [RegionCode, ...RegionCode[]]);

export const REGION_LABELS: Record<RegionCode, string> = {
  CABA: "CABA",
  GBA: "Gran Buenos Aires",
};

/** Región por defecto de la calculadora mientras no haya selector de zona. */
export const DEFAULT_REGION: RegionCode = RegionCode.GBA;

// ── Unidades de paquete del CSV normalizado ─────────────────────────────────

/**
 * Unidades en que se expresa el paquete vendido (`package_unit` del CSV).
 * Cada una mapea a la unidad interna del proyecto (`Unit`) en que queda
 * expresado el precio normalizado. No hay conversiones entre dimensiones:
 * si el paquete no es compatible con la unidad del material, la fila se
 * rechaza con INCOMPATIBLE_UNIT.
 */
export const PackageUnit = {
  UNIT: "UNIT",
  BAG_25KG: "BAG_25KG",
  BAG_40KG: "BAG_40KG",
  BAG_50KG: "BAG_50KG",
  KG: "KG",
  M2: "M2",
  M3: "M3",
  LITER: "LITER",
  METER: "METER",
} as const;
export type PackageUnit = (typeof PackageUnit)[keyof typeof PackageUnit];

export const PackageUnitEnum = z.enum(
  Object.values(PackageUnit) as [PackageUnit, ...PackageUnit[]],
);

export const PACKAGE_UNIT_LABELS: Record<PackageUnit, string> = {
  UNIT: "unidad",
  BAG_25KG: "bolsa 25 kg",
  BAG_40KG: "bolsa 40 kg",
  BAG_50KG: "bolsa 50 kg",
  KG: "kg",
  M2: "m²",
  M3: "m³",
  LITER: "litro",
  METER: "metro",
};

/** package_unit → unidad interna en que se normaliza el precio. */
export const PACKAGE_UNIT_TO_MATERIAL_UNIT: Record<PackageUnit, Unit> = {
  UNIT: Unit.UN,
  BAG_25KG: Unit.BOLSA,
  BAG_40KG: Unit.BOLSA,
  BAG_50KG: Unit.BOLSA,
  KG: Unit.KG,
  M2: Unit.M2,
  M3: Unit.M3,
  LITER: Unit.L,
  METER: Unit.ML,
};

/**
 * Bolsa esperada según sufijo del código de material (_25KG/_40KG/_50KG).
 * Devuelve null para materiales sin bolsa nominal en el código.
 */
export function expectedBagFromMaterialCode(materialCode: string): PackageUnit | null {
  const match = /_(\d{2})KG$/.exec(materialCode);
  if (!match) return null;
  switch (match[1]) {
    case "25":
      return PackageUnit.BAG_25KG;
    case "40":
      return PackageUnit.BAG_40KG;
    case "50":
      return PackageUnit.BAG_50KG;
    default:
      return null;
  }
}

// ── Estados ─────────────────────────────────────────────────────────────────

export const CollectionStatus = {
  DRAFT: "DRAFT",
  VALIDATED: "VALIDATED",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
  FAILED: "FAILED",
} as const;
export type CollectionStatus = (typeof CollectionStatus)[keyof typeof CollectionStatus];

export const ReferencePriceStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
} as const;
export type ReferencePriceStatus =
  (typeof ReferencePriceStatus)[keyof typeof ReferencePriceStatus];

/** Estado de una fila del CSV tras validarla. */
export const RowStatus = {
  VALID: "VALID",
  WARNING: "WARNING",
  INVALID: "INVALID",
} as const;
export type RowStatus = (typeof RowStatus)[keyof typeof RowStatus];

// ── Motivos de rechazo / warning ────────────────────────────────────────────

export const RejectionReason = {
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  UNKNOWN_SOURCE: "UNKNOWN_SOURCE",
  DISABLED_SOURCE: "DISABLED_SOURCE",
  UNKNOWN_REGION: "UNKNOWN_REGION",
  UNKNOWN_MATERIAL_CODE: "UNKNOWN_MATERIAL_CODE",
  UNKNOWN_CURRENCY: "UNKNOWN_CURRENCY",
  NEGATIVE_PRICE: "NEGATIVE_PRICE",
  INVALID_PACKAGE_QUANTITY: "INVALID_PACKAGE_QUANTITY",
  UNKNOWN_PACKAGE_UNIT: "UNKNOWN_PACKAGE_UNIT",
  UNKNOWN_PACKAGE_QUANTITY: "UNKNOWN_PACKAGE_QUANTITY",
  INCOMPATIBLE_UNIT: "INCOMPATIBLE_UNIT",
  INVALID_DATE: "INVALID_DATE",
  DUPLICATE_ROW: "DUPLICATE_ROW",
  DUPLICATE_IN_DB: "DUPLICATE_IN_DB",
  EXCLUDED_BY_ADMIN: "EXCLUDED_BY_ADMIN",
} as const;
export type RejectionReason = (typeof RejectionReason)[keyof typeof RejectionReason];

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  MISSING_REQUIRED_FIELD: "Falta un campo obligatorio",
  UNKNOWN_SOURCE: "Fuente desconocida",
  DISABLED_SOURCE: "Fuente deshabilitada",
  UNKNOWN_REGION: "Región desconocida",
  UNKNOWN_MATERIAL_CODE: "Código de material inexistente",
  UNKNOWN_CURRENCY: "Moneda no soportada",
  NEGATIVE_PRICE: "Precio no positivo",
  INVALID_PACKAGE_QUANTITY: "Cantidad de paquete inválida",
  UNKNOWN_PACKAGE_UNIT: "Unidad de paquete desconocida",
  UNKNOWN_PACKAGE_QUANTITY: "No se puede normalizar la cantidad",
  INCOMPATIBLE_UNIT: "Unidad incompatible con el material",
  INVALID_DATE: "Fecha de relevamiento inválida",
  DUPLICATE_ROW: "Duplicado dentro del archivo",
  DUPLICATE_IN_DB: "Duplicado ya importado",
  EXCLUDED_BY_ADMIN: "Excluida manualmente",
};

/** Warning a nivel precio de referencia cuando faltan muestras. */
export const INSUFFICIENT_SAMPLE_SIZE = "INSUFFICIENT_SAMPLE_SIZE" as const;

/** Warning cuando la mediana propuesta supera el umbral de inflación. */
export const EXCEEDS_INFLATION = "EXCEEDS_INFLATION" as const;

/**
 * Inflación mensual estimada para validar relevamientos. Fija hasta
 * integrar el cálculo contra una API económica.
 */
export const MONTHLY_INFLATION_RATE = 0.025;

/** Mínimo de observaciones aceptadas para auto-validar un precio de referencia. */
export const MIN_REFERENCE_SAMPLES = 5;

/** Moneda soportada inicialmente. */
export const CurrencyEnum = z.enum(["ARS"]);
export type Currency = z.infer<typeof CurrencyEnum>;

// ── Contrato interno (independiente del CSV) ────────────────────────────────

/**
 * DTO que produce cualquier proveedor (CSV, API, skill, carga manual) antes
 * de entrar al servicio de importación. El precio normalizado NUNCA viaja en
 * el input: lo calcula siempre CasitaCalc server-side.
 */
export const NormalizedPriceObservationInputSchema = z.object({
  source: z.string().min(1),
  region: z.string().min(1),
  collectedAt: z.date(),

  materialCode: z.string().min(1),

  externalId: z.string().min(1).nullish(),
  title: z.string().min(1).max(300),
  url: z.string().url().max(1000),

  currency: z.string().min(1).max(10),
  rawPrice: z.number().positive(),

  packageQuantity: z.number().positive(),
  packageUnit: z.string().min(1),

  brand: z.string().max(120).nullish(),
  seller: z.string().max(200).nullish(),

  /** El proveedor puede marcar filas inválidas; CasitaCalc re-valida igual. */
  accepted: z.boolean().default(true),
  rejectionReason: z.string().max(60).nullish(),

  metadata: z.record(z.unknown()).nullish(),
});
export type NormalizedPriceObservationInput = z.infer<
  typeof NormalizedPriceObservationInputSchema
>;
