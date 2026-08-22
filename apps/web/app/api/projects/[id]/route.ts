import { NextResponse } from "next/server";
import { z } from "zod";
import { HouseInputObjectSchema } from "@casitacalc/shared";
import type { ProjectResponse } from "@casitacalc/shared";
import {
  deleteProject,
  getProjectFull,
  projectToHouseInput,
  updateProject,
} from "@casitacalc/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const row = await getProjectFull(id);
  if (!row) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const house = projectToHouseInput(row);
  const response: ProjectResponse = {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    proyecto: {
      ...house,
      superficieCubiertaM2: house.anchoM * house.largoM,
    },
  };
  return NextResponse.json(response);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;

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
    await updateProject(id, parsed.data.proyecto);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/projects/[id]", e);
    return NextResponse.json({ error: "No se pudo actualizar el proyecto" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
}
