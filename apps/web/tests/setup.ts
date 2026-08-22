// Corre antes de importar los tests: fija DATABASE_URL al clon _test para que
// @casitacalc/db instancie el cliente Prisma contra la base de test.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "../../..");

if (!process.env.TEST_DATABASE_URL) {
  const envFile = readFileSync(path.join(repoRoot, "packages/db/.env"), "utf8");
  const match = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
  if (match) {
    const url = new URL(match[1].replace(/^"|"$/g, ""));
    url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;
    process.env.DATABASE_URL = url.toString();
  }
}

// Allowlist de admin usada por los tests (se mockea "@/auth").
process.env.ADMIN_EMAILS ??= "admin@casitacalc.test";
process.env.AUTH_SECRET ??= "test-secret-solo-para-vitest";
