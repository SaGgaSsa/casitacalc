"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PencilLine, X } from "lucide-react";
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

export interface MaterialMeta {
  nombre: string;
  unidad: string;
}

interface Row {
  codigoMaterial: string;
  nombre: string;
  unidad: string;
  cantidadPorUnidad: string;
  desperdicioPct: string;
}

interface Props {
  recipes: {
    codigo: string;
    rubro: string;
    detalle: string;
    items: Row[];
  }[];
}

export function RecipesEditor({ recipes }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function empezarEdicion(receta: (typeof recipes)[number]) {
    setEditing(receta.codigo);
    setError(null);
    setDrafts(receta.items.map((i) => ({ ...i })));
  }

  function actualizar(index: number, campo: "cantidadPorUnidad" | "desperdicioPct", valor: string) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, [campo]: valor } : d)));
  }

  async function guardar(codigo: string) {
    const items = drafts.map((d) => ({
      codigoMaterial: d.codigoMaterial,
      cantidadPorUnidad: Number(d.cantidadPorUnidad.replace(",", ".")),
      desperdicioPct: Number(d.desperdicioPct.replace(",", ".")),
    }));

    if (
      items.some((i) => Number.isNaN(i.cantidadPorUnidad) || i.cantidadPorUnidad <= 0) ||
      items.some((i) => Number.isNaN(i.desperdicioPct) || i.desperdicioPct < 0 || i.desperdicioPct > 100)
    ) {
      setError("Revisá las cantidades ingresadas");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${codigo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error();
      setEditing(null);
      router.refresh();
    } catch {
      setError("No se pudo guardar la receta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {recipes.map((receta) => {
        const isEditing = editing === receta.codigo;
        const rows = isEditing ? drafts : receta.items;

        return (
          <section
            key={receta.codigo}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-6 py-3">
              <div>
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
                  {receta.rubro}
                </h2>
                <p className="text-xs capitalize text-muted-foreground">{receta.detalle}</p>
              </div>
              {isEditing ? (
                <span className="flex gap-1">
                  <Button size="sm" disabled={saving} onClick={() => void guardar(receta.codigo)}>
                    <Check className="size-4" />
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditing(null)}>
                    <X className="size-4" />
                    Cancelar
                  </Button>
                </span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => empezarEdicion(receta)}>
                  <PencilLine className="size-3.5" />
                  Editar receta
                </Button>
              )}
            </header>

            {isEditing && error && (
              <p className="border-b border-destructive/30 bg-destructive/5 px-6 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="w-44 text-right">Cant. por unidad base</TableHead>
                  <TableHead className="w-36 text-right">Desperdicio (%)</TableHead>
                  <TableHead className="w-16" aria-label="Unidad" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.codigoMaterial}>
                    <TableCell className="font-medium">{row.nombre}</TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          value={row.cantidadPorUnidad}
                          onChange={(e) =>
                            actualizar(index, "cantidadPorUnidad", e.target.value)
                          }
                          inputMode="decimal"
                          className="ml-auto w-28 text-right font-mono"
                        />
                      ) : (
                        <span className="font-mono text-sm">
                          {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(
                            Number(row.cantidadPorUnidad),
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          value={row.desperdicioPct}
                          onChange={(e) => actualizar(index, "desperdicioPct", e.target.value)}
                          inputMode="decimal"
                          className="ml-auto w-24 text-right font-mono"
                        />
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                          +{row.desperdicioPct}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      / {row.unidad}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <footer className="border-t border-border/60 bg-muted/20 px-6 py-2 text-xs text-muted-foreground">
              Unidades base: muro = 1 m² neto · techo = 1 m² de cubierta · baños = 1 baño completo.
            </footer>
          </section>
        );
      })}
    </div>
  );
}
