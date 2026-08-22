import {
  Rubro,
  type CalculationResult,
  type CalculationResultItem,
  type HouseInput,
  type PriceMap,
  type Recipe,
} from "@casitacalc/shared";
import { computeGeometry } from "./geometry";
import { roundMoney, roundQuantity } from "./rounding";
import {
  DEFAULT_MATERIAL_CATALOG,
  DEFAULT_RECIPES,
  type MaterialCatalog,
} from "./recipes-defaults";

/**
 * Calcula cantidades de materiales por rubro a partir de recetas.
 * No aplica precios: eso lo hace applyPrices() con un PriceMap.
 *
 * @throws Error si falta una receta para la combinación pedida o el
 *         catálogo no conoce algún material de la receta.
 */
export function calculateMaterials(
  input: HouseInput,
  recipes: Recipe[],
  catalog: MaterialCatalog = DEFAULT_MATERIAL_CATALOG,
): CalculationResult {
  const geometria = computeGeometry(input);

  const muroRecipe = recipes.find(
    (r) => r.rubro === Rubro.MAMPOSTERIA && r.sistemaConstructivo === input.sistemaConstructivo,
  );
  if (!muroRecipe) {
    throw new Error(
      `No hay receta de muros configurada para el sistema "${input.sistemaConstructivo}"`,
    );
  }

  const techoRecipe = recipes.find(
    (r) => r.rubro === Rubro.TECHO && r.tipoTecho === input.tipoTecho,
  );
  if (!techoRecipe) {
    throw new Error(`No hay receta de techo configurada para el tipo "${input.tipoTecho}"`);
  }

  const banoRecipe = recipes.find((r) => r.rubro === Rubro.BANOS);
  if (!banoRecipe && input.cantidadBanios > 0) {
    throw new Error("No hay receta de paquete de baños configurada");
  }

  const items: CalculationResultItem[] = [
    ...expandRecipe(muroRecipe, geometria.areaParedesNetaM2, catalog),
    ...(geometria.superficieTechoM2 > 0
      ? expandRecipe(techoRecipe, geometria.superficieTechoM2, catalog)
      : []),
    ...(input.cantidadBanios > 0 && banoRecipe
      ? expandRecipe(banoRecipe, input.cantidadBanios, catalog)
      : []),
  ];

  return {
    items,
    subtotalesPorRubro: {},
    totalGeneral: 0,
    geometria,
  };
}

/** Aplica precios al resultado y computa subtotales por rubro y total. */
export function applyPrices(
  result: CalculationResult,
  priceMap: PriceMap,
): CalculationResult {
  let totalGeneral = 0;
  const subtotalesPorRubro: Record<string, number> = {};

  const items = result.items.map((item) => {
    const precioUnitario = priceMap[item.codigoMaterial];
    if (precioUnitario === undefined || precioUnitario === null) {
      return item;
    }
    const subtotal = roundMoney(precioUnitario * item.cantidadFinal);
    totalGeneral += subtotal;
    subtotalesPorRubro[item.rubro] = roundMoney((subtotalesPorRubro[item.rubro] ?? 0) + subtotal);
    return { ...item, precioUnitario, subtotal };
  });

  return {
    ...result,
    items,
    subtotalesPorRubro,
    totalGeneral: roundMoney(totalGeneral),
  };
}

/** Conveniencia: calcula materiales y aplica precios en un solo paso. */
export function calculateHouse(
  input: HouseInput,
  options?: Partial<{
    recipes: Recipe[];
    catalog: MaterialCatalog;
    prices: PriceMap;
  }>,
): CalculationResult {
  const partial = calculateMaterials(
    input,
    options?.recipes ?? DEFAULT_RECIPES,
    options?.catalog ?? DEFAULT_MATERIAL_CATALOG,
  );
  return options?.prices ? applyPrices(partial, options.prices) : partial;
}

function expandRecipe(
  recipe: Recipe,
  baseCantidad: number,
  catalog: MaterialCatalog,
): CalculationResultItem[] {
  return recipe.items.map((recipeItem) => {
    const material = catalog[recipeItem.codigoMaterial];
    if (!material) {
      throw new Error(
        `El catálogo no contiene el material "${recipeItem.codigoMaterial}" (receta ${recipe.codigo})`,
      );
    }
    const cantidadNeta = baseCantidad * recipeItem.cantidadPorUnidad;
    const cantidadConDesperdicio =
      cantidadNeta * (1 + recipeItem.desperdicioPct / 100);

    return {
      codigoMaterial: recipeItem.codigoMaterial,
      nombreMaterial: material.nombre,
      rubro: recipe.rubro,
      cantidad: Math.round(cantidadNeta * 100) / 100,
      unidad: material.unidad,
      desperdicioPct: recipeItem.desperdicioPct,
      cantidadFinal: roundQuantity(cantidadConDesperdicio, material.unidad),
    };
  });
}
