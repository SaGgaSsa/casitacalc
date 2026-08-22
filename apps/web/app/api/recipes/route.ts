import { NextResponse } from "next/server";
import { listRecipes } from "@casitacalc/db";

/** GET /api/recipes — recetas configurables. */
export async function GET() {
  const recipes = await listRecipes();
  return NextResponse.json(recipes);
}
