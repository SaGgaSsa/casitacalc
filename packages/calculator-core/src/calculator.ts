import {
  OpeningType,
  Rubro,
  type CalculationResult,
  type CalculationResultItem,
  type HouseInput,
  type Opening,
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

  const revoqueRecipes = recipes.filter((r) => r.rubro === Rubro.REVOQUES);
  if (revoqueRecipes.length === 0) {
    throw new Error("No hay recetas de revoques configuradas");
  }

  const contrapisoRecipes = recipes.filter((r) => r.rubro === Rubro.CONTRAPISO);
  if (contrapisoRecipes.length === 0) {
    throw new Error("No hay recetas de contrapiso configuradas");
  }

  const pisoRecipes = recipes.filter((r) => r.rubro === Rubro.PISOS);
  if (pisoRecipes.length === 0) {
    throw new Error("No hay recetas de pisos configuradas");
  }

  const items: CalculationResultItem[] = [
    ...expandRecipe(muroRecipe, geometria.areaMuroComputableM2, catalog),
    ...revoqueRecipes.flatMap((r) =>
      expandRecipe(r, geometria.areaMuroComputableM2, catalog),
    ),
    ...contrapisoRecipes.flatMap((r) =>
      expandRecipe(r, geometria.superficiePlantaM2, catalog),
    ),
    ...expandPisos(pisoRecipes, banoRecipe, input, geometria.superficiePlantaM2, catalog),
    ...(geometria.superficieTechoM2 > 0
      ? expandRecipe(techoRecipe, geometria.superficieTechoM2, catalog)
      : []),
    ...(input.cantidadBanios > 0 && banoRecipe
      ? expandRecipe(banoRecipe, input.cantidadBanios, catalog)
      : []),
    ...expandAberturas(recipes, input.aberturas, catalog),
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
  nombreOverride?: (codigoMaterial: string, nombreCatalogo: string) => string,
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
      nombreMaterial: nombreOverride
        ? nombreOverride(recipeItem.codigoMaterial, material.nombre)
        : material.nombre,
      rubro: recipe.rubro,
      cantidad: Math.round(cantidadNeta * 100) / 100,
      unidad: material.unidad,
      desperdicioPct: recipeItem.desperdicioPct,
      cantidadFinal: roundQuantity(cantidadConDesperdicio, material.unidad),
    };
  });
}

/**
 * Superficie de piso estándar por baño, leída de la receta del paquete
 * (ítem CERAMICA_PISO). Fuente única: no duplicar este número en constantes.
 * Si la receta no declara ese ítem (configuración mínima), no hay descuento.
 */
function pisoBanioM2PorUnidad(banoRecipe: Recipe | undefined): number {
  return banoRecipe?.items.find((i) => i.codigoMaterial === "CERAMICA_PISO")?.cantidadPorUnidad ?? 0;
}

/**
 * Pisos generales = planta menos la superficie ya incluida en el paquete
 * de baños (evita doble conteo). Con base ≤ 0 no genera ítems.
 */
function expandPisos(
  pisoRecipes: Recipe[],
  banoRecipe: Recipe | undefined,
  input: HouseInput,
  superficiePlantaM2: number,
  catalog: MaterialCatalog,
): CalculationResultItem[] {
  const base = Math.max(
    0,
    superficiePlantaM2 - pisoBanioM2PorUnidad(banoRecipe) * input.cantidadBanios,
  );
  if (base <= 0) return [];
  return pisoRecipes.flatMap((r) => expandRecipe(r, base, catalog));
}

/** 1.2 → "1,20" (formato argentino para etiquetas de aberturas). */
function formatoMedida(m: number): string {
  return m.toFixed(2).replace(".", ",");
}

function etiquetaAbertura(abertura: Opening): string {
  const tipo = abertura.tipo === OpeningType.PUERTA ? "Puerta" : "Ventana";
  return `${tipo} ${formatoMedida(abertura.anchoM)} × ${formatoMedida(abertura.altoM)} m`;
}

/**
 * Rubro Aberturas: agrupa el input por (tipo, dimensiones) y expande la
 * receta del tipo con base = cantidad total del grupo. Preserva las
 * dimensiones originales en el nombre del ítem para una futura
 * correspondencia Opening → producto comercial (OpeningSpec).
 */
function expandAberturas(
  recipes: Recipe[],
  aberturas: Opening[],
  catalog: MaterialCatalog,
): CalculationResultItem[] {
  const grupos = new Map<string, { abertura: Opening; cantidad: number }>();
  for (const abertura of aberturas) {
    const clave = `${abertura.tipo}|${abertura.anchoM}|${abertura.altoM}`;
    const grupo = grupos.get(clave);
    if (grupo) grupo.cantidad += abertura.cantidad;
    else grupos.set(clave, { abertura, cantidad: abertura.cantidad });
  }

  const items: CalculationResultItem[] = [];
  for (const { abertura, cantidad } of grupos.values()) {
    const recipe = recipes.find(
      (r) => r.rubro === Rubro.ABERTURAS && r.tipoAbertura === abertura.tipo,
    );
    if (!recipe) {
      throw new Error(
        `No hay receta de aberturas configurada para el tipo "${abertura.tipo}"`,
      );
    }
    const etiqueta = etiquetaAbertura(abertura);
    items.push(...expandRecipe(recipe, cantidad, catalog, () => etiqueta));
  }
  return items;
}
