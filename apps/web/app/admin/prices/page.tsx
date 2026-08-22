import { MaterialsEditor } from "@/components/materials-editor";
import { listMaterials } from "@casitacalc/db";

export const dynamic = "force-dynamic";

/** /admin/prices — edición de precios globales (solo administración). */
export default async function AdminPricesPage() {
  let materials: Awaited<ReturnType<typeof listMaterials>> = [];
  let dbError = false;
  try {
    materials = await listMaterials();
  } catch {
    dbError = true;
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        Precios
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Valores de referencia en ARS del catálogo global. Se aplican a los próximos
        cálculos de todos los visitantes.
      </p>

      <div className="mt-6">
        {dbError ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No hay conexión con la base de datos.
          </p>
        ) : (
          <MaterialsEditor materials={materials} />
        )}
      </div>
    </div>
  );
}
