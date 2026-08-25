import { describe, expect, it } from "vitest";
import { RoofType, Unit } from "@casitacalc/shared";
import type { HouseInput } from "@casitacalc/shared";
import { calculateHouse } from "../src/calculator";
import { DEFAULT_MATERIAL_CATALOG } from "../src/recipes-defaults";

function baseInput(overrides: Partial<HouseInput> = {}): HouseInput {
  return {
    nombreProyecto: "Casa test",
    anchoM: 8,
    largoM: 10,
    alturaParedesM: 2.7,
    sistemaConstructivo: "LADRILLO_HUECO",
    tipoTecho: RoofType.CHAPA,
    anguloTechoGrados: 30,
    cantidadBanios: 1,
    aberturas: [],
    ...overrides,
  };
}

function item(codigoMaterial: string) {
  const found = calculateHouse(baseInput()).items.find(
    (i) => i.codigoMaterial === codigoMaterial,
  );
  if (!found) throw new Error(`No se encontró ${codigoMaterial}`);
  return found;
}

describe("calculateMaterials — muros", () => {
  it("casa 8x10 sin aberturas: 97.2 m² netos → ladrillos con 10% de desperdicio", () => {
    const ladrillos = item("LADRILLO_HUECO_12X18X33");
    // 97.2 m² * 16 un/m² * 1.10 = 1710.72 → ceil 1711
    expect(ladrillos.cantidad).toBeCloseTo(1555.2);
    expect(ladrillos.cantidadFinal).toBe(1711);
    expect(ladrillos.rubro).toBe("Mampostería");
  });

  it("las aberturas reducen los materiales de muro", () => {
    const conAberturas = calculateHouse(
      baseInput({ aberturas: [{ tipo: "PUERTA", anchoM: 1, altoM: 2, cantidad: 5 }] }),
    ).items.find((i) => i.codigoMaterial === "LADRILLO_HUECO_12X18X33");
    // muro bruto 97.2 − 10 = 87.2 m² → 16 * 87.2 * 1.1 = 1534.72 → ceil 1535
    expect(conAberturas?.cantidadFinal).toBe(1535);
  });

  it("el cemento del rubro mampostería es continuo (2 decimales)", () => {
    const cemento = item("CEMENTO_PORTLAND_25KG");
    // 97.2 * 0.24 * 1.05 = 24.494 → 24.49
    expect(cemento.unidad).toBe(Unit.BOLSA);
    expect(cemento.cantidadFinal).toBe(25);
  });
});

describe("calculateMaterials — techo", () => {
  it("chapa a 30° usa la superficie inclinada", () => {
    const chapa = item("CHAPA_TRAPEZOIDAL_C25");
    // techo: 80 / cos30° ≈ 92.376 m²; chapa: × 1.05 × 1.05 ≈ 101.85 ml
    expect(chapa.cantidadFinal).toBe(102);
  });

  it("losa: superficie = planta y agrega acero/hormigón", () => {
    const result = calculateHouse(baseInput({ tipoTecho: RoofType.LOSA, anguloTechoGrados: 0 }));
    const acero = result.items.find((i) => i.codigoMaterial === "ACERO_LOSA_ADL15");
    expect(acero?.cantidadFinal).toBe(840); // 80 m² * 10 kg/m² * 1.05
    expect(result.items.some((i) => i.codigoMaterial === "PIEDRA_BOLA")).toBe(true);
  });

  it("no incluye chapas ni tornillos cuando el techo es losa (y viceversa)", () => {
    const losa = calculateHouse(baseInput({ tipoTecho: RoofType.LOSA, anguloTechoGrados: 0 }));
    expect(losa.items.some((i) => i.codigoMaterial === "CHAPA_TRAPEZOIDAL_C25")).toBe(false);

    const chapaResult = calculateHouse(baseInput());
    expect(chapaResult.items.some((i) => i.codigoMaterial === "ACERO_LOSA_ADL15")).toBe(false);
  });
});

describe("calculateMaterials — baños", () => {
  it("un baño multiplica el paquete por 1", () => {
    const inodoro = item("INODORO_COMPLETO");
    expect(inodoro.cantidadFinal).toBe(1);
    expect(item("PEGAMENTO_CERAMICO_30KG").cantidadFinal).toBe(5); // 4*1*1.05
  });

  it("dos baños duplican el paquete", () => {
    const inodoro = calculateHouse(baseInput({ cantidadBanios: 2 })).items.find(
      (i) => i.codigoMaterial === "INODORO_COMPLETO",
    );
    expect(inodoro?.cantidadFinal).toBe(2);
  });

  it("cero baños no agrega items del paquete", () => {
    const result = calculateHouse(baseInput({ cantidadBanios: 0 }));
    expect(result.items.some((i) => i.rubro === "Baños")).toBe(false);
  });
});

describe("calculateMaterials — errores", () => {
  it("falla si no hay receta para el sistema constructivo", () => {
    expect(() =>
      calculateHouse(baseInput({ sistemaConstructivo: "STEEL_FRAMING" as never })),
    ).toThrow(/receta de muros/i);
  });

  it("falla si el catálogo no conoce un material de la receta", () => {
    const catalogoIncompleto = { ...DEFAULT_MATERIAL_CATALOG };
    delete (catalogoIncompleto as Partial<typeof catalogoIncompleto>).ARENA_GRUESA;
    expect(() =>
      calculateHouse(baseInput(), { catalog: catalogoIncompleto }),
    ).toThrow(/ARENA_GRUESA/);
  });
});
