import { NextResponse } from "next/server";
import { enableShare, disableShare } from "@casitacalc/db";
import {
  buildShareUrl,
  generateShareToken,
  requireProjectOwner,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/[id]/share — activa el link compartido.
 * Reusa el shareToken existente si lo hay; si no, genera uno nuevo.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireProjectOwner(request, id);
  if (!owned.ok) return owned.response;

  try {
    const token =
      owned.project.visibility === "UNLISTED" && owned.project.shareToken
        ? owned.project.shareToken
        : generateShareToken();
    await enableShare(id, token);
    return NextResponse.json({
      id,
      visibility: "UNLISTED",
      shareUrl: buildShareUrl(request, token),
    });
  } catch (e) {
    console.error("POST /api/projects/[id]/share", e);
    return NextResponse.json({ error: "No se pudo compartir el proyecto" }, { status: 500 });
  }
}

/** DELETE /api/projects/[id]/share — deja de compartir e invalida el token. */
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireProjectOwner(request, id);
  if (!owned.ok) return owned.response;

  try {
    await disableShare(id);
    return NextResponse.json({ ok: true, visibility: "PRIVATE" });
  } catch (e) {
    console.error("DELETE /api/projects/[id]/share", e);
    return NextResponse.json({ error: "No se pudo dejar de compartir" }, { status: 500 });
  }
}
