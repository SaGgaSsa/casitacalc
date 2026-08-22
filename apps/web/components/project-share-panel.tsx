"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Globe,
  Link2,
  Link2Off,
  SendHorizonal,
} from "lucide-react";
import type { ModerationStatus, ProjectVisibility } from "@casitacalc/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  projectId: string;
  visibility: ProjectVisibility;
  moderationStatus: ModerationStatus;
  shareToken: string | null;
}

const subscribeNoop = () => () => {};

/** Evita mismatch de hidratación para URLs que dependen de window.location. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/**
 * Acciones de dueño sobre visibilidad y publicación:
 * compartir por link y solicitar publicación pública.
 */
export function ProjectSharePanel({
  projectId,
  visibility,
  moderationStatus,
  shareToken,
}: Props) {
  const router = useRouter();
  const isClient = useIsClient();
  const [activeToken, setActiveToken] = useState<string | null>(
    visibility === "UNLISTED" ? shareToken : null,
  );
  const [copiado, setCopiado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ruta = activeToken ? `/share/${activeToken}` : null;
  const shareUrl =
    ruta === null ? null : isClient ? `${window.location.origin}${ruta}` : ruta;

  async function accion(fn: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo completar la acción");
        return;
      }
      return await res.json();
    } finally {
      setBusy(false);
    }
  }

  async function compartir() {
    const data = (await accion(() =>
      fetch(`/api/projects/${projectId}/share`, { method: "POST" }),
    )) as { shareUrl?: string } | undefined;
    if (data?.shareUrl) {
      const token = data.shareUrl.split("/").pop() ?? null;
      setActiveToken(token);
    }
    router.refresh();
  }

  async function dejarDeCompartir() {
    await accion(() => fetch(`/api/projects/${projectId}/share`, { method: "DELETE" }));
    setActiveToken(null);
    setCopiado(false);
    router.refresh();
  }

  async function solicitarPublicacion() {
    await accion(() =>
      fetch(`/api/projects/${projectId}/request-publication`, { method: "POST" }),
    );
    router.refresh();
  }

  async function copiar() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar el enlace");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Compartir</p>
        <div className="flex gap-2">
          {visibility !== "UNLISTED" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void compartir()}>
              <Link2 className="size-3.5" />
              Compartir por link
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void dejarDeCompartir()}
            >
              <Link2Off className="size-3.5" />
              Dejar de compartir
            </Button>
          )}
        </div>
      </div>

      {visibility === "UNLISTED" && shareUrl && (
        <div className="mt-3 flex gap-2">
          <Input readOnly value={shareUrl} className="h-8 font-mono text-xs" />
          <Button size="sm" variant="secondary" onClick={() => void copiar()}>
            {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>
      )}

      {visibility === "UNLISTED" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Cualquiera con este enlace puede ver el proyecto, sin poder modificarlo.
        </p>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Globe className="size-3.5" />
            Publicación en la galería pública
          </p>
          {moderationStatus === "NONE" || moderationStatus === "REJECTED" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void solicitarPublicacion()}
            >
              <SendHorizonal className="size-3.5" />
              Solicitar publicación
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {moderationStatus === "PENDING"
                ? "Esperando aprobación de administración"
                : "Aprobado: visible públicamente"}
            </span>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
