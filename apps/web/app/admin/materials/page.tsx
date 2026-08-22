import {
  Card,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listMaterials } from "@casitacalc/db";

export const dynamic = "force-dynamic";

/** /admin/materials — catálogo global en modo referencia. */
export default async function AdminMaterialsPage() {
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
        Materiales
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Catálogo global de la calculadora. Los precios se editan desde{" "}
        <a href="/admin/prices" className="text-primary hover:underline">
          Precios
        </a>
        .
      </p>

      {dbError ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay conexión con la base de datos.
        </p>
      ) : (
        <Card className="mt-6 gap-0 overflow-hidden py-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Unidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.codigo}</TableCell>
                  <TableCell className="font-medium">{m.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{m.categoria}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {m.unidad}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
