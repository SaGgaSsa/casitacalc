import { NextResponse } from "next/server";
import { listProjectsForAdmin, type AdminProjectFilter } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

const FILTROS: AdminProjectFilter[] = [
  "all",
  "private",
  "shared",
  "pending",
  "public",
  "rejected",
];

/** GET /api/admin/projects?filtro= — tabla completa con filtros. */
export async function GET(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  const crudo = new URL(request.url).searchParams.get("filtro") ?? "all";
  const filtro = (FILTROS as string[]).includes(crudo)
    ? (crudo as AdminProjectFilter)
    : "all";

  const projects = await listProjectsForAdmin(filtro);
  return NextResponse.json(projects);
}
