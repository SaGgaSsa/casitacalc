"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Material, PriceMap } from "@casitacalc/shared";
import { formatMoney, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortKey = "nombre-asc" | "nombre-desc" | "precio-asc" | "precio-desc";

const SORT_LABELS: Record<SortKey, string> = {
  "nombre-asc": "Nombre (A-Z)",
  "nombre-desc": "Nombre (Z-A)",
  "precio-asc": "Precio (menor a mayor)",
  "precio-desc": "Precio (mayor a menor)",
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function MaterialsExplorer({
  materials,
  priceMap,
}: {
  materials: Material[];
  priceMap: PriceMap;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");
  const [orden, setOrden] = useState<SortKey>("nombre-asc");

  const categorias = useMemo(
    () =>
      Array.from(new Set(materials.map((m) => m.categoria))).sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [materials],
  );

  const filtrados = useMemo(() => {
    const consulta = normalizar(busqueda.trim());
    const lista = materials.filter((m) => {
      if (categoria !== "todas" && m.categoria !== categoria) return false;
      if (!consulta) return true;
      return (
        normalizar(m.nombre).includes(consulta) ||
        normalizar(m.codigo).includes(consulta)
      );
    });

    return [...lista].sort((a, b) => {
      switch (orden) {
        case "nombre-asc":
          return a.nombre.localeCompare(b.nombre, "es");
        case "nombre-desc":
          return b.nombre.localeCompare(a.nombre, "es");
        case "precio-asc":
          return (priceMap[a.codigo] ?? a.precioActual) - (priceMap[b.codigo] ?? b.precioActual);
        case "precio-desc":
          return (priceMap[b.codigo] ?? b.precioActual) - (priceMap[a.codigo] ?? a.precioActual);
      }
    });
  }, [materials, priceMap, busqueda, categoria, orden]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="pl-9"
            aria-label="Buscar materiales"
          />
        </div>
        <Select value={orden} onValueChange={(v) => setOrden(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Ordenar por">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[{ key: "todas", label: `Todas (${materials.length})` }, ...categorias.map((c) => ({
          key: c,
          label: c,
        }))].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setCategoria(item.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              categoria === item.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {filtrados.length} de {materials.length} materiales
      </p>

      <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead>Material</TableHead>
              <TableHead className="hidden md:table-cell">Código</TableHead>
              <TableHead className="hidden sm:table-cell">Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Precio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No hay materiales que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nombre}</TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {m.codigo}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {m.categoria}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {m.unidad}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {formatMoney(priceMap[m.codigo] ?? m.precioActual)}
                      <span className="ml-1 font-sans text-[11px] font-normal text-muted-foreground">
                        / {m.unidad}
                      </span>
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Act.: {formatDate(m.fechaActualizacionPrecio)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
