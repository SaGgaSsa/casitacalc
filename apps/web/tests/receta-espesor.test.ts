import { describe, expect, it } from "vitest";
import { espesorReferenciaCm } from "@casitacalc/shared";

/**
 * El espesor de referencia del Contrapiso se lee del código de la receta,
 * no se duplica en la UI.
 */
describe("espesorReferenciaCm", () => {
  it("lee los cm del sufijo _<N>CM", () => {
    expect(espesorReferenciaCm("CONTRAPISO_HORMIGON_10CM")).toBe(10);
    expect(espesorReferenciaCm("CONTRAPISO_HORMIGON_15CM")).toBe(15);
  });

  it("devuelve null si el código no declara espesor", () => {
    expect(espesorReferenciaCm("REVOQUE_EXTERIOR")).toBeNull();
    expect(espesorReferenciaCm("ABERTURA_PUERTA")).toBeNull();
    expect(espesorReferenciaCm("")).toBeNull();
  });
});
