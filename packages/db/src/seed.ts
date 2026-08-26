import { DEFAULT_RECIPES } from "@casitacalc/calculator-core";
import {
  MATERIAL_CATALOG,
  PriceSourceCode,
  PRICE_SOURCE_LABELS,
  Rubro,
} from "@casitacalc/shared";
import { prisma } from "./client";

/**
 * Precios de referencia ARS (editables desde /materials). Valores orientativos
 * para demo; cada usuario debe ajustarlos a su proveedor/zona.
 */
const PRECIOS_REFERENCIA: Record<string, number> = {
  LADRILLO_HUECO_12X18X33: 650,
  CEMENTO_PORTLAND_25KG: 11000,
  CAL_HIDRATADA_25KG: 4800,
  ARENA: 30000,
  PIEDRA_BOLA: 32000,
  ACERO_LOSA_ADL15: 2600,
  CHAPA_TRAPEZOIDAL_C25: 14500,
  TIRANTE_MADERA_2X4: 3200,
  TORNILLO_AUTOPERFORANTE: 120,
  FILM_BARRERA_HIDRICA: 900,
  INODORO_COMPLETO: 185000,
  LAVATORIO_PEDESTAL: 95000,
  GRIFERIA_LAVATORIO: 78000,
  DUCHA_JUEGO: 85000,
  CANO_PVC_100_4M: 32000,
  CANO_PVC_20_3M: 9000,
  DESAGUE_PISO: 9500,
  SIFON_LAVATORIO: 8500,
  CERAMICA_PISO: 12500,
  CERAMICA_PARED: 11800,
  PEGAMENTO_CERAMICO_25KG: 16500,
  PASTINA: 3500,
};

async function seedMaterials() {
  const fecha = new Date();
  for (const info of MATERIAL_CATALOG) {
    const precio = PRECIOS_REFERENCIA[info.codigo];
    if (precio === undefined) {
      throw new Error(`Falta precio de referencia para "${info.codigo}" en el seed`);
    }
    await prisma.material.upsert({
      where: { codigo: info.codigo },
      create: {
        codigo: info.codigo,
        nombre: info.nombre,
        categoria: info.categoria,
        unidad: info.unidad,
        precioDefault: precio,
        precioActual: precio,
        fechaActualizacionPrecio: fecha,
        fuente: "Referencia demo",
      },
      update: {},
    });
  }

  // Materiales que salieron del catálogo maestro (renames/remociones) quedan
  // fuera de la cobertura total que exige el importador: se eliminan, salvo
  // que tengan historial de precios (ese borrado es decisión humana).
  const codigosActuales = new Set(MATERIAL_CATALOG.map((m) => m.codigo));
  const obsoletos = await prisma.material.findMany({
    where: { codigo: { notIn: [...codigosActuales] } },
    select: { id: true, codigo: true },
  });
  if (obsoletos.length > 0) {
    const ids = obsoletos.map((o) => o.id);
    const [observaciones, referencias] = await Promise.all([
      prisma.priceObservation.count({ where: { materialId: { in: ids } } }),
      prisma.materialReferencePrice.count({ where: { materialId: { in: ids } } }),
    ]);
    if (observaciones > 0 || referencias > 0) {
      throw new Error(
        `Hay datos de precios (${observaciones} observaciones, ${referencias} referencias) para materiales removidos del catálogo (${obsoletos
          .map((o) => o.codigo)
          .join(", ")}); rechazá o eliminá esas colecciones antes de re-seedear`,
      );
    }
    const { count } = await prisma.material.deleteMany({
      where: { codigo: { notIn: [...codigosActuales] } },
    });
    console.log(`✓ Materiales obsoletos eliminados: ${count}`);
  }
  console.log(`✓ Materiales: ${MATERIAL_CATALOG.length}`);
}

/** Receta por defecto → rubro canónico (mapea labels del core). */
function rubroCanonico(rubroLabel: string): string {
  if (rubroLabel === Rubro.MAMPOSTERIA) return Rubro.MAMPOSTERIA;
  if (rubroLabel === Rubro.TECHO) return Rubro.TECHO;
  if (rubroLabel === Rubro.BANOS) return Rubro.BANOS;
  throw new Error(`Rubro desconocido: ${rubroLabel}`);
}

async function seedRecipes() {
  const codigosValidos = new Set(MATERIAL_CATALOG.map((m) => m.codigo));
  for (const recipe of DEFAULT_RECIPES) {
    const items = recipe.items.map((i) => ({
      codigoMaterial: i.codigoMaterial,
      cantidadPorUnidad: i.cantidadPorUnidad,
      desperdicioPct: i.desperdicioPct,
    }));
    // Repara solo recetas con ítems de códigos muertos (renames/remociones del
    // catálogo); las recetas sanas no se tocan para no pisar ediciones.
    const existente = await prisma.recipe.findUnique({
      where: { codigo: recipe.codigo },
      select: { items: { select: { codigoMaterial: true } } },
    });
    const tieneItemsObsoletos =
      existente?.items.some((i) => !codigosValidos.has(i.codigoMaterial)) ?? false;
    await prisma.recipe.upsert({
      where: { codigo: recipe.codigo },
      create: {
        codigo: recipe.codigo,
        rubro: rubroCanonico(recipe.rubro),
        sistemaConstructivo: recipe.sistemaConstructivo ?? null,
        tipoTecho: recipe.tipoTecho ?? null,
        items: { create: items },
      },
      update: tieneItemsObsoletos
        ? {
            rubro: rubroCanonico(recipe.rubro),
            sistemaConstructivo: recipe.sistemaConstructivo ?? null,
            tipoTecho: recipe.tipoTecho ?? null,
            items: { deleteMany: {}, create: items },
          }
        : {},
    });
  }
  console.log(`✓ Recetas: ${DEFAULT_RECIPES.length}`);
}

/** Fuentes de precios iniciales (el mecanismo externo llega después). */
async function seedPriceSources() {
  for (const code of Object.values(PriceSourceCode)) {
    await prisma.priceSource.upsert({
      where: { code },
      create: { code, name: PRICE_SOURCE_LABELS[code], enabled: true },
      update: {},
    });
  }
  console.log(`✓ Fuentes de precios: ${Object.values(PriceSourceCode).length}`);
}

async function main() {
  await seedMaterials();
  await seedRecipes();
  await seedPriceSources();
}

main()
  .then(() => console.log("Seed completado"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
