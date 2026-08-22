import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecalculateButton } from "@/components/recalculate-button";
import { ResultView } from "@/components/result-view";
import { getProjectFull, getLatestResult } from "@casitacalc/db";
import { getAnonymousVisitor } from "@/lib/visitor-server";

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

  // Solo el dueño ve el cómputo desde acá (los compartidos usan /share/[token]).
  const visitor = await getAnonymousVisitor();
  if (!visitor || visitor.ownerTokenHash !== project.ownerTokenHash) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <TriangleAlert className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 font-heading text-xl font-semibold text-foreground">
          Este proyecto no te pertenece
        </h1>
        <Link href="/projects" className="mt-4 inline-block text-sm text-primary hover:underline">
          Ir a mis proyectos
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver al proyecto
      </Link>

      <div className="mb-6 mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Cómputo de materiales
          </h1>
          <p className="text-sm capitalize text-muted-foreground">{project.nombreProyecto}</p>
        </div>
        <RecalculateButton projectId={id} />
      </div>

      <ResultView result={result} />
    </div>
  );
}
