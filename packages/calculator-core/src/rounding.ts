import { Unit } from "@casitacalc/shared";

const DISCRETE_UNITS = new Set<Unit>([Unit.UN, Unit.BOLSA, Unit.ML]);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Redondea la cantidad final según la unidad:
 *  - discretos (un, bolsa, ml): entero hacia arriba
 *    (no comprás 0.3 ladrillos ni chapas de 6.5 m)
 *  - continuos (m3, m2, kg, l): 2 decimales
 */
export function roundQuantity(cantidad: number, unidad: Unit): number {
  if (DISCRETE_UNITS.has(unidad)) {
    return Math.ceil(round2(cantidad));
  }
  return round2(cantidad);
}

/**
 * Redondeo monetario a pesos enteros: el $ argentino no usa centavos en
 * la práctica y todos los totales visibles (ítems, rubros, total) usan
 * esta misma política, así lo que se ve siempre suma exacto.
 */
export function roundMoney(value: number): number {
  return Math.round(value);
}
