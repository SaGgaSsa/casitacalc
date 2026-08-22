import { describe, expect, it } from "vitest";
import { Unit } from "@casitacalc/shared";
import { roundMoney, roundQuantity } from "../src/rounding";

describe("roundQuantity", () => {
  it("redondea unidades discretas hacia arriba", () => {
    expect(roundQuantity(1632.01, Unit.UN)).toBe(1633);
    expect(roundQuantity(10.5, Unit.BOLSA)).toBe(11);
  });

  it("no redondea hacia arriba por error de coma flotante (15.000000001 → 15)", () => {
    expect(roundQuantity(15 + 1e-9, Unit.UN)).toBe(15);
  });

  it("mantiene 2 decimales en materiales continuos", () => {
    expect(roundQuantity(2.2299999, Unit.M3)).toBe(2.23);
    expect(roundQuantity(123.456, Unit.KG)).toBe(123.46);
    expect(roundQuantity(50.444, Unit.M2)).toBe(50.44);
  });
});

describe("roundMoney", () => {
  it("redondea a 2 decimales", () => {
    expect(roundMoney(100.005)).toBe(100.01);
    expect(roundMoney(33.333333)).toBe(33.33);
  });
});
