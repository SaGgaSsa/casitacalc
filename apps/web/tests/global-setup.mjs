// Prepara la DB de tests ANTES de que Vitest cargue los archivos de test.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "../../..");

function baseUrlDesdeEnv() {
  const envFile = readFileSync(
    path.join(repoRoot, "packages/db/.env"),
    "utf8",
  );
  const match = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
  if (!match) throw new Error("No se encontró DATABASE_URL en packages/db/.env");
  return match[1];
}

/** Misma instancia que desarrollo, base <nombre>_test. */
export function testDatabaseUrl() {
  const url = new URL(baseUrlDesdeEnv().replace(/^"|"$/g, ""));
  url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;
  return url.toString();
}

export default async function globalSetup() {
  const testUrl = new URL(testDatabaseUrl());
  const dbName = testUrl.pathname.replace(/^\//, "").split("?")[0];

  // Crea la base si falta (usa la DB de mantenimiento "postgres").
  const admin = new URL(testUrl);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`CREATE DATABASE "${dbName}"`).catch((e) => {
    if (e.code !== "42P04") throw e; // duplicate database: ok
  });
  await client.end();

  // Aplica las migraciones contra la base de test.
  execSync("pnpm exec prisma migrate deploy", {
    cwd: path.join(repoRoot, "packages/db"),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: "inherit",
  });

  console.log(`DB de test lista: ${dbName}`);
}
