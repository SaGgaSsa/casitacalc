import { describe, expect, it } from "vitest";
import { resumenAberturas } from "@/lib/aberturas";

describe("resumenAberturas", () => {
  it("suma unidades físicas e indica tipos cuando hay más de uno", () => {
    expect(
      resumenAberturas([{ cantidad: 2 }, { cantidad: 2 }]),
    ).toBe("4 (2 tipos)");
  });

  it("un solo tipo muestra solo las unidades", () => {
    expect(resumenAberturas([{ cantidad: 3 }])).toBe("3");
  });

  it("sin aberturas muestra 0", () => {
    expect(resumenAberturas([])).toBe("0");
  });
});
