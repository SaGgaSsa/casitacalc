"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PencilLine, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";

interface ReferenceRow {
  id: string;
  materialCodigo: string;
  materialNombre: string;
  unidad: string;
  fuente: string;
  sampleSize: number;
  insufficientSample: boolean;
  usadas: number;
  rechazadas: number;
  precioPropuesto: number;
  estado: string;
}

/** Tabla de precios de referencia con edición y rechazo individual. */
export function ReferenceTable({ references }: { references: ReferenceRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardarPrecio(id: string) {
    const precio = Number(draft.replace(",", "."));
    if (!Number.isFinite(precio) || precio <= 0) {
      setError("Ingresá un precio válido");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prices/references/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precio }),
      });
      if (!res.ok) {
        setError("No se pudo guardar el precio");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function rechazar(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/prices/references/${id}`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const estadoBadge = (estado: string, insuficiente: boolean) => {
    if (estado === "PUBLISHED") return <Badge variant="default">Publicado</Badge>;
    if (estado === "REJECTED") return <Badge variant="destructive">Rechazado</Badge>;
    if (insuficiente)
      return (
        <Badge variant="outline" className="border-amber-400 text-amber-700">
          Borrador · muestras insuficientes
        </Badge>
      );
    return <Badge variant="secondary">Borrador</Badge>;
  };

  return (
    <div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Muestras</TableHead>
              <TableHead>Mediana</TableHead>
              <TableHead>Usadas</TableHead>
              <TableHead>Rechazadas</TableHead>
              <TableHead>Precio propuesto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {references.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <span className="block font-medium">{r.materialNombre}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.materialCodigo}
                  </span>
                </TableCell>
                <TableCell>{r.fuente}</TableCell>
                <TableCell>{r.sampleSize}</TableCell>
                <TableCell>{formatMoney(r.precioPropuesto)}</TableCell>
                <TableCell>{r.usadas}</TableCell>
                <TableCell>{r.rechazadas}</TableCell>
                <TableCell>
                  {editingId === r.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        inputMode="decimal"
                        className="h-8 w-28"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") guardarPrecio(r.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => guardarPrecio(r.id)}
                        disabled={busy}
                      >
                        <Check className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    formatMoney(r.precioPropuesto)
                  )}
                </TableCell>
                <TableCell>{estadoBadge(r.estado, r.insufficientSample)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {r.estado !== "REJECTED" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(r.id);
                            setDraft(String(r.precioPropuesto));
                          }}
                        >
                          <PencilLine className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => rechazar(r.id)}
                          disabled={busy}
                        >
                          <XCircle className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
