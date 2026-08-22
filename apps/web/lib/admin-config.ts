/**
 * Allowlist de administradores. Fuera de acá para que auth.ts pueda usarla
 * sin importar next-auth (evita dependencia circular).
 */
export function parseAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().has(email.toLowerCase());
}
