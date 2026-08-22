import { NewProjectForm } from "@/components/project-form-connected";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        Calcular una vivienda
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ingresá las características de la vivienda para obtener el cómputo de materiales.
      </p>

      <div className="mt-6">
        <NewProjectForm />
      </div>
    </div>
  );
}
