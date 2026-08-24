import { describe, expect, it } from "vitest";
import { MATERIAL_CATALOG } from "@casitacalc/shared";

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
