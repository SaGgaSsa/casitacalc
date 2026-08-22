import Link from "next/link";
import { SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProjectSummaries } from "@casitacalc/db";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let projects: Awaited<ReturnType<typeof listProjectSummaries>> = [];
  let dbError = false;
  try {
    projects = await listProjectSummaries();
  } catch {
    dbError = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Proyectos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todos los proyectos calculados.
          </p>
        </div>
        <Button asChild className="uppercase">
          <Link href="/projects/new">
            <SquarePlus className="size-4" />
            Nuevo cálculo
          </Link>
        </Button>
      </div>

      {dbError ? (
        <p className="mt-10 rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay conexión con la base de datos.
        </p>
      ) : projects.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Todavía no creaste ningún proyecto
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Ingresá las características de una vivienda y obtené el listado detallado de
            materiales necesarios.
          </p>
          <Button asChild className="mt-6">
            <Link href="/projects/new">Crear primer cálculo</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead>Proyecto</TableHead>
                <TableHead className="text-right">Sup. (m²)</TableHead>
                <TableHead>Sistema constructivo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Costo estimado</TableHead>
                <TableHead className="w-20 text-center" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombreProyecto}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {new Intl.NumberFormat("es-AR").format(p.superficieM2)}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {p.sistemaConstructivo.replace(/_/g, " ").toLowerCase()}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
