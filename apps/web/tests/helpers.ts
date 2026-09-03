import { createHash } from "node:crypto";
import type { HouseInput } from "@casitacalc/shared";
import { prisma } from "@casitacalc/db";

/** Token con el mismo formato que emite el proxy (2 UUIDs). */
export function makeVisitorToken(): string {
  return `${crypto.randomUUID()}.${crypto.randomUUID()}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const VISITOR_COOKIE = "cc_visitor";

interface RequestOpts {
  method?: string;
  body?: unknown;
  token?: string;
}

/** Construye un Request contra la ruta con cookie de visitante opcional. */
export function req(path: string, opts: RequestOpts = {}): Request {
  const headers: Record<string, string> = {};
  if (opts.token) headers.cookie = `${VISITOR_COOKIE}=${opts.token}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`http://localhost:3000${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

export async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export const CASA_VALIDA: HouseInput = {
  nombreProyecto: "Casa Test",
  anchoM: 8,
  largoM: 10,
  alturaParedesM: 2.7,
  sistemaConstructivo: "LADRILLO_HUECO",
  tipoTecho: "CHAPA",
  anguloTechoGrados: 20,
  cantidadBanios: 1,
  aberturas: [{ tipo: "VENTANA", cantidad: 2 }],
};

/** Inserta un proyecto directo en DB con el hash de dueño indicado. */
export async function seedProject(ownerTokenHash: string) {
  const { aberturas, ...datos } = CASA_VALIDA;
  const project = await prisma.project.create({
    data: {
      ...datos,
      ownerTokenHash,
      openings: {
        create: aberturas.map((a) => ({
          tipo: a.tipo,
          cantidad: a.cantidad,
        })),
      },
    },
    select: { id: true },
  });
  return project.id;
}

/** Limpia las tablas de proyectos entre tests. */
export async function limpiarProyectos() {
  await prisma.calculationResult.deleteMany();
  await prisma.opening.deleteMany();
  await prisma.project.deleteMany();
}
