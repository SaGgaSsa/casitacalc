import { NextResponse } from "next/server";
import { CreateProjectRequestSchema } from "@casitacalc/shared";
import {
  MAX_PROJECTS_PER_VISITOR,
} from "@casitacalc/shared";
import {
  countProjectsByOwner,
  createProject,
  listProjectSummaries,
} from "@casitacalc/db";
import { visitorFromRequest } from "@/lib/api-auth";

/** GET /api/projects — resúmenes SOLO de los proyectos del visitante. */
export async function GET(request: Request) {
  const visitor = visitorFromRequest(request);
  if (!visitor) return NextResponse.json([]);
  const summaries = await listProjectSummaries(visitor.ownerTokenHash);
  return NextResponse.json(summaries);
}

/** POST /api/projects — crea el proyecto asociado a la cookie anónima. */
export async function POST(request: Request) {
  const visitor = visitorFromRequest(request);
  if (!visitor) {
    return NextResponse.json(
      { error: "Visitante no identificado; recargá la página" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = CreateProjectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos del proyecto inválidos", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const cantidad = await countProjectsByOwner(visitor.ownerTokenHash);
    if (cantidad >= MAX_PROJECTS_PER_VISITOR) {
      return NextResponse.json(
        {
          error: `Llegaste al límite de ${MAX_PROJECTS_PER_VISITOR} proyectos guardados; eliminá alguno para crear otro`,
        },
        { status: 409 },
      );
    }

    const id = await createProject(parsed.data.proyecto, visitor.ownerTokenHash);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/projects", e);
    return NextResponse.json({ error: "No se pudo crear el proyecto" }, { status: 500 });
  }
}
