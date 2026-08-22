import { NextResponse } from "next/server";
import { listMaterials } from "@casitacalc/db";

/** GET /api/materials — catálogo completo con precios. */
export async function GET() {
  const materials = await listMaterials();
  return NextResponse.json(materials);
}
