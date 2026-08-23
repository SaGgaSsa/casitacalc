import { NextResponse } from "next/server";
import { PriceImportError, previewPriceImport } from "@casitacalc/db";
import {
  adminRequiredResponse,
  requireAdminApi,
} from "@/lib/api-auth";

const MAX_BYTES = 2 * 1024 * 1024;

/** POST /api/admin/prices/import/preview — valida un CSV sin persistir nada. */
export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return adminRequiredResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { filename, content } = (body ?? {}) as {
    filename?: unknown;
    content?: unknown;
  };
  if (typeof content !== "string" || typeof filename !== "string") {
    return NextResponse.json(
      { error: "Se esperaban los campos filename y content" },
      { status: 422 },
    );
  }
  // Validación defensiva de extensión y tamaño (el contenido se valida en el servicio).
  if (!filename.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Solo se aceptan archivos .csv" }, { status: 422 });
  }
  if (Buffer.byteLength(content, "utf8") > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera el límite de 2 MB" }, { status: 413 });
  }

  try {
    const preview = await previewPriceImport({ filename, content });
    return NextResponse.json(preview);
  } catch (e) {
    if (e instanceof PriceImportError) {
      const status =
        e.code === "TOO_LARGE" ? 413 : e.code === "NOT_FOUND" ? 404 : 422;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("POST /api/admin/prices/import/preview", e);
    return NextResponse.json({ error: "No se pudo procesar el archivo" }, { status: 500 });
  }
}
