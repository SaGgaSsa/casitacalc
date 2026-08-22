import { NextResponse } from "next/server";
import { CreateProjectRequestSchema } from "@casitacalc/shared";
import { deleteProject, updateProject } from "@casitacalc/db";
import { requireProjectOwner } from "@/lib/api-auth";
import { projectResponse } from "@/lib/project-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireProjectOwner(request, id);
  if (!owned.ok) return owned.response;

  return NextResponse.json(projectResponse(owned.project));
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireProjectOwner(request, id);
  if (!owned.ok) return owned.response;

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
    await updateProject(id, parsed.data.proyecto);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/projects/[id]", e);
    return NextResponse.json({ error: "No se pudo actualizar el proyecto" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireProjectOwner(request, id);
  if (!owned.ok) return owned.response;

  try {
    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/projects/[id]", e);
    return NextResponse.json({ error: "No se pudo eliminar el proyecto" }, { status: 500 });
  }
}
