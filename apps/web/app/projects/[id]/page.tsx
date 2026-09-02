import Link from "next/link";
import { ArrowLeft, PencilLine, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecalculateButton } from "@/components/recalculate-button";
import { ProjectSharePanel } from "@/components/project-share-panel";
import { getProjectFull, getLatestResult } from "@casitacalc/db";
import { MODERATION_LABELS, VISIBILITY_LABELS } from "@casitacalc/shared";
import { formatMoney } from "@/lib/format";
import { resumenAberturas } from "@/lib/aberturas";
import { getAnonymousVisitor } from "@/lib/visitor-server";
import { getAdminSession } from "@/lib/admin";

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

  // Ownership en servidor: solo el dueño (o un admin) abre el proyecto acá.
  const [visitor, admin] = await Promise.all([getAnonymousVisitor(), getAdminSession()]);
  const esDueno =
    visitor !== null && visitor.ownerTokenHash === project.ownerTokenHash;

  if (!esDueno && !admin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <TriangleAlert className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 font-heading text-xl font-semibold text-foreground">
          Este proyecto no te pertenece
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Los proyectos se asocian a la cookie de este navegador.
        </p>
        <Button asChild className="mt-6">
          <Link href="/projects">Ir a mis proyectos</Link>
        </Button>
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
        Mis proyectos
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {project.nombreProyecto}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={project.visibility === "PRIVATE" ? "outline" : "secondary"}>
              {VISIBILITY_LABELS[project.visibility]}
            </Badge>
            {project.moderationStatus !== "NONE" && (
              <Badge
                variant={
                  project.moderationStatus === "APPROVED" ||
                  project.moderationStatus === "PENDING"
                    ? "default"
                    : "destructive"
                }
              >
                <ShieldCheck className="size-3" />
                {MODERATION_LABELS[project.moderationStatus]}
              </Badge>
            )}
          </div>
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
          <Dato etiqueta="Aberturas" valor={resumenAberturas(project.openings)} />
        </CardContent>
      </Card>

      {/* Compartir y publicación */}
      <div className="mt-6">
        <ProjectSharePanel
          projectId={project.id}
          visibility={project.visibility}
          moderationStatus={project.moderationStatus}
          shareToken={project.shareToken}
        />
      </div>

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
                Estimación del costo de los materiales calculados.
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
