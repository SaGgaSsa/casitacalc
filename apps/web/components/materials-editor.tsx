"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PencilLine, X } from "lucide-react";
import type { Material } from "@casitacalc/shared";
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
import { formatMoney, formatDate } from "@/lib/format";

export function MaterialsEditor({ materials }: { materials: Material[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todas");

  const categorias = useMemo(
    () => ["Todas", ...Array.from(new Set(materials.map((m) => m.categoria)))],
    [materials],
  );
  const visibles =
    filtroCategoria === "Todas"
      ? materials
      : materials.filter((m) => m.categoria === filtroCategoria);

  async function guardar(material: Material) {
    const precio = Number(draft.replace(",", "."));
    if (Number.isNaN(precio) || precio < 0) {
      setError("Ingresá un precio válido");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/materials/${material.id}/price`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precio }),
      });
      if (!res.ok) throw new Error("No se pudo guardar");
      setEditingId(null);
      router.refresh();
    } catch {
      setError("No se pudo guardar el precio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Filtro por categoría */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltroCategoria(cat)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filtroCategoria === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead>Material</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead className="w-24 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{m.categoria}</TableCell>
                <TableCell>
                  {editingId === m.id ? (
                    <Input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      inputMode="decimal"
                      className="w-36 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void guardar(m);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span className="font-mono text-sm">{formatMoney(m.precioActual)}</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  / {m.unidad}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(m.fechaActualizacionPrecio)}
                  {m.fuente ? ` · ${m.fuente}` : ""}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === m.id ? (
                    <span className="inline-flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => void guardar(m)}
                        aria-label="Guardar"
                        className="text-primary hover:text-primary/80"
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => setEditingId(null)}
                        aria-label="Cancelar"
                        className="text-muted-foreground"
                      >
                        <X className="size-4" />
                      </Button>
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(m.id);
                        setDraft(String(m.precioActual));
                        setError(null);
                      }}
                    >
                      <PencilLine className="size-3.5" />
                      Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Los precios se guardan por proyecto de forma inmediata y se aplican a los próximos
        cálculos. Ajustalos según tu proveedor o zona.
      </p>
    </div>
  );
}
