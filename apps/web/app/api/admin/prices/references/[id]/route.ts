import { NextResponse } from "next/server";
import { rejectSingleReferencePrice, updateReferencePrice } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/prices/references/[id] — modifica el precio de referencia.
 * DELETE lógico vía POST /reject para rechazarlo.
 */
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

  const precio = (body as { precio?: unknown } | null)?.precio;
  if (typeof precio !== "number" || !Number.isFinite(precio) || precio <= 0) {
    return NextResponse.json(
      { error: "Ingresá un precio válido mayor a 0" },
      { status: 422 },
    );
  }

  try {
    await updateReferencePrice(id, precio);
    return NextResponse.json({ ok: true, precio });
  } catch (e) {
    if (e instanceof Error && e.name === "PriceImportError") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error("PATCH /api/admin/prices/references/[id]", e);
    return NextResponse.json({ error: "No se pudo actualizar el precio" }, { status: 500 });
  }
}

/** POST /api/admin/prices/references/[id]/reject se maneja en su ruta; acá solo PATCH. */
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  const { id } = await params;
  try {
    await rejectSingleReferencePrice(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo rechazar el precio" }, { status: 500 });
  }
}
