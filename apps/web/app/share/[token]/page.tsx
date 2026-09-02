import Link from "next/link";
import { Eye, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResultView } from "@/components/result-view";
import { resumenAberturas } from "@/lib/aberturas";
import { getLatestResult, getPreciosActualizadoEn, getProjectByShareToken } from "@casitacalc/db";

export const dynamic = "force-dynamic";

/**
 * Vista compartida por link: read-only, sin acciones de dueño.
 * El token es el único credential; solo responde si el proyecto sigue UNLISTED.
 */
export default async function SharePage({
  params,
}: PageProps<"/share/[token]">) {
  const { token } = await params;
  const project = await getProjectByShareToken(token);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <TriangleAlert className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 font-heading text-xl font-semibold text-foreground">
          Este enlace no está disponible
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El proyecto dejó de compartirse o el enlace es inválido.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
          Ir a CasitaCalc
        </Link>
      </div>
    );
  }

  const [result, preciosActualizadoEn] = await Promise.all([
    getLatestResult(project.id),
    getPreciosActualizadoEn(),
  ]);
  const sup = Number(project.anchoM) * Number(project.largoM);
  const sistema = project.sistemaConstructivo.replace(/_/g, " ").toLowerCase();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <Eye className="size-3.5" />
          Proyecto compartido · solo lectura
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {sup.toLocaleString("es-AR")} m²
        </Badge>
      </div>

      <h1 className="mt-3 font-heading text-2xl font-bold capitalize tracking-tight text-foreground md:text-3xl">
        {project.nombreProyecto}
      </h1>

      {/* Datos */}
      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Datos de la vivienda</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <Dato etiqueta="Superficie" valor={`${sup.toLocaleString("es-AR")} m²`} />
          <Dato etiqueta="Sistema constructivo" valor={sistema} />
          <Dato
            etiqueta="Techo"
            valor={`${project.tipoTecho === "CHAPA" ? "Chapa" : "Losa"}${
              project.tipoTecho === "CHAPA" ? ` (${Number(project.anguloTechoGrados)}°)` : ""
            }`}
          />
          <Dato etiqueta="Altura de paredes" valor={`${Number(project.alturaParedesM)} m`} />
          <Dato etiqueta="Baños" valor={String(project.cantidadBanios)} />
          <Dato etiqueta="Aberturas" valor={resumenAberturas(project.openings)} />
        </CardContent>
      </Card>

      {/* Cómputo compartido (si existe) */}
      <div className="mt-6">
        {result && result.items.length > 0 ? (
          <ResultView
            result={result}
            preciosDesactualizados={
              preciosActualizadoEn !== null &&
              preciosActualizadoEn > new Date(result.fechaCreacion)
            }
          />
        ) : (
          <Card className="shadow-sm">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Este proyecto todavía no tiene un cálculo de materiales.
            </CardContent>
          </Card>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        ¿Querés calcular tu propia vivienda?{" "}
        <Link href="/projects/new" className="text-primary hover:underline">
          Probá CasitaCalc gratis
        </Link>
      </p>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p className="mt-0.5 capitalize text-foreground">{valor}</p>
    </div>
  );
}
