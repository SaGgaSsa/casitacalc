const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** $ 1.234.567 — formato argentino sin decimales. */
export function formatMoney(value: number | null | undefined): string {
  return ars.format(value ?? 0);
}

/** 20/08/2026 */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(date);
}

/** 1.234,56 según unidad discreta o continua. */
export function formatQty(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}
