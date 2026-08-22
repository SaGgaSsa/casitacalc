import { describe, expect, it } from "vitest";
import { RoofType } from "@casitacalc/shared";
import type { HouseInput } from "@casitacalc/shared";
import { computeGeometry } from "../src/geometry";

function baseInput(overrides: Partial<HouseInput> = {}): HouseInput {
  return {
    nombreProyecto: "Test",
    anchoM: 8,
    largoM: 10,
    alturaParedesM: 2.7,
    sistemaConstructivo: "LADRILLO_HUECO",
    tipoTecho: RoofType.CHAPA,
    anguloTechoGrados: 30,
    cantidadBanios: 0,
    aberturas: [],
    ...overrides,
  };
}

describe("computeGeometry", () => {
  it("calcula planta, perímetro y muros bruta de una casa 8x10", () => {
    const geo = computeGeometry(baseInput());
    expect(geo.superficiePlantaM2).toBeCloseTo(80);
    expect(geo.perimetroM).toBeCloseTo(36);
    expect(geo.areaParedesBrutaM2).toBeCloseTo(36 * 2.7);
  });

  it("resta las aberturas del área de muros", () => {
    const input = baseInput({
      aberturas: [
        { tipo: "PUERTA", anchoM: 0.9, altoM: 2.0, cantidad: 1 }, // 1.8
        { tipo: "VENTANA", anchoM: 1.2, altoM: 1.1, cantidad: 4 }, // 5.28
      ],
    });
    const geo = computeGeometry(input);
    expect(geo.areaAberturasM2).toBeCloseTo(7.08);
    expect(geo.areaParedesNetaM2).toBeCloseTo(97.2 - 7.08);
  });

  it("nunca devuelve un área de muro negativa", () => {
    const input = baseInput({
      anchoM: 3,
      largoM: 3,
      alturaParedesM: 2.4,
      aberturas: [{ tipo: "PUERTA", anchoM: 2.5, altoM: 2.2, cantidad: 8 }],
    });
    expect(computeGeometry(input).areaParedesNetaM2).toBe(0);
  });

  it("para techo de chapa divide la planta por cos(ángulo)", () => {
    const geo = computeGeometry(baseInput({ anguloTechoGrados: 60 }));
    // cos(60°) = 0.5 → el doble de la planta
    expect(geo.superficieTechoM2).toBeCloseTo(160, 5);
  });

  it("para techo de losa la superficie es igual a la planta (ángulo ignorado)", () => {
    const geo = computeGeometry(
      baseInput({ tipoTecho: RoofType.LOSA, anguloTechoGrados: 0 }),
    );
    expect(geo.superficieTechoM2).toBeCloseTo(80);
  });
});
