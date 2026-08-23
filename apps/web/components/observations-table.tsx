"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";

interface ObservationRow {
  id: string;
  materialCodigo: string;
  materialNombre: string;
  titulo: string;
  url: string;
  fuente: string;
  rawPrice: number;
  packageQuantity: number;
  packageUnit: string;
  normalizedUnitPrice: number;
  normalizedUnit: string;
  accepted: boolean;
  rejectionReason: string | null;
}

/** Evidencia cruda del relevamiento, con exclusión manual. */
export function ObservationsTable({ observations }: { observations: ObservationRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function excluir(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prices/observations/${id}/exclude`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("No se pudo excluir la observación");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <div className="max-h-[560px] overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Precio bruto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Normalizado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {observations.map((o) => (
              <TableRow key={o.id} className={o.accepted ? "" : "opacity-60"}>
                <TableCell className="font-mono text-xs">{o.materialCodigo}</TableCell>
                <TableCell className="max-w-[240px]">
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate hover:underline"
                    title={o.titulo}
                  >
                    {o.titulo}
                  </a>
                </TableCell>
                <TableCell>{o.fuente}</TableCell>
                <TableCell>{formatMoney(o.rawPrice)}</TableCell>
                <TableCell>
                  {o.packageQuantity} × {o.packageUnit}
                </TableCell>
                <TableCell>
                  {formatMoney(o.normalizedUnitPrice)} / {o.normalizedUnit}
                </TableCell>
                <TableCell>
                  {o.accepted ? (
                    "Aceptada"
                  ) : (
                    <span className="text-xs text-destructive">{o.rejectionReason ?? "Rechazada"}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {o.accepted && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => excluir(o.id)}
                      disabled={busyId !== null}
                      title="Excluir de la mediana y recalcular"
                    >
                      <Ban className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
