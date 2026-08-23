import { NextResponse } from "next/server";
import { excludeObservation } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/prices/observations/[id]/exclude — excluye una observación. */
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  const { id } = await params;
  try {
    await excludeObservation(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/prices/observations/[id]/exclude", e);
    return NextResponse.json({ error: "No se pudo excluir la observación" }, { status: 500 });
  }
}
