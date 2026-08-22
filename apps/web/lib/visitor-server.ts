import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { VISITOR_COOKIE } from "./visitor";

/** SHA-256 hex del token de cookie. En DB solo se guarda el hash. */
export function hashVisitorToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Token crudo del visitante desde cookies de server components. */
export async function getVisitorToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(VISITOR_COOKIE)?.value;
}

/**
 * Visitante anónimo actual para páginas server components.
 * null = sin cookie todavía (no creó proyectos).
 */
export async function getAnonymousVisitor(): Promise<{
  ownerTokenHash: string;
} | null> {
  const token = await getVisitorToken();
  return token ? { ownerTokenHash: hashVisitorToken(token) } : null;
}
