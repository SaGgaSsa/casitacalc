import { NextResponse } from "next/server";
import { PriceImportError, publishReferencePrices } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/prices/collections/[id]/publish — publica referencias DRAFT. */
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  const { id } = await params;
  try {
    const published = await publishReferencePrices(id);
    return NextResponse.json({ ok: true, published });
  } catch (e) {
    if (e instanceof PriceImportError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.code === "NOT_FOUND" ? 404 : 422 },
      );
    }
    console.error("POST /api/admin/prices/collections/[id]/publish", e);
    return NextResponse.json({ error: "No se pudo publicar" }, { status: 500 });
  }
}
