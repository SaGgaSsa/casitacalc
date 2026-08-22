import { DEFAULT_MATERIAL_CATALOG, DEFAULT_RECIPES } from "@casitacalc/calculator-core";
import { Rubro, Unit } from "@casitacalc/shared";
import { prisma } from "./client";

/**
 * Precios de referencia ARS (editables desde /materials). Valores orientativos
 * para demo; cada usuario debe ajustarlos a su proveedor/zona.
 */
const PRECIOS_REFERENCIA: Record<string, number> = {
  LADRILLO_HUECO_18X18X33: 650,
  CEMENTO_PORTLAND_50KG: 9500,
  CAL_HIDRATADA_25KG: 4800,
  ARENA_GRUESA: 28000,
  ARENA_FINA: 30000,
  PIEDRA_BOLA: 32000,
  ACERO_LOSA_ADL15: 2600,
  CHAPA_TRAPEZOIDAL_C25: 14500,
  TIRANTE_MADERA_2X3: 3200,
  TORNILLO_AUTOPERFORANTE: 120,
  FILM_BARRERA_HIDRICA: 900,
  INODORO_COMPLETO: 185000,
  LAVATORIO_PEDESTAL: 95000,
  GRIFERIA_LAVATORIO: 78000,
  DUCHA_JUEGO: 85000,
  CANO_PVC_100_4M: 32000,
  CANO_PVC_40_4M: 18000,
  DESAGUE_PISO: 9500,
  SIFON_LAVATORIO: 8500,
  CERAMICA_PISO: 12500,
  CERAMICA_PARED: 11800,
  PEGAMENTO_CERAMICO_30KG: 16500,
  PASTINA: 3500,
};

const CATEGORIAS: Record<string, string> = {
  LADRILLO_HUECO_18X18X33: "Mampostería",
  CEMENTO_PORTLAND_50KG: "Aglomerantes",
  CAL_HIDRATADA_25KG: "Aglomerantes",
  ARENA_GRUESA: "Agregados",
  ARENA_FINA: "Agregados",
  PIEDRA_BOLA: "Agregados",
  ACERO_LOSA_ADL15: "Hierro y acero",
  CHAPA_TRAPEZOIDAL_C25: "Techo",
  TIRANTE_MADERA_2X3: "Techo",
  TORNILLO_AUTOPERFORANTE: "Techo",
  FILM_BARRERA_HIDRICA: "Techo",
  INODORO_COMPLETO: "Sanitarios",
  LAVATORIO_PEDESTAL: "Sanitarios",
  GRIFERIA_LAVATORIO: "Sanitarios",
  DUCHA_JUEGO: "Sanitarios",
  CANO_PVC_100_4M: "Sanitarios",
  CANO_PVC_40_4M: "Sanitarios",
  DESAGUE_PISO: "Sanitarios",
  SIFON_LAVATORIO: "Sanitarios",
  CERAMICA_PISO: "Revestimientos",
  CERAMICA_PARED: "Revestimientos",
  PEGAMENTO_CERAMICO_30KG: "Adhesivos",
  PASTINA: "Adhesivos",
};

async function seedMaterials() {
  const fecha = new Date();
  for (const [codigo, info] of Object.entries(DEFAULT_MATERIAL_CATALOG)) {
    const precio = PRECIOS_REFERENCIA[codigo];
    if (precio === undefined) {
      throw new Error(`Falta precio de referencia para "${codigo}" en el seed`);
    }
    await prisma.material.upsert({
      where: { codigo },
      create: {
        codigo,
        nombre: info.nombre,
        categoria: CATEGORIAS[codigo] ?? "General",
        unidad: info.unidad satisfies Unit as string,
        precioDefault: precio,
        precioActual: precio,
        fechaActualizacionPrecio: fecha,
        fuente: "Referencia demo",
      },
      update: {},
    });
  }
  console.log(`✓ Materiales: ${Object.keys(DEFAULT_MATERIAL_CATALOG).length}`);
}

/** Receta por defecto → rubro canónico (mapea labels del core). */
function rubroCanonico(rubroLabel: string): string {
  if (rubroLabel === Rubro.MAMPOSTERIA) return Rubro.MAMPOSTERIA;
  if (rubroLabel === Rubro.TECHO) return Rubro.TECHO;
  if (rubroLabel === Rubro.BANOS) return Rubro.BANOS;
  throw new Error(`Rubro desconocido: ${rubroLabel}`);
}

async function seedRecipes() {
  for (const recipe of DEFAULT_RECIPES) {
    const data = {
      codigo: recipe.codigo,
      rubro: rubroCanonico(recipe.rubro),
      sistemaConstructivo: recipe.sistemaConstructivo ?? null,
      tipoTecho: recipe.tipoTecho ?? null,
      items: {
        create: recipe.items.map((i) => ({
          codigoMaterial: i.codigoMaterial,
          cantidadPorUnidad: i.cantidadPorUnidad,
          desperdicioPct: i.desperdicioPct,
        })),
      },
    };
    await prisma.recipe.upsert({
      where: { codigo: recipe.codigo },
      create: data,
      update: {},
    });
  }
  console.log(`✓ Recetas: ${DEFAULT_RECIPES.length}`);
}

async function main() {
  await seedMaterials();
  await seedRecipes();
}

main()
  .then(() => console.log("Seed completado"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
