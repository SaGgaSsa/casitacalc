import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  Globe,
  SquarePlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { getPriceMap, listApprovedPublicProjects, listMaterials, listProjectSummaries, countProjectsByOwner } from "@casitacalc/db";
import type { PriceMap } from "@casitacalc/shared";
import { formatMoney, formatDate } from "@/lib/format";
import { getAnonymousVisitor } from "@/lib/visitor-server";

const MATERIALES_DESTACADOS = [
  "LADRILLO_HUECO_18X18X33",
  "CEMENTO_PORTLAND_50KG",
  "CAL_HIDRATADA_25KG",
  "ARENA_GRUESA",
  "CHAPA_TRAPEZOIDAL_C25",
];

export const dynamic = "force-dynamic";

async function loadDashboard() {
  try {
    const visitor = await getAnonymousVisitor();
    const [proyectos, cantidadProyectos, proyectosPublicos, materiales, priceMap] =
      await Promise.all([
        visitor ? listProjectSummaries(visitor.ownerTokenHash, 5) : [],
        visitor ? countProjectsByOwner(visitor.ownerTokenHash) : 0,
        listApprovedPublicProjects(5),
        listMaterials(),
        getPriceMap(),
      ]);

    const destacados = MATERIALES_DESTACADOS.map((codigo) =>
      materiales.find((m) => m.codigo === codigo),
    ).filter((m) => m !== undefined);

    const fechasActualizacion = materiales
      .map((m) => m.fechaActualizacionPrecio)
      .filter((f): f is string => Boolean(f));
    const ultimaActualizacion =
      fechasActualizacion.length > 0
        ? Math.max(...fechasActualizacion.map((f) => new Date(f).getTime()))
        : null;

    return {
      dbError: false as const,
      cantidadProyectos,
      proyectos,
      proyectosPublicos,
      destacados,
      priceMap,
      ultimaActualizacion: ultimaActualizacion ? new Date(ultimaActualizacion).toISOString() : null,
    };
  } catch {
    return {
      dbError: true as const,
      cantidadProyectos: 0,
      proyectos: [],
      proyectosPublicos: [],
      destacados: [],
      priceMap: {} as PriceMap,
      ultimaActualizacion: null,
    };
  }
}

export default async function DashboardPage() {
  const data = await loadDashboard();
  const ultimoProyecto = data.proyectos[0];
  const sinProyectos = data.cantidadProyectos === 0;

  if (sinProyectos && data.proyectosPublicos.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-20">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Calculadora de materiales
        </h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          Calculá los materiales necesarios para construir tu vivienda con precios de
          referencia de Argentina. Sin registro: tus proyectos quedan guardados en este
          navegador.
        </p>

        <div className="mt-10 flex flex-col items-start gap-6 rounded-xl border border-border bg-card p-8 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {data.dbError ? "Conectando con la base de datos…" : "Empezá tu primer proyecto"}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Ingresá medidas, paredes, techo, aberturas y baños para obtener un cómputo
              detallado de materiales.
            </p>
          </div>
          <Button asChild size="lg" className="whitespace-nowrap">
            <Link href="/projects/new">
              Calcular una vivienda
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {!data.dbError && (
          <div className="mt-16 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
              Todavía no creaste ningún proyecto
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Ingresá las características de una vivienda y obtené el listado detallado
              de materiales necesarios.
            </p>
            <Button asChild className="mt-6">
              <Link href="/projects/new">
                <SquarePlus className="size-4" />
                Crear primer cálculo
              </Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      {/* Título */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Calculadora de materiales
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground md:text-base">
          Calculá los materiales necesarios para construir tu vivienda. Tus proyectos se
          guardan en este navegador sin necesidad de cuenta.
        </p>
      </div>

      {/* CTA principal */}
      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Calcular una vivienda
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
            Ingresá medidas, paredes, techo, aberturas y baños para obtener un cómputo
            detallado de materiales.
          </p>
        </div>
        <Button asChild size="lg" className="whitespace-nowrap uppercase">
          <Link href="/projects/new">
            <SquarePlus className="size-4" />
            Calcular una vivienda
          </Link>
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mis proyectos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold text-foreground">
              {data.cantidadProyectos}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Último cálculo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate font-medium text-foreground">
              {ultimoProyecto?.nombreProyecto ?? "—"}
            </p>
            <p className="mt-0.5 font-mono text-sm font-medium text-primary">
              {ultimoProyecto?.costoEstimado != null
                ? formatMoney(ultimoProyecto.costoEstimado)
                : "Sin calcular"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Precios de referencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-4" />
              Actualizados: {formatDate(data.ultimaActualizacion)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla + galería pública */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card className="gap-0 overflow-hidden py-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Mis proyectos
              </h3>
              <Button asChild variant="ghost" size="sm" className="uppercase text-primary">
                <Link href="/projects">Ver todos</Link>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead>Proyecto</TableHead>
                  <TableHead className="text-right">Sup. (m²)</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Costo estimado</TableHead>
                  <TableHead className="w-16 text-center" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.proyectos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Todavía no creaste ningún proyecto.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.proyectos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombreProyecto}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {new Intl.NumberFormat("es-AR").format(p.superficieM2)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatDate(p.fechaCreacion)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {p.costoEstimado != null ? formatMoney(p.costoEstimado) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button asChild variant="ghost" size="sm" className="text-primary">
                          <Link href={`/projects/${p.id}`}>Abrir</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {data.proyectosPublicos.length > 0 && (
            <Card className="mt-6 gap-0 overflow-hidden py-0 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-6 py-4">
                <Globe className="size-4 text-muted-foreground" />
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Proyectos públicos de la comunidad
                </h3>
              </div>
              <ul>
                {data.proyectosPublicos.map((p, index) => (
                  <li
                    key={p.id}
                    className={`flex flex-wrap items-center justify-between gap-2 px-6 py-3 ${
                      index < data.proyectosPublicos.length - 1 ? "border-b border-border/70" : ""
                    }`}
                  >
                    <div>
                      <span className="block text-sm font-medium capitalize text-foreground">
                        {p.nombreProyecto}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {new Intl.NumberFormat("es-AR").format(p.superficieM2)} m² ·{" "}
                        {formatDate(p.fechaCreacion)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {p.costoEstimado != null ? formatMoney(p.costoEstimado) : "—"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Panel lateral de precios (solo lectura para visitantes) */}
        <div className="lg:col-span-5">
          <Card className="gap-0 overflow-hidden py-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Precios de referencia
              </h3>
              <Badge variant="secondary">ARS</Badge>
            </div>
            <p className="border-b border-border bg-muted/40 px-6 py-3 text-xs text-muted-foreground">
              Valores promedio del catálogo global; los administra CasitaCalc.
            </p>
            <ul>
              {data.destacados.map((m, index) => (
                <li
                  key={m.codigo}
                  className={`flex items-center justify-between gap-3 px-6 py-3 ${
                    index < data.destacados.length - 1 ? "border-b border-border/70" : ""
                  }`}
                >
                  <div>
                    <span className="block text-sm font-medium text-foreground">
                      {m.nombre}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Act.: {formatDate(m.fechaActualizacionPrecio)}
                    </span>
                  </div>
                  <span className="text-right font-mono text-sm text-foreground">
                    {formatMoney(data.priceMap[m.codigo] ?? m.precioActual)}
                    <span className="block text-[11px] text-muted-foreground">/ {m.unidad}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
