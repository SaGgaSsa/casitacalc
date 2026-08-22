import Link from "next/link";
import { ArrowLeft, PencilLine, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecalculateButton } from "@/components/recalculate-button";
import { getProjectFull, getLatestResult } from "@casitacalc/db";
import { formatMoney } from "@/lib/format";

export default async function ProjectDetailPage({
  params,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const project = await getProjectFull(id);

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

  const result = await getLatestResult(id);
  const sup = Number(project.anchoM) * Number(project.largoM);
  const sistema = project.sistemaConstructivo.replace(/_/g, " ").toLowerCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Proyectos
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {project.nombreProyecto}
          </h1>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">ID: {project.id}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/projects/${id}/edit`}>
              <PencilLine className="size-4" />
              Editar
            </Link>
          </Button>
          <RecalculateButton projectId={id} />
        </div>
      </div>

      {/* Datos */}
      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Datos de la vivienda</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <Dato etiqueta="Superficie" valor={`${sup.toLocaleString("es-AR")} m²`} />
          <Dato etiqueta="Sistema constructivo" valor={sistema} />
          <Dato
            etiqueta="Techo"
            valor={`${project.tipoTecho === "CHAPA" ? "Chapa" : "Losa"}${
              project.tipoTecho === "CHAPA" ? ` (${Number(project.anguloTechoGrados)}°)` : ""
            }`}
          />
          <Dato etiqueta="Altura de paredes" valor={`${Number(project.alturaParedesM)} m`} />
          <Dato etiqueta="Baños" valor={String(project.cantidadBanios)} />
          <Dato etiqueta="Aberturas" valor={String(project.openings.length)} />
        </CardContent>
      </Card>

      {/* Último resultado */}
      <div className="mt-6">
        {result ? (
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Último cálculo</CardTitle>
              <Button asChild variant="ghost" size="sm" className="uppercase text-primary">
                <Link href={`/projects/${id}/result`}>Ver detalle completo</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-bold text-primary">
                {formatMoney(result.totalGeneral)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Estimación de costo de materiales.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <TriangleAlert className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Todavía no calculaste los materiales de este proyecto.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Usá el botón «Recalcular materiales» de arriba para generarlo con las recetas
              y precios actuales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p className="mt-0.5 capitalize text-foreground">{valor}</p>
    </div>
  );
}
