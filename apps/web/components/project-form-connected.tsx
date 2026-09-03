"use client";

import { useRouter } from "next/navigation";
import { ProjectForm } from "@/components/project-form";
import type { HouseInput } from "@casitacalc/shared";

const DEFAULTS_NUEVO: HouseInput = {
  nombreProyecto: "",
  anchoM: 8,
  largoM: 10,
  alturaParedesM: 2.7,
  sistemaConstructivo: "LADRILLO_HUECO",
  tipoTecho: "CHAPA",
  anguloTechoGrados: 20,
  cantidadBanios: 1,
  aberturas: [{ tipo: "VENTANA", cantidad: 2 }],
};

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      error?: string;
      issues?: { fieldErrors?: Record<string, string[]> };
    };
    const firstField = Object.values(data.issues?.fieldErrors ?? {})[0]?.[0];
    return firstField ?? data.error ?? "Error inesperado";
  } catch {
    return "Error inesperado";
  }
}

/** Formulario de alta: crea el proyecto y calcula automáticamente. */
export function NewProjectForm() {
  const router = useRouter();

  return (
    <ProjectForm
      defaultValues={DEFAULTS_NUEVO}
      submitLabel="Calcular materiales"
      onSubmit={async (values) => {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proyecto: values }),
        });
        if (!res.ok) throw new Error(await parseError(res));
        const { id } = (await res.json()) as { id: string };

        const calc = await fetch(`/api/projects/${id}/calculate`, { method: "POST" });
        if (!calc.ok) throw new Error(await parseError(calc));

        router.push(`/projects/${id}/result`);
      }}
    />
  );
}

interface EditProps {
  projectId: string;
  defaultValues: HouseInput;
}

export function EditProjectForm({ projectId, defaultValues }: EditProps) {
  const router = useRouter();

  return (
    <ProjectForm
      defaultValues={defaultValues}
      submitLabel="Guardar cambios"
      onSubmit={async (values) => {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proyecto: values }),
        });
        if (!res.ok) throw new Error(await parseError(res));

        // Los datos cambiaron: recalculá para mantener el resultado al día.
        await fetch(`/api/projects/${projectId}/calculate`, { method: "POST" });
        router.push(`/projects/${projectId}/result`);
      }}
    />
  );
}
