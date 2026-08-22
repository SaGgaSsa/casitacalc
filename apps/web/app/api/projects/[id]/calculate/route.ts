import { NextResponse } from "next/server";
import { calculateAndSaveResult, getLatestResult } from "@casitacalc/db";
import { requireProjectOwner } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** POST /api/projects/[id]/calculate — recalcula y persiste el cómputo (owner). */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireProjectOwner(request, id);
  if (!owned.ok) return owned.response;

  try {
    const result = await calculateAndSaveResult(id);
    if (!result) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    if (result.items.length === 0) {
      return NextResponse.json(
        { error: "Las recetas están vacías; corré el seed de la base de datos" },
        { status: 409 },
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/projects/[id]/calculate", e);
    return NextResponse.json({ error: "Error al calcular materiales" }, { status: 500 });
  }
}

/** GET /api/projects/[id]/calculate — último resultado guardado (owner). */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireProjectOwner(request, id);
  if (!owned.ok) return owned.response;

  const result = await getLatestResult(id);
  if (!result) {
    return NextResponse.json({ error: "Sin resultados previos" }, { status: 404 });
  }
  return NextResponse.json(result);
}
