import { NextResponse } from "next/server";
import { calculateAndSaveResult, getLatestResult } from "@casitacalc/db";

type Params = { params: Promise<{ id: string }> };

/** POST /api/projects/[id]/calculate — recalcula y persiste el cómputo. */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

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

/** GET /api/projects/[id]/calculate — devuelve el último resultado guardado. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const result = await getLatestResult(id);
  if (!result) {
    return NextResponse.json({ error: "Sin resultados previos" }, { status: 404 });
  }
  return NextResponse.json(result);
}
