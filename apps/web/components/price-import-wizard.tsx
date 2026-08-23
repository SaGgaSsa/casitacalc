"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import type {
  PriceImportPreview,
  PriceImportPreviewProposal,
} from "@casitacalc/db";
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

const MAX_BYTES = 2 * 1024 * 1024;

const STATUS_LABELS: Record<string, string> = {
  VALID: "Válida",
  WARNING: "Warning",
  INVALID: "Inválida",
};

const STATUS_STYLES: Record<string, string> = {
  VALID: "bg-emerald-100 text-emerald-800",
  WARNING: "bg-amber-100 text-amber-800",
  INVALID: "bg-red-100 text-red-700",
};

export function PriceImportWizard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PriceImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function seleccionar(selected: File | null) {
    setError(null);
    setPreview(null);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Solo se aceptan archivos .csv");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("El archivo supera el límite de 2 MB");
      return;
    }
    setFile(selected);
  }

  async function hacerPreview() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const content = await file.text();
      const res = await fetch("/api/admin/prices/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo procesar el archivo");
        return;
      }
      setPreview(data as PriceImportPreview);
    } catch {
      setError("No se pudo leer el archivo");
    } finally {
      setLoading(false);
    }
  }

  async function confirmar() {
    if (!file || !preview) return;
    setConfirming(true);
    setError(null);
    try {
      const content = await file.text();
      const res = await fetch("/api/admin/prices/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo importar");
        return;
      }
      router.push(`/admin/prices/collections/${data.id}`);
    } catch {
      setError("No se pudo importar el archivo");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-card p-6">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => seleccionar(e.target.files?.[0] ?? null)}
        />
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <FileUp className="mr-2 size-4" /> Elegir archivo CSV
        </Button>
        {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
        <Button onClick={hacerPreview} disabled={!file || loading}>
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Validar
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {preview && (
        <div className="mt-6 space-y-6">
          {/* Resumen */}
          <div className="rounded-lg border border-border bg-card p-5">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-3">
              <Info label="Archivo" value={preview.filename} />
              <Info label="Fuentes" value={preview.sources.join(", ") || "—"} />
              <Info label="Región" value={preview.region} />
              <Info
                label="Fecha de relevamiento"
                value={
                  preview.collectedAtMin
                    ? `${formatDate(preview.collectedAtMin)} → ${formatDate(preview.collectedAtMax)}`
                    : "—"
                }
              />
              <Info label="Filas" value={String(preview.totalRows)} />
              <Info
                label="Resultado"
                value={`${preview.validRows} válidas · ${preview.warningRows} warnings · ${preview.invalidRows} inválidas`}
              />
            </dl>
            {preview.parseErrors.length > 0 && (
              <p className="mt-3 text-xs text-destructive">
                {preview.parseErrors.length} líneas con errores de estructura fueron ignoradas.
              </p>
            )}
            {preview.warnings.length > 0 && (
              <p className="mt-3 text-xs text-amber-700">
                {preview.warnings.length} materiales con muestras insuficientes quedan en borrador para revisión.
              </p>
            )}
            <div className="mt-4">
              <Button onClick={confirmar} disabled={preview.validRows === 0 || confirming}>
                {confirming ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Confirmar importación ({preview.validRows} observaciones)
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Se crea un relevamiento en borrador; la publicación es manual.
              </p>
            </div>
          </div>

          {/* Propuestas de precio de referencia */}
          {preview.proposals.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Precios de referencia propuestos (mediana)
              </h2>
              <ProposalsTable proposals={preview.proposals} />
            </section>
          )}

          {/* Filas del archivo */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Filas del archivo
            </h2>
            <RowsTable rows={preview.rows} />
          </section>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ProposalsTable({ proposals }: { proposals: PriceImportPreviewProposal[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Muestras</TableHead>
            <TableHead>Mediana</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((p) => (
            <TableRow key={p.materialCode}>
              <TableCell className="font-mono text-xs">{p.materialCode}</TableCell>
              <TableCell>{p.materialNombre}</TableCell>
              <TableCell>{p.sampleSize}</TableCell>
              <TableCell>{p.medianPrice !== null ? formatMoney(p.medianPrice) : "—"}</TableCell>
              <TableCell>
                {p.insufficientSample ? (
                  <Badge variant="outline" className="border-amber-400 text-amber-700">
                    Muestras insuficientes
                  </Badge>
                ) : (
                  <Badge variant="default">OK</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type PreviewRow = PriceImportPreview["rows"][number];

function RowsTable({ rows }: { rows: PreviewRow[] }) {
  const invalidasPrimero = [...rows].sort((a, b) =>
    a.status === b.status ? a.line - b.line : a.status === "INVALID" ? -1 : b.status === "INVALID" ? 1 : 0,
  );
  return (
    <div className="max-h-[480px] overflow-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Precio bruto</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Precio normalizado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invalidasPrimero.map((row) => (
            <TableRow key={row.line}>
              <TableCell className="text-xs text-muted-foreground">{row.line}</TableCell>
              <TableCell className="font-mono text-xs">{row.materialCode ?? "—"}</TableCell>
              <TableCell className="max-w-[280px] truncate" title={row.title}>
                {row.title || "—"}
              </TableCell>
              <TableCell>{row.rawPrice !== null ? formatMoney(row.rawPrice) : "—"}</TableCell>
              <TableCell>
                {row.packageQuantity !== null ? `${row.packageQuantity} × ${row.packageUnit}` : "—"}
              </TableCell>
              <TableCell>
                {row.normalizedUnitPrice !== null ? formatMoney(row.normalizedUnitPrice) : "—"}
              </TableCell>
              <TableCell>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}
                >
                  {STATUS_LABELS[row.status]}
                </span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.message ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
