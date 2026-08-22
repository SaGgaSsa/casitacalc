import { NextResponse } from "next/server";
import { VisibilityPatchSchema } from "@casitacalc/shared";
import { getProjectFull, setVisibility } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/projects/[id]/visibility — override manual de visibilidad. */
export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = VisibilityPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Visibilidad inválida", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const project = await getProjectFull(id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    await setVisibility(id, parsed.data.visibility);
    return NextResponse.json({ ok: true, visibility: parsed.data.visibility });
  } catch (e) {
    console.error("PATCH /api/admin/projects/[id]/visibility", e);
    return NextResponse.json(
      { error: "No se pudo actualizar la visibilidad" },
      { status: 500 },
    );
  }
}
