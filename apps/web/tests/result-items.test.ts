import { describe, expect, it } from "vitest";
import { prisma } from "@casitacalc/db";
import { makeVisitorToken, hashToken } from "./helpers";

/**
 * Los ítems persistidos conservan la receta que los generó, para que la UI
 * pueda distinguir (p. ej.) revoque interior de exterior.
 */
describe("procedencia de ítems en resultados guardados", () => {
  it("calculateAndSaveResult → getLatestResult conserva recetaCodigo", async () => {
    const project = await prisma.project.create({
      data: {
        nombreProyecto: "Casa procedencia",
        anchoM: 8, largoM: 10, alturaParedesM: 2.7,
        sistemaConstructivo: "LADRILLO_HUECO", tipoTecho: "CHAPA", anguloTechoGrados: 20,
        cantidadBanios: 1, ownerTokenHash: hashToken(makeVisitorToken()),
        openings: {
          create: [
            { tipo: "PUERTA", cantidad: 1 },
            { tipo: "VENTANA", cantidad: 2 },
          ],
        },
      },
      select: { id: true },
    });

    try {
      // Recetas completas desde el motor (la DB de test no corre el seed).
      const { DEFAULT_RECIPES } = await import("@casitacalc/calculator-core");
      await prisma.recipe.deleteMany();
      for (const recipe of DEFAULT_RECIPES) {
        await prisma.recipe.create({
          data: {
            codigo: recipe.codigo,
            rubro: recipe.rubro,
            sistemaConstructivo: recipe.sistemaConstructivo ?? null,
            tipoTecho: recipe.tipoTecho ?? null,
            tipoAbertura: recipe.tipoAbertura ?? null,
            items: {
              create: recipe.items.map((i) => ({
                codigoMaterial: i.codigoMaterial,
                cantidadPorUnidad: i.cantidadPorUnidad,
                desperdicioPct: i.desperdicioPct,
              })),
            },
          },
        });
      }

      const { calculateAndSaveResult, getLatestResult } = await import("@casitacalc/db");
      await calculateAndSaveResult(project.id);
      const latest = await getLatestResult(project.id);
      expect(latest).not.toBeNull();

      for (const item of latest!.items) {
        expect(item.recetaCodigo, item.codigoMaterial).toBeDefined();
      }
      const muro = latest!.items.find((i) => i.codigoMaterial === "LADRILLO_HUECO_12X18X33");
      expect(muro?.recetaCodigo).toBe("MURO_LADRILLO_HUECO");
      const revoques = new Set(
        latest!.items
          .filter((i) => i.rubro === "Revoques")
          .map((i) => i.recetaCodigo),
      );
      expect(revoques).toEqual(new Set(["REVOQUE_INTERIOR", "REVOQUE_EXTERIOR"]));
      const aberturas = new Set(
        latest!.items
          .filter((i) => i.rubro === "Aberturas")
          .map((i) => i.recetaCodigo),
      );
      expect(aberturas).toEqual(new Set(["ABERTURA_PUERTA", "ABERTURA_VENTANA"]));
    } finally {
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    }
  });
});
