/**
 * Resumen de aberturas en unidades físicas: cada fila de la planilla es un
 * tipo (puerta/ventana con medidas) con su cantidad. Muestra el total de
 * unidades y, si hay más de un tipo, lo aclara entre paréntesis.
 */
export function resumenAberturas(openings: { cantidad: number }[]): string {
  const unidades = openings.reduce((acc, o) => acc + o.cantidad, 0);
  if (openings.length > 1) return `${unidades} (${openings.length} tipos)`;
  return String(unidades);
}
