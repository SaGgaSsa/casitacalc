import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCollectionDetail } from "@casitacalc/db";
import { CollectionActions } from "@/components/collection-actions";
import { ReferenceTable } from "@/components/reference-table";
import { ObservationsTable } from "@/components/observations-table";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** /admin/prices/collections/[id] — revisión y publicación del relevamiento. */
export default async function PriceCollectionPage({
  params,
}: PageProps<"/admin/prices/collections/[id]">) {
  const { id } = await params;
  const collection = await getCollectionDetail(id);
  if (!collection) notFound();

  return (
    <div>
      <Link
        href="/admin/prices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Precios
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {collection.filename}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {collection.sourceName} · Región {collection.region} · Relevado{" "}
            {formatDate(collection.collectedAt)} · Importado {formatDate(collection.importedAt)}
            {collection.createdBy ? ` por ${collection.createdBy}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {collection.acceptedRows} observaciones aceptadas de {collection.totalRows} filas
            ({collection.rejectedRows} rechazadas).
          </p>
        </div>
        <CollectionActions
          collectionId={collection.id}
          status={collection.status}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Precios de referencia
        </h2>
        {collection.references.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No hay precios de referencia para esta colección.
          </p>
        ) : (
          <ReferenceTable references={collection.references} />
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Observaciones
        </h2>
        {collection.observations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No se persistieron observaciones.
          </p>
        ) : (
          <ObservationsTable observations={collection.observations} />
        )}
      </section>
    </div>
  );
}
