import { describe, expect, it } from "vitest";
import { applyPrices } from "../src/calculator";
import { calculateHouse } from "../src/calculator";
import type { HouseInput } from "@casitacalc/shared";

function baseInput(overrides: Partial<HouseInput> = {}): HouseInput {
  return {
    nombreProyecto: "Casa precios",
    anchoM: 4,
    largoM: 5,
    alturaParedesM: 2.7,
    sistemaConstructivo: "LADRILLO_HUECO",
    tipoTecho: "CHAPA",
    anguloTechoGrados: 20,
    cantidadBanios: 0,
    aberturas: [],
    ...overrides,
  };
}

const PRECIOS = {
  LADRILLO_HUECO_12X18X33: 650,
  CEMENTO_PORTLAND_50KG: 8500,
};

describe("applyPrices", () => {
  it("asigna precio unitario y subtotal por item", () => {
    const result = applyPrices(calculateHouse(baseInput()), PRECIOS);
    const ladrillos = result.items.find(
      (i) => i.codigoMaterial === "LADRILLO_HUECO_12X18X33",
    );
    expect(ladrillos?.precioUnitario).toBe(650);
    expect(ladrillos?.subtotal).toBe(650 * (ladrillos?.cantidadFinal ?? 0));
  });

  it("los subtotales visibles suman exacto el total general", () => {
    const result = applyPrices(calculateHouse(baseInput()), PRECIOS);
    const sumaItems = Object.values(result.subtotalesPorRubro).reduce((a, b) => a + b, 0);
    expect(result.totalGeneral).toBe(sumaItems);
    // Solo hay precios para Mampostería → Techo no aparece en subtotales
    expect(result.subtotalesPorRubro["Techo"]).toBeUndefined();
  });

  it("deja sin precio los items que faltan en el PriceMap", () => {
    const result = applyPrices(calculateHouse(baseInput()), {});
    expect(result.totalGeneral).toBe(0);
    for (const i of result.items) {
      expect(i.precioUnitario).toBeUndefined();
      expect(i.subtotal).toBeUndefined();
    }
  });
});
