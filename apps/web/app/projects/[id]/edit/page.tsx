import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditProjectForm } from "@/components/project-form-connected";
import { getProjectHouseInput } from "@casitacalc/db";

export default async function EditProjectPage({
  params,
}: PageProps<"/projects/[id]/edit">) {
  const { id } = await params;
  const house = await getProjectHouseInput(id);

  if (!house) {
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver al proyecto
      </Link>
      <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">
        Editar proyecto
      </h1>

      <div className="mt-6">
        <EditProjectForm projectId={id} defaultValues={house} />
      </div>
    </div>
  );
}
