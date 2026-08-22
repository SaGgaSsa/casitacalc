import { NextResponse } from "next/server";
import { listApprovedPublicProjects } from "@casitacalc/db";

/** GET /api/public/projects — galería pública: solo PUBLIC + APPROVED. */
export async function GET() {
  const projects = await listApprovedPublicProjects();
  return NextResponse.json(projects);
}
