import { RecipesEditor } from "@/components/recipes-editor";
import { listMaterials, listRecipes } from "@casitacalc/db";
import type { MaterialMeta } from "@/components/recipes-editor";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  let recipes: Awaited<ReturnType<typeof listRecipes>> = [];
  let materials: Awaited<ReturnType<typeof listMaterials>> = [];
  let dbError = false;
  try {
    [recipes, materials] = await Promise.all([listRecipes(), listMaterials()]);
  } catch {
    dbError = true;
  }

  const meta: Record<string, MaterialMeta> = Object.fromEntries(
    materials.map((m) => [m.codigo, { nombre: m.nombre, unidad: m.unidad }]),
  );

  const recetasParaUI = recipes.map((r) => ({
    codigo: r.codigo,
    rubro: r.rubro,
    detalle: [
      r.sistemaConstructivo?.replace(/_/g, " ").toLowerCase(),
      r.tipoTecho ? `techo ${r.tipoTecho.toLowerCase()}` : null,
      r.sistemaConstructivo === undefined && r.tipoTecho === undefined ? "paquete por baño" : null,
    ]
      .filter(Boolean)
      .join(" · "),
    items: r.items.map((i) => ({
      codigoMaterial: i.codigoMaterial,
      nombre: meta[i.codigoMaterial]?.nombre ?? i.codigoMaterial,
      unidad: meta[i.codigoMaterial]?.unidad ?? "",
      cantidadPorUnidad: String(i.cantidadPorUnidad),
      desperdicioPct: String(i.desperdicioPct),
    })),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        Recetas de cálculo
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Cantidades de material por unidad de cada rubro. Ajustalas según tu método
        constructivo; los próximos cálculos usan estos valores.
      </p>

      <div className="mt-6">
        {dbError ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No hay conexión con la base de datos.
          </p>
        ) : recipes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No hay recetas cargadas. Corré <code className="font-mono">pnpm db:seed</code>.
          </p>
        ) : (
          <RecipesEditor recipes={recetasParaUI} />
        )}
      </div>
    </div>
  );
}
