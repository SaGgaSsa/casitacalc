import { NextResponse } from "next/server";
import { ModerationPatchSchema, MODERATION_LABELS } from "@casitacalc/shared";
import { getProjectFull, setModeration } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/projects/[id]/moderation — moderación manual. */
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

  const parsed = ModerationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Estado de moderación inválido", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const project = await getProjectFull(id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    await setModeration(id, parsed.data.moderationStatus);
    return NextResponse.json({
      ok: true,
      moderationStatus: parsed.data.moderationStatus,
      mensaje: `Proyecto marcado como ${MODERATION_LABELS[parsed.data.moderationStatus].toLowerCase()}`,
    });
  } catch (e) {
    console.error("PATCH /api/admin/projects/[id]/moderation", e);
    return NextResponse.json(
      { error: "No se pudo actualizar la moderación" },
      { status: 500 },
    );
  }
}
