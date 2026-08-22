import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { isAdminEmail } from "./admin-config";

/**
 * Sesión activa SOLO si el email está en ADMIN_EMAILS.
 * Punto único que consulta auth() — mockear acá en tests.
 */
export async function getAdminSession(): Promise<Session | null> {
  let session: Session | null = null;
  try {
    session = await auth();
  } catch {
    return null; // p.ej. AUTH_SECRET ausente durante build
  }
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null;
  return session;
}

/** Guard para páginas /admin: redirige a login si no hay sesión admin. */
export async function requireAdminPage(): Promise<Session> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}
