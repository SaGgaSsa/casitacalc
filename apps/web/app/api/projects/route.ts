import { NextResponse } from "next/server";
import { z } from "zod";
import {
  HouseInputObjectSchema,
  ProjectSummarySchema,
} from "@casitacalc/shared";
import type { ProjectResponse } from "@casitacalc/shared";
import {
  createProject,
  listProjectSummaries,
} from "@casitacalc/db";

/** GET /api/projects — resúmenes para tablas. */
export async function GET() {
  const summaries = await listProjectSummaries();
  return NextResponse.json(summaries);
}

/** POST /api/projects — crea el proyecto y devuelve su id público. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = z.object({ proyecto: HouseInputObjectSchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos del proyecto inválidos", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const id = await createProject(parsed.data.proyecto);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/projects", e);
    return NextResponse.json({ error: "No se pudo crear el proyecto" }, { status: 500 });
  }
}
