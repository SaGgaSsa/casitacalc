import { NextResponse } from "next/server";
import { UpdateRecipeSchema } from "@casitacalc/shared";
import { updateRecipeItems } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

type Params = { params: Promise<{ codigo: string }> };

/** PUT /api/recipes/[codigo] — reemplaza los ítems de una receta (requiere admin). */
export async function PUT(request: Request, { params }: Params) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  const { codigo } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = UpdateRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Receta inválida", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    await updateRecipeItems(codigo, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("no encontrada")) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error("PUT /api/recipes/[codigo]", e);
    return NextResponse.json({ error: "No se pudo actualizar la receta" }, { status: 500 });
  }
}
