import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { RecalculateButton } from "@/components/recalculate-button";
import { getProjectFull, getLatestResult } from "@casitacalc/db";
import { Rubro } from "@casitacalc/shared";
import { formatMoney, formatQty, formatDate } from "@/lib/format";

const ORDEN_RUBROS: string[] = [Rubro.MAMPOSTERIA, Rubro.TECHO, Rubro.BANOS];

export default async function ProjectResultPage({
  params,
}: PageProps<"/projects/[id]/result">) {
  const { id } = await params;
  const [project, result] = await Promise.all([getProjectFull(id), getLatestResult(id)]);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Proyecto no encontrado
        </h1>
        <Link href="/projects" className="mt-4 inline-block text-sm text-primary hover:underline">
          Ver todos los proyectos
        </Link>
      </div>
    );
  }

  if (!result || result.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <TriangleAlert className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 font-heading text-xl font-semibold text-foreground">
          Este proyecto todavía no tiene un cálculo
        </h1>
        <div className="mt-6 flex justify-center gap-2">
          <RecalculateButton projectId={id} />
          <Button asChild variant="outline">
            <Link href={`/projects/${id}`}>Ver proyecto</Link>
          </Button>
        </div>
      </div>
    );
  }

  const rubros = [...result.items]
    .sort(
      (a, b) =>
        (ORDEN_RUBROS.indexOf(a.rubro) + 1 || 99) - (ORDEN_RUBROS.indexOf(b.rubro) + 1 || 99),
    )
    .reduce<Record<string, typeof result.items>>((acc, item) => {
      (acc[item.rubro] ??= []).push(item);
      return acc;
    }, {});

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver al proyecto
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Cómputo de materiales
          </h1>
          <p className="text-sm capitalize text-muted-foreground">{project.nombreProyecto}</p>
        </div>
        <RecalculateButton projectId={id} />
      </div>

      {/* Resumen */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="shadow-sm md:col-span-1">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Costo total de materiales
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
            <Dato etiqueta="Aberturas" valor={`− ${formatQty(result.geometria.areaAberturasM2)} m²`} />
            <Dato etiqueta="Muro neto" valor={`${formatQty(result.geometria.areaParedesNetaM2)} m²`} />
          </CardContent>
        </Card>
      </div>

      {/* Detalle por rubro */}
      {Object.entries(rubros).map(([rubro, items]) => (
        <section key={rubro} className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-3">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
              {rubro}
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
                <TableRow key={item.codigoMaterial}>
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

      {/* Advertencia */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-300/70 bg-amber-50 p-4 dark:bg-amber-950/30">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Esta estimación es orientativa y debe ser revisada por un albañil, Maestro Mayor
          de Obras o profesional antes de comprar materiales.
        </p>
      </div>
    </div>
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
