import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@casitacalc/db";

import { POST as previewPOST } from "@/app/api/admin/prices/import/preview/route";
import { POST as confirmPOST } from "@/app/api/admin/prices/import/confirm/route";
import {
  POST as publishPOST,
} from "@/app/api/admin/prices/collections/[id]/publish/route";
import {
  POST as rejectPOST,
} from "@/app/api/admin/prices/collections/[id]/reject/route";
import {
  POST as recalcPOST,
} from "@/app/api/admin/prices/collections/[id]/recalculate/route";
import { POST as excludePOST } from "@/app/api/admin/prices/observations/[id]/exclude/route";

// Sesión admin mutable: null = visitante común; set = sesión de admin.
vi.mock("@/auth", () => ({
  auth: () => Promise.resolve((globalThis as Record<string, unknown>).__TEST_ADMIN_SESSION__ ?? null),
}));

function setAdminSession(email: string | null) {
  (globalThis as Record<string, unknown>).__TEST_ADMIN_SESSION__ =
    email === null ? undefined : { user: { email }, expires: "9999" };
}

async function params<T extends Record<string, string>>(v: T) {
  return { params: Promise.resolve(v) };
}

const HEADER =
  "source,region,collected_at,material_code,external_id,title,url,currency,raw_price,package_quantity,package_unit,brand,seller,accepted,rejection_reason";

function fila(overrides: Partial<Record<string, string>> = {}, n = "1"): string {
  return [
    overrides.source ?? "MERCADOLIBRE",
    overrides.region ?? "GBA",
    overrides.collected_at ?? "2026-08-22",
    overrides.material_code ?? "CEMENTO_PORTLAND_25KG",
    overrides.external_id ?? `MLA-${n}`,
    overrides.title ?? `Cemento prueba ${n}`,
    overrides.url ?? `https://articulo.mercadolibre.com.ar/MLA${n}`,
    overrides.currency ?? "ARS",
    overrides.raw_price ?? "12500",
    overrides.package_quantity ?? "1",
    overrides.package_unit ?? "BAG_25KG",
    overrides.brand ?? "",
    overrides.seller ?? "",
    overrides.accepted ?? "true",
    overrides.rejection_reason ?? "",
  ].join(",");
}

async function subirCsv(
  filename: string,
  lineas: string[],
  forceAll = false,
): Promise<Response> {
  const content = [HEADER, ...lineas].join("\n");
  return confirmPOST(
    reqJson("/api/admin/prices/import/confirm", { filename, content, forceAll }),
  );
}

// ── Cobertura total: el confirm exige precio para TODO el catálogo de test ──

type OverridesFila = Partial<Record<string, string>>;

function filaLadrillo(n: string, overrides: OverridesFila = {}): string {
  return fila(
    {
      material_code: "LADRILLO_HUECO_12X18X33",
      title: "Pack 10 ladrillos huecos",
      raw_price: "12000",
      package_quantity: "10",
      package_unit: "UNIT",
      ...overrides,
    },
    n,
  );
}

function filaArena(n: string, overrides: OverridesFila = {}): string {
  return fila(
    {
      material_code: "ARENA",
      title: "Arena m3",
      raw_price: "28000",
      package_quantity: "1",
      package_unit: "M3",
      ...overrides,
    },
    n,
  );
}

/** Agrega una fila por cada material del catálogo que `cubiertos` no trae. */
function filasRestantes(cubiertos: string[], prefijo: string, overrides: OverridesFila = {}): string[] {
  const faltantes = ["CEMENTO_PORTLAND_25KG", "LADRILLO_HUECO_12X18X33", "ARENA"].filter(
    (c) => !cubiertos.includes(c),
  );
  return faltantes.map((codigo, i) =>
    codigo === "LADRILLO_HUECO_12X18X33"
      ? filaLadrillo(`${prefijo}-lad-${i}`, overrides)
      : filaArena(`${prefijo}-are-${i}`, overrides),
  );
}

function reqJson(path: string, body: unknown): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  setAdminSession("admin@casitacalc.test");
  await prisma.materialReferencePrice.deleteMany();
  await prisma.priceObservation.deleteMany();
  await prisma.priceCollection.deleteMany();

  // Catálogo determinista: fuera materiales heredados de corridas anteriores
  // (p. ej. LADRILLO_HUECO_18X18X33, previo al rename), para que la cobertura
  // total que exige el confirm sea exactamente la de este archivo.
  await prisma.material.deleteMany({
    where: {
      codigo: { notIn: ["CEMENTO_PORTLAND_25KG", "LADRILLO_HUECO_12X18X33", "ARENA"] },
    },
  });

  // La DB de test no corre el seed completo: fuentes mínimas para el importador.
  for (const [code, name] of [
    ["EASY", "Easy"],
    ["MERCADOLIBRE", "Mercado Libre"],
    ["MANUAL", "Manual"],
  ] as const) {
    await prisma.priceSource.upsert({
      where: { code },
      create: { code, name, enabled: true },
      update: { enabled: true },
    });
  }

  // Catálogo mínimo para los tests de precios.
  const fecha = new Date("2026-01-01T00:00:00.000Z");
  for (const m of [
    { codigo: "CEMENTO_PORTLAND_25KG", nombre: "Cemento Portland 25 kg", categoria: "Aglomerantes", unidad: "bolsa", precioDefault: 9500 },
    { codigo: "LADRILLO_HUECO_12X18X33", nombre: "Ladrillo hueco 12x18x33", categoria: "Mampostería", unidad: "un", precioDefault: 650 },
    { codigo: "ARENA", nombre: "Arena", categoria: "Agregados", unidad: "m3", precioDefault: 28000 },
  ]) {
    await prisma.material.upsert({
      where: { codigo: m.codigo },
      create: { ...m, precioActual: m.precioDefault, fechaActualizacionPrecio: fecha, fuente: "Referencia demo" },
      update: {},
    });
  }
});

describe("seguridad del importador", () => {
  const body = { filename: "precios.csv", content: `${HEADER}\n${fila()}` };

  it("rechaza sin sesión admin (401)", async () => {
    setAdminSession(null);
    expect((await previewPOST(reqJson("/preview", body))).status).toBe(401);
    expect((await confirmPOST(reqJson("/confirm", body))).status).toBe(401);
    expect((await publishPOST(new Request("http://localhost/x"), await params({ id: "x" }))).status).toBe(401);
    expect((await rejectPOST(new Request("http://localhost/x"), await params({ id: "x" }))).status).toBe(401);
    expect((await excludePOST(new Request("http://localhost/x"), await params({ id: "x" }))).status).toBe(401);
  });

  it("rechaza extensión no csv y archivo vacío", async () => {
    const resXls = await previewPOST(reqJson("/preview", { filename: "a.xls", content: HEADER }));
    expect(resXls.status).toBe(422);

    const resVacio = await previewPOST(reqJson("/preview", { filename: "a.csv", content: "" }));
    expect(resVacio.status).toBe(422);
  });
});

describe("preview e importación", () => {
  it("valida un CSV válido sin persistir nada (preview)", async () => {
    const content = [HEADER, fila({}, "1"), fila({}, "2")].join("\n");
    const res = await previewPOST(reqJson("/preview", { filename: "precios.csv", content }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalRows).toBe(2);
    expect(data.validRows).toBe(2);
    expect(data.invalidRows).toBe(0);
    expect(data.sources).toEqual(["MERCADOLIBRE"]);
    expect(data.proposals[0]?.medianPrice).toBe(12500);

    // El preview NO persiste.
    expect(await prisma.priceObservation.count()).toBe(0);
    expect(await prisma.priceCollection.count()).toBe(0);
  });

  it("clasifica filas inválidas sin invalidar el resto", async () => {
    const lineas = [
      fila({}, "1"),
      fila({ material_code: "NO_EXISTE" }, "2"),
      fila({ source: "SODIMAC" }, "3"),
      fila({ raw_price: "-5" }, "5"),
      fila({ package_quantity: "0" }, "6"),
      fila({ package_unit: "CAJA_RARA" }, "7"),
    ];
    const res = await previewPOST(reqJson("/preview", { filename: "mix.csv", content: [HEADER, ...lineas].join("\n") }));
    const data = await res.json();
    expect(data.validRows).toBe(1);
    expect(data.invalidRows).toBe(5);

    const motivos = Object.fromEntries(data.rows.map((r: { reason: string | null; line: number }) => [r.line, r.reason]));
    expect(motivos[3]).toBe("UNKNOWN_MATERIAL_CODE");
    expect(motivos[4]).toBe("UNKNOWN_SOURCE");
    expect(motivos[5]).toBe("NEGATIVE_PRICE");
    expect(motivos[6]).toBe("INVALID_PACKAGE_QUANTITY");
    expect(motivos[7]).toBe("UNKNOWN_PACKAGE_QUANTITY");
  });

  it("confirma la importación: colección + observaciones + referencias DRAFT", async () => {
    // 5 filas válidas de cemento (mediana 12500) + ladrillos pack×10 + arena
    // (cobertura total del catálogo de test).
    const lineas = [
      fila({ raw_price: "12000" }, "10"),
      fila({ raw_price: "12500" }, "11"),
      fila({ raw_price: "12500" }, "12"),
      fila({ raw_price: "13000", external_id: "", url: "https://tienda.com/p/9", title: "Cemento corralón" }, "13"),
      fila({ raw_price: "99999" }, "14"),
      ...filasRestantes(["CEMENTO_PORTLAND_25KG"], "cov"),
    ];
    const res = await subirCsv("precios-2026-08.csv", lineas);
    expect(res.status).toBe(201);
    const { id } = await res.json();

    const collection = await prisma.priceCollection.findUniqueOrThrow({ where: { id } });
    expect(collection.status).toBe("DRAFT");
    expect(collection.totalRows).toBe(7);
    expect(collection.acceptedRows).toBe(7);
    expect(collection.createdBy).toBe("admin@casitacalc.test");

    const obs = await prisma.priceObservation.findMany({ where: { collectionId: id } });
    expect(obs).toHaveLength(7);

    // Normalización server-side del pack de ladrillos.
    const ladrillos = obs.find((o) => o.normalizedUnit === "un");
    expect(ladrillos?.normalizedUnitPrice.toFixed(2)).toBe("1200.00");

    const refs = await prisma.materialReferencePrice.findMany({ where: { collectionId: id } });
    expect(refs).toHaveLength(3);
    const cementoId = await materialId("CEMENTO_PORTLAND_25KG");
    const refCemento = refs.find((r) => r.materialId === cementoId);
    expect(refCemento?.price.toFixed(2)).toBe("12500.00"); // mediana, no promedio
    expect(refCemento?.sampleSize).toBe(5);
    expect(refCemento?.insufficientSample).toBe(false);
    expect(refCemento?.status).toBe("DRAFT");

    const ladrilloId = await materialId("LADRILLO_HUECO_12X18X33");
    const refLadrillo = refs.find((r) => r.materialId === ladrilloId);
    expect(refLadrillo?.sampleSize).toBe(1);
    expect(refLadrillo?.insufficientSample).toBe(true); // menos de 5 muestras

    const arenaId = await materialId("ARENA");
    const refArena = refs.find((r) => r.materialId === arenaId);
    expect(refArena?.price.toFixed(2)).toBe("28000.00");
    expect(refArena?.insufficientSample).toBe(true);
  });

  it("rechaza un import parcial que no cubre todo el catálogo (INCOMPLETE_COVERAGE)", async () => {
    const res = await subirCsv("parcial.csv", [fila({}, "100")]);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.code).toBe("INCOMPLETE_COVERAGE");
    expect(data.error).toContain("LADRILLO_HUECO_12X18X33");
    expect(data.error).toContain("ARENA");
    expect(await prisma.priceObservation.count()).toBe(0);
    expect(await prisma.priceCollection.count()).toBe(0);
  });

  it("no inserta duplicados silenciosos entre archivos", async () => {
    const lineas = [fila({}, "100"), ...filasRestantes(["CEMENTO_PORTLAND_25KG"], "dup")];
    const primera = await subirCsv("a.csv", lineas);
    expect(primera.status).toBe(201);
    // Mismo externalId + misma fecha → DUPLICATE_IN_DB → nada válido que importar.
    const segunda = await subirCsv("b.csv", lineas);
    expect(segunda.status).toBe(422);
    const data = await segunda.json();
    expect(data.code).toBe("NO_VALID_ROWS");
    expect(await prisma.priceObservation.count()).toBe(3);
  });

  it("rechaza archivos que mezclan regiones", async () => {
    const res = await previewPOST(
      reqJson("/preview", {
        filename: "mixto.csv",
        content: [HEADER, fila({ region: "GBA" }), fila({ region: "CABA" })].join("\n"),
      }),
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.code).toBe("MIXED_REGIONS");
  });

  it("rechaza encabezado incompleto", async () => {
    const res = await previewPOST(
      reqJson("/preview", {
        filename: "mal.csv",
        content: "source,title\nMERCADOLIBRE,Cemento",
      }),
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.code).toBe("MISSING_HEADER");
  });
});

describe("umbral de inflación en el importador", () => {
  // Publica cemento con mediana 12500 (umbral: 12500 × 1,025 = 12812.5).
  async function publicarBaseline() {
    const { id } = await importarColeccionConCemento();
    const pub = await publishPOST(new Request("http://localhost/pub"), await params({ id }));
    expect(pub.status).toBe(200);
  }

  /** CSV nuevo: 5 cementos (mediana 13000, supera umbral) + ladrillo y arena con precio igual al baseline. */
  function csvContraBaseline(): string[] {
    return [
      ...[12800, 12900, 13000, 13100, 13200].map((p, i) =>
        fila({ raw_price: String(p) }, `nuevo-${i}`),
      ),
      ...filasRestantes(["CEMENTO_PORTLAND_25KG"], "nuevo"),
    ];
  }

  it("el preview marca materiales que superan el umbral con su precio anterior", async () => {
    await publicarBaseline();
    const content = [HEADER, ...csvContraBaseline()].join("\n");
    const res = await previewPOST(reqJson("/preview", { filename: "suba.csv", content }));
    expect(res.status).toBe(200);
    const data = await res.json();

    const porCodigo = Object.fromEntries(
      data.proposals.map((p: { materialCode: string }) => [p.materialCode, p]),
    );
    expect(porCodigo.CEMENTO_PORTLAND_25KG.exceedsInflation).toBe(true);
    expect(porCodigo.CEMENTO_PORTLAND_25KG.previousPrice).toBe(12500);
    expect(porCodigo.LADRILLO_HUECO_12X18X33.exceedsInflation).toBe(false);
    expect(porCodigo.LADRILLO_HUECO_12X18X33.previousPrice).toBe(1200);
    expect(porCodigo.ARENA.exceedsInflation).toBe(false);
    expect(porCodigo.ARENA.previousPrice).toBe(28000);
    expect(data.warnings).toContain("EXCEEDS_INFLATION:CEMENTO_PORTLAND_25KG");

    // Conteo para los botones: ladrillo y arena importables, cemento requiere force.
    expect(data.validRows).toBe(7);
    expect(data.importableRows).toBe(2);
    expect(data.flaggedRows).toBe(5);
  });

  it("las filas del preview exponen la url de la publicación", async () => {
    await publicarBaseline();
    const content = [HEADER, ...csvContraBaseline()].join("\n");
    const res = await previewPOST(reqJson("/preview", { filename: "suba.csv", content }));
    const data = await res.json();
    const filaCemento = data.rows.find(
      (r: { externalRef?: string; title: string }) => r.title === "Cemento prueba nuevo-0",
    );
    expect(filaCemento?.url).toBe("https://articulo.mercadolibre.com.ar/MLAnuevo-0");
  });

  it("el confirm sin forceAll rechaza: el material marcado dejaría la cobertura incompleta", async () => {
    await publicarBaseline();
    const content = [HEADER, ...csvContraBaseline()].join("\n");
    const res = await confirmPOST(
      reqJson("/confirm", { filename: "suba.csv", content, forceAll: false }),
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.code).toBe("INCOMPLETE_COVERAGE");
    expect(data.error).toContain("CEMENTO_PORTLAND_25KG");
    // Solo persiste el baseline: nada del archivo rechazado.
    expect(await prisma.priceCollection.count()).toBe(1);
  });

  it("el confirm con forceAll importa también los marcados", async () => {
    await publicarBaseline();
    const content = [HEADER, ...csvContraBaseline()].join("\n");
    const res = await confirmPOST(
      reqJson("/confirm", { filename: "suba.csv", content, forceAll: true }),
    );
    expect(res.status).toBe(201);
    const { id } = await res.json();

    const obs = await prisma.priceObservation.findMany({ where: { collectionId: id } });
    expect(obs).toHaveLength(7);

    const refs = await prisma.materialReferencePrice.findMany({ where: { collectionId: id } });
    expect(refs).toHaveLength(3);
  });

  it("sin forceAll y con todo marcado no importa nada (NO_VALID_ROWS)", async () => {
    await publicarBaseline();
    const lineas = [12800, 12900, 13000, 13100, 13200].map((p, i) =>
      fila({ raw_price: String(p) }, `solo-${i}`),
    );
    const content = [HEADER, ...lineas].join("\n");
    const obsAntes = await prisma.priceObservation.count();
    const res = await confirmPOST(
      reqJson("/confirm", { filename: "suba.csv", content, forceAll: false }),
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.code).toBe("NO_VALID_ROWS");
    expect(await prisma.priceObservation.count()).toBe(obsAntes);
  });
});

describe("publicación y consumo del precio", () => {
  it("publica referencias y las expone como último precio PUBLISHED", async () => {
    const { id } = await importarColeccionConCemento();
    expect(await prisma.priceObservation.count()).toBeGreaterThan(0);

    // Antes de publicar: nada vigente.
    const { getPublishedPrices } = await import("@casitacalc/db");
    expect((await getPublishedPrices("GBA")).size).toBe(0);

    const pubRes = await publishPOST(new Request("http://localhost/pub"), await params({ id }));
    expect(pubRes.status).toBe(200);
    const { published } = await pubRes.json();
    expect(published).toBeGreaterThanOrEqual(1);

    const collection = await prisma.priceCollection.findUniqueOrThrow({ where: { id } });
    expect(collection.status).toBe("PUBLISHED");

    const vigentes = await getPublishedPrices("GBA");
    const cemento = vigentes.get("CEMENTO_PORTLAND_25KG");
    expect(cemento?.precio).toBe(12500);
    expect(cemento?.region).toBe("GBA");

    // Otra región no ve este precio.
    expect((await getPublishedPrices("CABA")).size).toBe(0);
  });

  it("el cálculo usa el precio publicado y conserva fuente/fecha/región por ítem", async () => {
    const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256").update(token).digest("hex");
    const project = await prisma.project.create({
      data: {
        nombreProyecto: "Casa precios publicados",
        anchoM: 8, largoM: 10, alturaParedesM: 2.7,
        sistemaConstructivo: "LADRILLO_HUECO", tipoTecho: "CHAPA", anguloTechoGrados: 20,
        cantidadBanios: 1, ownerTokenHash: hash,
      },
      select: { id: true },
    });

    try {
      // Recetas mínimas: la DB de test no corre el seed completo.
      // Se recrean desde DEFAULT_RECIPES para no arrastrar recetas de corridas
      // anteriores con códigos de material viejos (p. ej. CEMENTO_PORTLAND_50KG).
      const { DEFAULT_RECIPES } = await import("@casitacalc/calculator-core");
      await prisma.recipe.deleteMany();
      for (const recipe of DEFAULT_RECIPES) {
        const existing = await prisma.recipe.findUnique({ where: { codigo: recipe.codigo } });
        if (existing) continue;
        await prisma.recipe.create({
          data: {
            codigo: recipe.codigo,
            rubro: recipe.rubro,
            sistemaConstructivo: recipe.sistemaConstructivo ?? null,
            tipoTecho: recipe.tipoTecho ?? null,
            items: {
              create: [{ codigoMaterial: "CEMENTO_PORTLAND_25KG", cantidadPorUnidad: 0.1, desperdicioPct: 5 }],
            },
          },
        });
      }

      // Sin publicar: usa precio base del catálogo (9500), sin región.
      const { calculateAndSaveResult, getLatestResult } = await import("@casitacalc/db");
      await calculateAndSaveResult(project.id);
      let latest = await getLatestResult(project.id);
      const cementoAntes = latest?.items.find((i) => i.codigoMaterial === "CEMENTO_PORTLAND_25KG");
      expect(Number(cementoAntes?.precioUnitario)).toBe(9500);
      expect(cementoAntes?.regionPrecio ?? null).toBeNull();

      // Publica relevamiento con precio distinto.
      const { id } = await importarColeccionConCemento("2026-08-20");
      await publishPOST(new Request("http://localhost/pub"), await params({ id }));

      await calculateAndSaveResult(project.id);
      latest = await getLatestResult(project.id);
      const cementoDespues = latest?.items.find((i) => i.codigoMaterial === "CEMENTO_PORTLAND_25KG");
      expect(Number(cementoDespues?.precioUnitario)).toBe(12500);
      expect(cementoDespues?.regionPrecio).toBe("GBA");
      expect(cementoDespues?.fuentePrecio).toBe("Mercado Libre");
      expect(cementoDespues?.fechaPrecio).toBeTruthy();
    } finally {
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    }
  });

  it("historial inmutable con variación entre relevamientos", async () => {
    const { getMaterialPriceHistory } = await import("@casitacalc/db");
    await importarColeccionConCemento(
      "2026-08-01",
      [10000, 10500, 11000, 11500, 12000], // mediana 11000
    );
    const coleccion1 = await prisma.priceCollection.findFirstOrThrow({
      orderBy: { collectedAt: "asc" },
    });
    await publishPOST(new Request("http://localhost/pub"), await params({ id: coleccion1.id }));

    await importarColeccionConCemento(
      "2026-08-21",
      [12000, 12600, 13200, 13800, 14400], // mediana 13200
      true, // supera el umbral de inflación vs 11000; se fuerza para probar el historial
    );
    const coleccion2 = await prisma.priceCollection.findFirstOrThrow({
      where: { collectedAt: { gt: coleccion1.collectedAt } },
    });
    await publishPOST(new Request("http://localhost/pub"), await params({ id: coleccion2.id }));

    const historia = await getMaterialPriceHistory("CEMENTO_PORTLAND_25KG", "GBA");
    const publicadas = historia.filter((h) => h.status === "PUBLISHED");
    expect(publicadas).toHaveLength(2);
    expect(publicadas[0]?.precio).toBe(11000);
    expect(publicadas[0]?.variacionPct).toBeNull();
    expect(publicadas[1]?.precio).toBe(13200);
    expect(publicadas[1]?.variacionPct).toBe(20); // 11000 → 13200
  });
});

describe("detección de cambio de precios", () => {
  it("getPreciosActualizadoEn refleja base del catálogo, publicación y edición manual", async () => {
    const { getPreciosActualizadoEn, updateMaterialPrice } = await import("@casitacalc/db");
    const base = new Date("2026-01-01T00:00:00.000Z");

    // Normaliza la base: la DB de test persiste ediciones manuales de corridas anteriores.
    await prisma.material.updateMany({ data: { fechaActualizacionPrecio: base } });
    expect(await getPreciosActualizadoEn()).toEqual(base);

    // Publicar un relevamiento posterior pisa la fecha, solo en su región.
    const { id } = await importarColeccionConCemento("2026-08-20");
    await publishPOST(new Request("http://localhost/pub"), await params({ id }));
    expect(await getPreciosActualizadoEn()).toEqual(new Date("2026-08-20T00:00:00.000Z"));
    expect(await getPreciosActualizadoEn("CABA")).toEqual(base);

    // Un relevamiento DRAFT no cuenta.
    await importarColeccionConCemento("2026-08-25");
    expect(await getPreciosActualizadoEn()).toEqual(new Date("2026-08-20T00:00:00.000Z"));

    // Una edición manual (sin región) también mueve la aguja en cualquier región.
    await updateMaterialPrice(await materialId("CEMENTO_PORTLAND_25KG"), { precio: 9999 });
    const manual = await getPreciosActualizadoEn("GBA");
    expect(manual!.getTime()).toBeGreaterThan(new Date("2026-08-20T00:00:00.000Z").getTime());

    // Restaura el catálogo: la DB de test persiste entre corridas y tests.
    await prisma.material.update({
      where: { codigo: "CEMENTO_PORTLAND_25KG" },
      data: { precioActual: 9500, fechaActualizacionPrecio: base },
    });
  });
});

describe("exclusión de observaciones y recálculo", () => {
  it("excluir una observación recalcula la mediana en borrador", async () => {
    const { id } = await importarColeccionConCemento();
    const obs = await prisma.priceObservation.findMany({
      where: { collectionId: id, accepted: true },
    });
    // Precios: 12000, 12500, 12500, 13000, 99999 → excluyo el outlier.
    const outlier = obs.find((o) => Number(o.rawPrice) === 99999)!;
    const exRes = await excludePOST(new Request("http://localhost/x"), await params({ id: outlier.id }));
    expect(exRes.status).toBe(200);

    const ref = await prisma.materialReferencePrice.findFirstOrThrow({
      where: { collectionId: id, material: { codigo: "CEMENTO_PORTLAND_25KG" } },
    });
    expect(ref.sampleSize).toBe(4);
    expect(ref.price.toFixed(2)).toBe("12500.00"); // mediana(12000,12500,12500,13000)

    const obsActualizada = await prisma.priceObservation.findUniqueOrThrow({ where: { id: outlier.id } });
    expect(obsActualizada.accepted).toBe(false);
    expect(obsActualizada.rejectionReason).toBe("EXCLUDED_BY_ADMIN");
  });

  it("recalculate reconstruye todas las medianas draft", async () => {
    const { id } = await importarColeccionConCemento();
    await prisma.materialReferencePrice.updateMany({
      where: { collectionId: id },
      data: { price: 1, sampleSize: 99 },
    });
    const res = await recalcPOST(new Request("http://localhost/r"), await params({ id }));
    expect(res.status).toBe(200);
    const ref = await prisma.materialReferencePrice.findFirstOrThrow({
      where: { collectionId: id, material: { codigo: "CEMENTO_PORTLAND_25KG" } },
    });
    expect(ref.price.toFixed(2)).toBe("12500.00");
    expect(ref.sampleSize).toBe(5);
  });

  it("rechazar la colección marca sus referencias REJECTED", async () => {
    const { id } = await importarColeccionConCemento();
    const res = await rejectPOST(new Request("http://localhost/rj"), await params({ id }));
    expect(res.status).toBe(200);
    const refs = await prisma.materialReferencePrice.findMany({ where: { collectionId: id } });
    expect(refs.every((r) => r.status === "REJECTED")).toBe(true);
    const collection = await prisma.priceCollection.findUniqueOrThrow({ where: { id } });
    expect(collection.status).toBe("REJECTED");
  });
});

// ── helpers ──────────────────────────────────────────────────────────────────

async function materialId(codigo: string): Promise<string> {
  const m = await prisma.material.findUniqueOrThrow({ where: { codigo }, select: { id: true } });
  return m.id;
}

/** Importa cemento + el resto del catálogo de test; la mediana de cemento la fija `precios`. */
async function importarColeccionConCemento(
  fecha = "2026-08-22",
  precios: number[] = [12000, 12500, 12500, 13000, 99999], // mediana 12500
  forceAll = false,
): Promise<{ id: string }> {
  const lineas = [
    ...precios.map((p, i) =>
      fila({ collected_at: fecha, raw_price: String(p) }, `c-${fecha}-${i}`),
    ),
    ...filasRestantes(["CEMENTO_PORTLAND_25KG"], `base-${fecha}`, { collected_at: fecha }),
  ];
  const res = await subirCsv(`precios-${fecha}.csv`, lineas, forceAll);
  if (res.status !== 201) throw new Error(`import falló: ${res.status}`);
  return res.json();
}
