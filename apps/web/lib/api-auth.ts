import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getProjectFull } from "@casitacalc/db";
import { readVisitorCookie } from "./visitor";
import { hashVisitorToken } from "./visitor-server";
import { getAdminSession } from "./admin";

/** Visitante de un Request de API: { ownerTokenHash } | null (sin cookie). */
export function visitorFromRequest(request: Request): {
  ownerTokenHash: string;
} | null {
  const token = readVisitorCookie(request);
  return token ? { ownerTokenHash: hashVisitorToken(token) } : null;
}

type ProjectRow = NonNullable<Awaited<ReturnType<typeof getProjectFull>>>;

export type OwnerCheck =
  | { ok: true; project: ProjectRow }
  | { ok: false; response: NextResponse };

/**
 * Verifica en servidor que el visitante del request sea dueño del proyecto.
 * 404 si no existe, 403 si la cookie no coincide con ownerTokenHash.
 */
export async function requireProjectOwner(
  request: Request,
  projectId: string,
): Promise<OwnerCheck> {
  const project = await getProjectFull(projectId);
  if (!project) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 },
      ),
    };
  }
  const visitor = visitorFromRequest(request);
  if (!visitor || visitor.ownerTokenHash !== project.ownerTokenHash) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No tenés permiso para modificar este proyecto" },
        { status: 403 },
      ),
    };
  }
  return { ok: true, project };
}

/** Respuesta estándar para endpoints administrativos sin sesión válida. */
export function adminRequiredResponse(): NextResponse {
  return NextResponse.json(
    { error: "Se requiere sesión de administrador" },
    { status: 401 },
  );
}

/** Guard de API: devuelve la sesión admin o null (el handler responde 401). */
export async function requireAdminApi() {
  return getAdminSession();
}

/** Token no enumerable para links /share/[token] (256 bits). */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/** URL absoluta de share usando APP_URL o el origin del request. */
export function buildShareUrl(request: Request, token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return `${base.replace(/\/+$/, "")}/share/${token}`;
}
