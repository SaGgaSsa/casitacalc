import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listProjectsForAdmin, listMaterials, listRecipes } from "@casitacalc/db";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  let total = 0;
  let pendientes: Awaited<ReturnType<typeof listProjectsForAdmin>> = [];
  let materiales = 0;
  let recetas = 0;
  try {
    const [todos, pend, mats, recs] = await Promise.all([
      listProjectsForAdmin("all"),
      listProjectsForAdmin("pending"),
      listMaterials(),
      listRecipes(),
    ]);
    total = todos.length;
    pendientes = pend;
    materiales = mats.length;
    recetas = recs.length;
  } catch {
    // sin DB se muestran los ceros
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        Resumen
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proyectos totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendientes de moderación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold text-primary">
              {pendientes.length}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Materiales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold">{materiales}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recetas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-bold">{recetas}</p>
          </CardContent>
        </Card>
      </div>

      {pendientes.length > 0 && (
        <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-base font-semibold">Solicitudes de publicación</h2>
          <ul className="mt-3 space-y-2">
            {pendientes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 text-sm">
                <Link href={`/projects/${p.id}`} className="font-medium capitalize text-primary hover:underline">
                  {p.nombreProyecto}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Intl.NumberFormat("es-AR").format(p.superficieM2)} m²
                </span>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/admin/projects?filtro=pending">Moderar ahora</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
