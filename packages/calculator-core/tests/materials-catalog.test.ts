import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MATERIAL_CATALOG, MATERIAL_CODES } from "@casitacalc/shared";

describe("catálogo maestro de materiales", () => {
  it("carga las 23 entradas desde el archivo maestro", () => {
    expect(MATERIAL_CATALOG.length).toBe(23);
  });

  it("cada entrada tiene código/nombre/categoría no vacíos y formato de código estable", () => {
    for (const entry of MATERIAL_CATALOG) {
      expect(entry.codigo).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(entry.nombre.length).toBeGreaterThan(0);
      expect(entry.categoria.length).toBeGreaterThan(0);
    }
  });

  it("no tiene códigos duplicados", () => {
    const codigos = MATERIAL_CATALOG.map((m) => m.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });
});

describe("drift: specs de relevamiento vs catálogo maestro", () => {
  const SPECS_PATH = fileURLToPath(
    new URL(
      "../../../config/price-surveys/mercadolibre-price-specs.json",
      import.meta.url,
    ),
  );

  it("todo materialCode de las specs existe en el catálogo maestro", () => {
    const specs = JSON.parse(readFileSync(SPECS_PATH, "utf8")) as {
      materials: { materialCode: string }[];
    };
    for (const spec of specs.materials) {
      expect(
        MATERIAL_CODES.has(spec.materialCode),
        `materialCode desconocido en specs: ${spec.materialCode}`,
      ).toBe(true);
    }
  });
});
