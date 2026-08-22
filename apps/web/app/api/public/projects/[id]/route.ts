import { NextResponse } from "next/server";
import { getApprovedPublicProject, getLatestResult } from "@casitacalc/db";
import { projectResponse } from "@/lib/project-response";

type Params = { params: Promise<{ id: string }> };

/** GET /api/public/projects/[id] — detalle público: solo PUBLIC + APPROVED. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const project = await getApprovedPublicProject(id);
  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const resultado = await getLatestResult(project.id);
  return NextResponse.json({ ...projectResponse(project), resultado });
}
