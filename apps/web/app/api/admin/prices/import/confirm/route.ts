import { NextResponse } from "next/server";
import { PriceImportError, confirmPriceImport } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

const MAX_BYTES = 2 * 1024 * 1024;

/** POST /api/admin/prices/import/confirm — importa solo tras el preview. */
export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { filename, content, forceAll } = (body ?? {}) as {
    filename?: unknown;
    content?: unknown;
    forceAll?: unknown;
  };
  if (typeof content !== "string" || typeof filename !== "string") {
    return NextResponse.json(
      { error: "Se esperaban los campos filename y content" },
      { status: 422 },
    );
  }
  if (forceAll !== undefined && typeof forceAll !== "boolean") {
    return NextResponse.json({ error: "forceAll debe ser booleano" }, { status: 422 });
  }
  if (!filename.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Solo se aceptan archivos .csv" }, { status: 422 });
  }
  if (Buffer.byteLength(content, "utf8") > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera el límite de 2 MB" }, { status: 413 });
  }

  try {
    // Re-valida server-side de punta a punta; nunca se confía en el preview del cliente.
    const { collectionId } = await confirmPriceImport({
      filename,
      content,
      createdBy: admin.user?.email ?? "desconocido",
      forceAll: forceAll === true,
    });
    return NextResponse.json({ id: collectionId }, { status: 201 });
  } catch (e) {
    if (e instanceof PriceImportError) {
      const status =
        e.code === "TOO_LARGE"
          ? 413
          : e.code === "NOT_FOUND"
            ? 404
            : e.code === "NO_VALID_ROWS"
              ? 422
              : 422;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("POST /api/admin/prices/import/confirm", e);
    return NextResponse.json({ error: "No se pudo importar el archivo" }, { status: 500 });
  }
}
