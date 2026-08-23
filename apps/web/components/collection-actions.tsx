"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Publicar / rechazar / recalcular sobre una colección. */
export function CollectionActions({
  collectionId,
  status,
}: {
  collectionId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accion(nombre: "publish" | "reject" | "recalculate") {
    setBusy(nombre);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prices/collections/${collectionId}/${nombre}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No se pudo completar la acción");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {status !== "PUBLISHED" && status !== "REJECTED" && (
          <>
            <Button onClick={() => accion("publish")} disabled={busy !== null}>
              {busy === "publish" ? (
                <RefreshCw className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 size-4" />
              )}
              Publicar
            </Button>
            <Button
              variant="outline"
              onClick={() => accion("recalculate")}
              disabled={busy !== null}
            >
              <RefreshCw className="mr-2 size-4" />
              Recalcular mediana
            </Button>
            <Button
              variant="destructive"
              onClick={() => accion("reject")}
              disabled={busy !== null}
            >
              <XCircle className="mr-2 size-4" />
              Rechazar
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
