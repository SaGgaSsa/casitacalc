/**
 * Primitivas del visitante anónimo, seguras para runtime edge (proxy.ts).
 * NO importar node:crypto acá.
 */

/** Nombre de la cookie anónima de larga duración. */
export const VISITOR_COOKIE = "cc_visitor";

export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

/** Token aleatorio nuevo (128 bits de randomUUID × 2). Edge-safe. */
export function generateVisitorToken(): string {
  return `${crypto.randomUUID()}.${crypto.randomUUID()}`;
}

/** Lee la cookie anónima desde el header Cookie crudo. */
export function readVisitorCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === VISITOR_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return undefined;
}
