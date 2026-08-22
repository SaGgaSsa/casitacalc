import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProjectsForAdmin, type AdminProjectFilter } from "@casitacalc/db";
import { MODERATION_LABELS, VISIBILITY_LABELS } from "@casitacalc/shared";
import { formatDate, formatMoney } from "@/lib/format";
import { AdminProjectRowActions } from "@/components/admin-project-row-actions";

export const dynamic = "force-dynamic";

const FILTROS: { key: AdminProjectFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "private", label: "Privados" },
  { key: "shared", label: "Compartidos" },
  { key: "pending", label: "Pendientes" },
  { key: "public", label: "Públicos" },
  { key: "rejected", label: "Rechazados" },
];

export default async function AdminProjectsPage({
  searchParams,
}: PageProps<"/admin/projects">) {
  const params = await searchParams;
  const crudo = typeof params.filtro === "string" ? params.filtro : "all";
  const filtro = (FILTROS.some((f) => f.key === crudo) ? crudo : "all") as AdminProjectFilter;

  let projects: Awaited<ReturnType<typeof listProjectsForAdmin>> = [];
  let dbError = false;
  try {
    projects = await listProjectsForAdmin(filtro);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Proyectos
        </h1>
        <nav className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/projects?filtro=${f.key}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                f.key === filtro
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      {dbError ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay conexión con la base de datos.
        </p>
      ) : projects.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay proyectos para este filtro.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead>Proyecto</TableHead>
                <TableHead className="text-right">Sup. (m²)</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Visibilidad</TableHead>
                <TableHead>Moderación</TableHead>
                <TableHead className="text-right">Costo estimado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/projects/${p.id}`}
                      className="capitalize text-primary hover:underline"
                    >
                      {p.nombreProyecto}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {new Intl.NumberFormat("es-AR").format(p.superficieM2)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {formatDate(p.fechaCreacion)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.visibility === "PRIVATE" ? "outline" : "secondary"}>
                      {VISIBILITY_LABELS[p.visibility]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.moderationStatus === "APPROVED"
                          ? "default"
                          : p.moderationStatus === "REJECTED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {MODERATION_LABELS[p.moderationStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {p.costoEstimado != null ? formatMoney(p.costoEstimado) : "—"}
                  </TableCell>
                  <TableCell>
                    <AdminProjectRowActions
                      projectId={p.id}
                      visibility={p.visibility}
                      moderationStatus={p.moderationStatus}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Acceso directo al botón eliminar también fuera de pendientes */}
      <p className="mt-3 text-xs text-muted-foreground">
        Aprobar hace el proyecto público; rechazar lo vuelve privado. Los cambios manuales
        de visibilidad y moderación se aplican al instante.
      </p>
    </div>
  );
}
