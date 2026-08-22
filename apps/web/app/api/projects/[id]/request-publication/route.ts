import { NextResponse } from "next/server";
import { requestPublication } from "@casitacalc/db";
import { requireProjectOwner } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/[id]/request-publication — pide aprobación para PUBLIC.
 * 409 si ya hay una solicitud pendiente o el proyecto ya fue aprobado.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireProjectOwner(request, id);
  if (!owned.ok) return owned.response;

  try {
    const updated = await requestPublication(id);
    if (updated === "NOT_FOUND") {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    if (updated === null) {
      return NextResponse.json(
        { error: "El proyecto ya tiene una solicitud pendiente o ya está aprobado" },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, moderationStatus: updated.moderationStatus });
  } catch (e) {
    console.error("POST /api/projects/[id]/request-publication", e);
    return NextResponse.json(
      { error: "No se pudo solicitar la publicación" },
      { status: 500 },
    );
  }
}
