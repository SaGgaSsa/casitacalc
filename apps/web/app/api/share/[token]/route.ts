import { NextResponse } from "next/server";
import { getProjectByShareToken, getLatestResult } from "@casitacalc/db";
import { projectResponse } from "@/lib/project-response";

type Params = { params: Promise<{ token: string }> };

/** GET /api/share/[token] — lectura de un proyecto compartido (UNLISTED). */
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const project = await getProjectByShareToken(token);
  if (!project) {
    return NextResponse.json(
      { error: "El enlace no existe o dejó de estar disponible" },
      { status: 404 },
    );
  }

  const resultado = await getLatestResult(project.id);
  return NextResponse.json({ ...projectResponse(project), resultado });
}
