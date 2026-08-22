import type { Metadata } from "next";
import type { PriceMap } from "@casitacalc/shared";
import { getPriceMap, listMaterials } from "@casitacalc/db";
import { MaterialsExplorer } from "@/components/materials-explorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Materiales · CasitaCalc",
};

async function loadCatalogo() {
  try {
    const [materiales, priceMap] = await Promise.all([
      listMaterials(),
      getPriceMap(),
    ]);
    return { dbError: false as const, materiales, priceMap };
  } catch {
    return {
      dbError: true as const,
      materiales: [],
      priceMap: {} as PriceMap,
    };
  }
}

/** /materials — catálogo público de precios con búsqueda y filtros. */
export default async function MaterialsPage() {
  const data = await loadCatalogo();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Materiales y precios
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">
          Catálogo global con los precios usados en los cálculos. Buscá,
          filtrá por categoría y ordená a tu gusto.
        </p>
      </div>

      <div className="mt-8">
        {data.dbError ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No hay conexión con la base de datos. Probá de nuevo en un rato.
          </p>
        ) : data.materiales.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Todavía no hay materiales en el catálogo.
          </p>
        ) : (
          <MaterialsExplorer materials={data.materiales} priceMap={data.priceMap} />
        )}
      </div>
    </div>
  );
}
