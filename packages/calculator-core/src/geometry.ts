import type { HouseInput } from "@casitacalc/shared";
import { RoofType } from "@casitacalc/shared";

/** Geometría derivada de la vivienda, insumo de todos los cálculos por rubro. */
export interface HouseGeometry {
  superficiePlantaM2: number;
  perimetroM: number;
  /** perimetro * alturaParedes. */
  areaParedesBrutaM2: number;
  /** Suma de las cantidades cargadas (informativa; el cómputo es por unidad). */
  cantidadAberturas: number;
  /**
   * Base computable de mampostería y revoques = área bruta.
   * Decisión de proyecto: las aberturas NO reducen los materiales de muro
   * (el excedente absorbe cortes, roturas y encuentros).
   */
  areaMuroComputableM2: number;
  /** CHAPA: planta / cos(ángulo). LOSA: planta. Sin aleros. */
  superficieTechoM2: number;
}

/**
 * Calcula la geometría base de una vivienda rectangular simple.
 * Función pura: sin IO ni efectos.
 */
export function computeGeometry(input: HouseInput): HouseGeometry {
  const superficiePlantaM2 = input.anchoM * input.largoM;
  const perimetroM = 2 * (input.anchoM + input.largoM);
  const areaParedesBrutaM2 = perimetroM * input.alturaParedesM;

  const cantidadAberturas = input.aberturas.reduce(
    (total, abertura) => total + abertura.cantidad,
    0,
  );

  const areaMuroComputableM2 = areaParedesBrutaM2;

  let superficieTechoM2 = superficiePlantaM2;
  if (input.tipoTecho === RoofType.CHAPA) {
    const anguloRad = (input.anguloTechoGrados * Math.PI) / 180;
    superficieTechoM2 = superficiePlantaM2 / Math.cos(anguloRad);
  }

  return {
    superficiePlantaM2,
    perimetroM,
    areaParedesBrutaM2,
    cantidadAberturas,
    areaMuroComputableM2,
    superficieTechoM2,
  };
}
