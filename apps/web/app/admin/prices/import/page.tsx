import { PriceImportWizard } from "@/components/price-import-wizard";

export const dynamic = "force-dynamic";

/** /admin/prices/import — subida de CSV con preview antes de confirmar. */
export default function AdminPriceImportPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        Importar precios
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Subí un CSV con el formato normalizado de CasitaCalc. Primero verás un
        preview con las validaciones; nada se guarda hasta que confirmes. El
        precio normalizado y las medianas se calculan siempre en el servidor.
      </p>

      <div className="mt-6">
        <PriceImportWizard />
      </div>
    </div>
  );
}
