import { NextResponse } from "next/server";
import { deleteProject, getProjectFull } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/admin/projects/[id] — eliminación por administración. */
export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  const { id } = await params;
  try {
    const project = await getProjectFull(id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/projects/[id]", e);
    return NextResponse.json({ error: "No se pudo eliminar el proyecto" }, { status: 500 });
  }
}
