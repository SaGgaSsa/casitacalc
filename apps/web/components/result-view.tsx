import { TriangleAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CalculationResult } from "@casitacalc/shared";
import { Rubro } from "@casitacalc/shared";
import { formatMoney, formatQty } from "@/lib/format";

const ORDEN_RUBROS: string[] = [
  Rubro.MAMPOSTERIA,
  Rubro.REVOQUES,
  Rubro.CONTRAPISO,
  Rubro.PISOS,
  Rubro.TECHO,
  Rubro.ABERTURAS,
  Rubro.BANOS,
];

/**
 * Vista de solo lectura del cómputo de materiales.
 * La usan el detalle del dueño (/projects/[id]/result) y las vistas
 * compartidas/públicas (/share/[token]).
 */
export function ResultView({
  result,
  preciosDesactualizados = false,
}: {
  result: CalculationResult;
  preciosDesactualizados?: boolean;
}) {
  const rubros = [...result.items]
    .sort(
      (a, b) =>
        (ORDEN_RUBROS.indexOf(a.rubro) + 1 || 99) - (ORDEN_RUBROS.indexOf(b.rubro) + 1 || 99),
    )
    .reduce<Record<string, typeof result.items>>((acc, item) => {
      (acc[item.rubro] ??= []).push(item);
      return acc;
    }, {});

  // Rubros efectivamente incluidos: se derivan de los ítems, no se hardcodean.
  const rubrosIncluidos = Object.keys(rubros);
  // Compatibilidad con resultados guardados antes del área computable (= bruta).
  const muroComputable =
    (result.geometria as { areaMuroComputableM2?: number }).areaMuroComputableM2 ??
    result.geometria.areaParedesBrutaM2;

  return (
    <>
      {/* Aviso de precios viejos: hubo cambios después del último cálculo. */}
      {preciosDesactualizados && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300/70 bg-amber-50 p-4 dark:bg-amber-950/30">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Los precios cambiaron desde tu último cálculo. Recalculá para ver la
            estimación con los valores actuales.
          </p>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="shadow-sm md:col-span-1">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Costo estimado de los materiales calculados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-primary">
              {formatMoney(result.totalGeneral)}
            </p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {Object.entries(result.subtotalesPorRubro).map(([rubro, subtotal]) => (
                <li key={rubro} className="flex justify-between gap-2">
                  <span>{rubro}</span>
                  <span className="font-mono">{formatMoney(subtotal)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
              Incluye: {rubrosIncluidos.join(" · ")}.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm md:col-span-3">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Geometría calculada
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
            <Dato etiqueta="Superficie planta" valor={`${formatQty(result.geometria.superficiePlantaM2)} m²`} />
            <Dato etiqueta="Perímetro" valor={`${formatQty(result.geometria.perimetroM)} m`} />
            <Dato etiqueta="Superficie techo" valor={`${formatQty(result.geometria.superficieTechoM2)} m²`} />
            <Dato etiqueta="Muros bruta" valor={`${formatQty(result.geometria.areaParedesBrutaM2)} m²`} />
            <Dato etiqueta="Aberturas" valor={`${formatQty(result.geometria.areaAberturasM2)} m²`} />
            <Dato etiqueta="Muro computable" valor={`${formatQty(muroComputable)} m²`} />
          </CardContent>
        </Card>
      </div>

      {/* Detalle por rubro */}
      {Object.entries(rubros).map(([rubro, items]) => (
        <section key={rubro} className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-3">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
              {rubro}
              {rubro === Rubro.BANOS && (
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-muted-foreground">
                  Estimación estándar por baño
                </span>
              )}
            </h2>
            {result.subtotalesPorRubro[rubro] !== undefined && (
              <span className="font-mono text-sm text-muted-foreground">
                {formatMoney(result.subtotalesPorRubro[rubro])}
              </span>
            )}
          </header>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Desperdicio</TableHead>
                <TableHead className="text-right">Precio unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={`${item.rubro}|${item.codigoMaterial}|${item.nombreMaterial}`}>
                  <TableCell className="font-medium">{item.nombreMaterial}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatQty(item.cantidadFinal)}{" "}
                    <span className="text-muted-foreground">{item.unidad}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {item.desperdicioPct > 0 ? `+${item.desperdicioPct}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.precioUnitario != null ? formatMoney(item.precioUnitario) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.subtotal != null ? formatMoney(item.subtotal) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}

      {/* Alcance del cálculo */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Alcance de esta estimación</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Mampostería y revoques sobre muros perimetrales (sin tabiques interiores).</li>
            <li>Las aberturas no reducen la mampostería; se cotizan en el rubro Aberturas.</li>
            <li>El baño es un paquete estándar, no surge de sus dimensiones.</li>
            <li>El techo no modela aleros, cumbrera ni babetas.</li>
            <li>Todavía fuera de cálculo: fundaciones, estructura, instalación eléctrica y sanitaria general, pintura y cocina.</li>
          </ul>
        </div>
      </div>

      {/* Advertencia */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-300/70 bg-amber-50 p-4 dark:bg-amber-950/30">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Esta estimación es orientativa y debe ser revisada por un albañil, Maestro Mayor
          de Obras o profesional antes de comprar materiales.
        </p>
      </div>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p className="mt-0.5 font-mono text-foreground">{valor}</p>
    </div>
  );
}
