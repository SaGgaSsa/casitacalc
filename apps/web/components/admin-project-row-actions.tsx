"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import type { ModerationStatus, ProjectVisibility } from "@casitacalc/shared";
import { Button } from "@/components/ui/button";

interface Props {
  projectId: string;
  visibility: ProjectVisibility;
  moderationStatus: ModerationStatus;
}

/** Acciones de administración sobre un proyecto de la tabla. */
export function AdminProjectRowActions({
  projectId,
  visibility,
  moderationStatus,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Error");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function eliminar() {
    if (!window.confirm("¿Eliminar este proyecto definitivamente?")) return;
    await enviar(`/api/admin/projects/${projectId}`, "DELETE");
  }

  const selectClass =
    "h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {moderationStatus === "PENDING" && (
        <>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void enviar(`/api/admin/projects/${projectId}/moderation`, "PATCH", {
                moderationStatus: "APPROVED",
              })
            }
          >
            <Check className="size-3.5" />
            Aprobar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void enviar(`/api/admin/projects/${projectId}/moderation`, "PATCH", {
                moderationStatus: "REJECTED",
              })
            }
          >
            <X className="size-3.5" />
            Rechazar
          </Button>
        </>
      )}

      <select
        aria-label="Cambiar visibilidad"
        className={selectClass}
        value={visibility}
        disabled={busy}
        onChange={(e) =>
          void enviar(`/api/admin/projects/${projectId}/visibility`, "PATCH", {
            visibility: e.target.value,
          })
        }
      >
        <option value="PRIVATE">Privado</option>
        <option value="UNLISTED">Compartido</option>
        <option value="PUBLIC">Público</option>
      </select>

      <select
        aria-label="Cambiar moderación"
        className={selectClass}
        value={moderationStatus}
        disabled={busy}
        onChange={(e) =>
          void enviar(`/api/admin/projects/${projectId}/moderation`, "PATCH", {
            moderationStatus: e.target.value,
          })
        }
      >
        <option value="NONE">Sin solicitar</option>
        <option value="PENDING">Pendiente</option>
        <option value="APPROVED">Aprobado</option>
        <option value="REJECTED">Rechazado</option>
      </select>

      <Button
        size="icon"
        variant="ghost"
        disabled={busy}
        onClick={() => void eliminar()}
        aria-label="Eliminar proyecto"
        className="text-destructive hover:text-destructive/80"
      >
        <Trash2 className="size-4" />
      </Button>

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
