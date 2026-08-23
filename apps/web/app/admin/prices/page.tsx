import Link from "next/link";
import { Upload } from "lucide-react";
import { getEffectivePrices, listPriceCollections } from "@casitacalc/db";
import { DEFAULT_REGION, REGION_LABELS, type RegionCode } from "@casitacalc/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const COLLECTION_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  VALIDATED: "bg-sky-100 text-sky-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
};

const COLLECTION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  VALIDATED: "Validada",
  PUBLISHED: "Publicada",
  REJECTED: "Rechazada",
  FAILED: "Fallida",
};

/** /admin/prices — precios vigentes e historial de relevamientos. */
export default async function AdminPricesPage() {
  let precios: Awaited<ReturnType<typeof getEffectivePrices>> = {};
  let colecciones: Awaited<ReturnType<typeof listPriceCollections>> = [];
  let dbError = false;
  try {
    [precios, colecciones] = await Promise.all([
      getEffectivePrices(DEFAULT_REGION),
      listPriceCollections(),
    ]);
  } catch {
    dbError = true;
  }

  const ordenados = Object.entries(precios).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Precios
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Precio efectivo por material para {REGION_LABELS[DEFAULT_REGION]}: el último
            relevamiento publicado pisa el precio base del catálogo. Nunca se usa un
            borrador automáticamente.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/prices/import">
            <Upload className="mr-2 size-4" /> Importar CSV
          </Link>
        </Button>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Relevamientos
        </h2>
        {dbError ? (
          <p className="mt-3 rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No hay conexión con la base de datos.
          </p>
        ) : colecciones.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Todavía no hay importaciones. Empezá subiendo un CSV normalizado.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Región</TableHead>
                  <TableHead>Relevado</TableHead>
                  <TableHead>Filas</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colecciones.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/prices/collections/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.filename}
                      </Link>
                    </TableCell>
                    <TableCell>{c.sourceName}</TableCell>
                    <TableCell>{c.region}</TableCell>
                    <TableCell>{formatDate(c.collectedAt)}</TableCell>
                    <TableCell>
                      {c.acceptedRows}/{c.totalRows}
                      {c.rejectedRows > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({c.rejectedRows} rechazadas)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLLECTION_STATUS_STYLES[c.status] ?? ""}`}
                      >
                        {COLLECTION_STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Precios vigentes
        </h2>
        {!dbError && (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Fecha del precio</TableHead>
                  <TableHead>Origen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenados.map(([codigo, info]) => (
                  <TableRow key={codigo}>
                    <TableCell className="font-mono text-xs">{codigo}</TableCell>
                    <TableCell>{formatMoney(info.precio)}</TableCell>
                    <TableCell>
                      {info.fuente ?? "—"}
                      {info.region ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          · {REGION_LABELS[info.region as RegionCode] ?? info.region}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{formatDate(info.fecha === new Date(0).toISOString() ? null : info.fecha)}</TableCell>
                    <TableCell>
                      {info.fromReferencePrice ? (
                        <Badge variant="default">Relevamiento</Badge>
                      ) : (
                        <Badge variant="secondary">Catálogo base</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
