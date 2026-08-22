import { MaterialsEditor } from "@/components/materials-editor";
import { listMaterials } from "@casitacalc/db";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  let materials: Awaited<ReturnType<typeof listMaterials>> = [];
  let dbError = false;
  try {
    materials = await listMaterials();
  } catch {
    dbError = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        Materiales y precios
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Valores de referencia en ARS. Editá cada precio según tu proveedor o zona para
        que los cómputos reflejen tu realidad.
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
