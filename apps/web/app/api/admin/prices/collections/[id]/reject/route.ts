import { NextResponse } from "next/server";
import { PriceImportError, rejectReferencePrices } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/prices/collections/[id]/reject — rechaza la colección. */
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  const { id } = await params;
  try {
    await rejectReferencePrices(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PriceImportError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.code === "NOT_FOUND" ? 404 : 422 },
      );
    }
    console.error("POST /api/admin/prices/collections/[id]/reject", e);
    return NextResponse.json({ error: "No se pudo rechazar" }, { status: 500 });
  }
}
