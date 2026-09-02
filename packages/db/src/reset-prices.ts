import { prisma } from "./client";

/**
 * Vacía el pipeline de relevamientos para poder recargar un CSV desde cero:
 * borra observaciones, precios de referencia y colecciones (DRAFT y PUBLISHED).
 *
 * NO toca: catálogo de materiales, fuentes de precios, recetas, proyectos
 * ni resultados calculados (esos conservan sus precios como historial).
 *
 * Uso:
 *   pnpm --filter @casitacalc/db exec tsx src/reset-prices.ts          # dry-run
 *   pnpm --filter @casitacalc/db exec tsx src/reset-prices.ts --apply  # ejecuta
 *
 * Actúa sobre la DB de DATABASE_URL (packages/db/.env). Para otra base,
 * exportar DATABASE_URL antes de correrlo.
 */
async function contar() {
  const [observations, referencePrices, collections] = await Promise.all([
    prisma.priceObservation.count(),
    prisma.materialReferencePrice.count(),
    prisma.priceCollection.count(),
  ]);
  return { observations, referencePrices, collections };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const antes = await contar();
  console.log("Observaciones:", antes.observations);
  console.log("Precios de referencia:", antes.referencePrices);
  console.log("Colecciones:", antes.collections);

  if (!apply) {
    console.log("Dry-run: nada borrado. Reejecutar con --apply para vaciar.");
    return;
  }

  // Orden seguro por FK: observaciones → referencias → colecciones.
  await prisma.$transaction([
    prisma.priceObservation.deleteMany(),
    prisma.materialReferencePrice.deleteMany(),
    prisma.priceCollection.deleteMany(),
  ]);

  const despues = await contar();
  console.log("Después:", JSON.stringify(despues));
}

main()
  .catch((e) => {
    console.error("reset-prices falló:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
