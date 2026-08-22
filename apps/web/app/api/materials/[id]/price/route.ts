import { NextResponse } from "next/server";
import { UpdateMaterialPriceSchema } from "@casitacalc/shared";
import { updateMaterialPrice } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** PUT /api/materials/[id]/price — carga manual de precio (requiere admin). */
export async function PUT(request: Request, { params }: Params) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = UpdateMaterialPriceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Precio inválido", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const material = await updateMaterialPrice(id, parsed.data);
    if (!material) {
      return NextResponse.json({ error: "Material no encontrado" }, { status: 404 });
    }
    return NextResponse.json(material);
  } catch (e) {
    console.error("PUT /api/materials/[id]/price", e);
    return NextResponse.json({ error: "No se pudo actualizar el precio" }, { status: 500 });
  }
}
