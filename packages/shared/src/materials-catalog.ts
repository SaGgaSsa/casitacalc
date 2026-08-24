import { z } from "zod";
import rawCatalog from "./materials.json";
import { UnitEnum, type Unit } from "./enums";

/** Entrada del catálogo maestro de materiales (`src/materials.json`). */
export interface MaterialMasterEntry {
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: Unit;
}

const MaterialMasterEntrySchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  unidad: UnitEnum,
});

const MaterialCatalogFileSchema = z
  .array(MaterialMasterEntrySchema)
  .min(1)
  .refine(
    (entries) => new Set(entries.map((e) => e.codigo)).size === entries.length,
    "Códigos de material duplicados en materials.json",
  );

/** Catálogo maestro validado. Falla rápido al importar si el archivo es inválido. */
export const MATERIAL_CATALOG: MaterialMasterEntry[] =
  MaterialCatalogFileSchema.parse(rawCatalog);

/** Set de códigos válidos para consultas rápidas (tests, guards). */
export const MATERIAL_CODES: ReadonlySet<string> = new Set(
  MATERIAL_CATALOG.map((m) => m.codigo),
);
