import type { HouseInput } from "@casitacalc/shared";
import { openingArea } from "@casitacalc/shared";
import { RoofType } from "@casitacalc/shared";

/** Geometría derivada de la vivienda, insumo de todos los cálculos por rubro. */
export interface HouseGeometry {
  superficiePlantaM2: number;
  perimetroM: number;
  /** perimetro * alturaParedes. */
  areaParedesBrutaM2: number;
  areaAberturasM2: number;
  /** bruta − aberturas (nunca negativa). */
  areaParedesNetaM2: number;
  /** CHAPA: planta / cos(ángulo). LOSA: planta. */
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

  const areaAberturasM2 = input.aberturas.reduce(
    (total, abertura) => total + openingArea(abertura),
    0,
  );

  const areaParedesNetaM2 = Math.max(0, areaParedesBrutaM2 - areaAberturasM2);

  let superficieTechoM2 = superficiePlantaM2;
  if (input.tipoTecho === RoofType.CHAPA) {
    const anguloRad = (input.anguloTechoGrados * Math.PI) / 180;
    superficieTechoM2 = superficiePlantaM2 / Math.cos(anguloRad);
  }

  return {
    superficiePlantaM2,
    perimetroM,
    areaParedesBrutaM2,
    areaAberturasM2,
    areaParedesNetaM2,
    superficieTechoM2,
  };
}
