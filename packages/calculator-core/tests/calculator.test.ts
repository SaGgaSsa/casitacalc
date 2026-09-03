import { describe, expect, it } from "vitest";
import { RoofType, Rubro, Unit } from "@casitacalc/shared";
import type { HouseInput, Recipe } from "@casitacalc/shared";
import { calculateHouse } from "../src/calculator";
import { DEFAULT_MATERIAL_CATALOG, DEFAULT_RECIPES } from "../src/recipes-defaults";

function baseInput(overrides: Partial<HouseInput> = {}): HouseInput {
  return {
    nombreProyecto: "Casa test",
    anchoM: 8,
    largoM: 10,
    alturaParedesM: 2.7,
    sistemaConstructivo: "LADRILLO_HUECO",
    tipoTecho: RoofType.CHAPA,
    anguloTechoGrados: 30,
    cantidadBanios: 1,
    aberturas: [],
    ...overrides,
  };
}

const ABERTURAS_TIPICAS: HouseInput["aberturas"] = [
  { tipo: "PUERTA", cantidad: 1 },
  { tipo: "VENTANA", cantidad: 4 },
];

function itemEn(resulta: ReturnType<typeof calculateHouse>, codigoMaterial: string, rubro?: string) {
  const found = resulta.items.find(
    (i) => i.codigoMaterial === codigoMaterial && (rubro === undefined || i.rubro === rubro),
  );
  if (!found) throw new Error(`No se encontró ${codigoMaterial}${rubro ? ` (${rubro})` : ""}`);
  return found;
}

function item(codigoMaterial: string, rubro?: string) {
  return itemEn(calculateHouse(baseInput()), codigoMaterial, rubro);
}

const MURO_CODIGOS = [
  "LADRILLO_HUECO_12X18X33",
  "CEMENTO_PORTLAND_25KG",
  "CAL_HIDRATADA_25KG",
  "ARENA",
] as const;

describe("procedencia de ítems — recetaCodigo", () => {
  it("cada ítem declara el código de la receta que lo generó", () => {
    const result = calculateHouse(baseInput({ aberturas: ABERTURAS_TIPICAS }));
    for (const i of result.items) {
      expect(i.recetaCodigo, i.codigoMaterial).toBeDefined();
    }
    expect(itemEn(result, "LADRILLO_HUECO_12X18X33", Rubro.MAMPOSTERIA).recetaCodigo).toBe(
      "MURO_LADRILLO_HUECO",
    );
    expect(itemEn(result, "CEMENTO_PORTLAND_25KG", Rubro.REVOQUES).recetaCodigo).toMatch(
      /^REVOQUE_(INTERIOR|EXTERIOR)$/,
    );
  });

  it("los revoques distinguen interior de exterior por receta", () => {
    const result = calculateHouse(baseInput());
    const cementos = result.items.filter(
      (i) => i.codigoMaterial === "CEMENTO_PORTLAND_25KG" && i.rubro === Rubro.REVOQUES,
    );
    expect(new Set(cementos.map((i) => i.recetaCodigo))).toEqual(
      new Set(["REVOQUE_INTERIOR", "REVOQUE_EXTERIOR"]),
    );
  });
});

describe("calculateMaterials — muros", () => {
  it("casa 8x10 sin aberturas: 97.2 m² brutos → ladrillos con 10% de desperdicio", () => {
    const ladrillos = item("LADRILLO_HUECO_12X18X33", Rubro.MAMPOSTERIA);
    // 97.2 m² * 16 un/m² * 1.10 = 1710.72 → ceil 1711
    expect(ladrillos.cantidad).toBeCloseTo(1555.2);
    expect(ladrillos.cantidadFinal).toBe(1711);
    expect(ladrillos.rubro).toBe("Mampostería");
  });

  it("las aberturas NO reducen los materiales de muro (área bruta)", () => {
    const sin = calculateHouse(baseInput());
    const con = calculateHouse(baseInput({ aberturas: ABERTURAS_TIPICAS }));
    for (const codigo of MURO_CODIGOS) {
      const a = itemEn(sin, codigo, Rubro.MAMPOSTERIA);
      const b = itemEn(con, codigo, Rubro.MAMPOSTERIA);
      expect(b.cantidad, codigo).toBe(a.cantidad);
      expect(b.cantidadFinal, codigo).toBe(a.cantidadFinal);
    }
    // La geometría sí sigue registrando las aberturas (cantidad, no m²).
    expect(con.geometria.cantidadAberturas).toBe(5);
    expect(con.geometria.areaMuroComputableM2).toBeCloseTo(97.2);
  });

  it("la bolsa de cemento es discreta: se redondea hacia arriba", () => {
    const cemento = item("CEMENTO_PORTLAND_25KG", Rubro.MAMPOSTERIA);
    // 97.2 * 0.24 * 1.05 = 24.494 → comprar 25
    expect(cemento.unidad).toBe(Unit.BOLSA);
    expect(cemento.cantidadFinal).toBe(25);
  });

  it("selecciona la receta de muros según el sistema constructivo", () => {
    const muroSteel = {
      codigo: "MURO_STEEL",
      rubro: Rubro.MAMPOSTERIA,
      sistemaConstructivo: "STEEL_FRAMING",
      items: [
        { codigoMaterial: "LADRILLO_HUECO_12X18X33", cantidadPorUnidad: 1, desperdicioPct: 0 },
      ],
    } as unknown as Recipe;
    const conSteel = calculateHouse(
      baseInput({ sistemaConstructivo: "STEEL_FRAMING" as never }),
      { recipes: [...DEFAULT_RECIPES, muroSteel] },
    );
    // 97.2 m² * 1 un/m² sin desperdicio → ceil 98 (97.2 → 98)
    expect(itemEn(conSteel, "LADRILLO_HUECO_12X18X33", Rubro.MAMPOSTERIA).cantidadFinal).toBe(98);
  });
});

describe("calculateMaterials — revoques", () => {
  it("genera revoque interior y exterior sobre el área bruta de muros", () => {
    const result = calculateHouse(baseInput());
    const rubros = new Set(result.items.map((i) => i.rubro));
    expect(rubros.has(Rubro.REVOQUES)).toBe(true);
    // Revoque exterior: 97.2 * 0.15 * 1.05 = 15.309 → 16 bolsas
    const ext = result.items.filter((i) => i.rubro === Rubro.REVOQUES);
    expect(ext.length).toBeGreaterThan(0);
    const cementoRevoques = result.items
      .filter((i) => i.rubro === Rubro.REVOQUES && i.codigoMaterial === "CEMENTO_PORTLAND_25KG")
      .reduce((total, i) => total + i.cantidadFinal, 0);
    expect(cementoRevoques).toBe(16 + 11); // exterior 16 + interior 11 (97.2*0.10*1.05=10.206→11)
  });

  it("los revoques escalan con la superficie de muro", () => {
    const chica = calculateHouse(baseInput({ anchoM: 4, largoM: 5 }));
    // bruta chica: 2*(4+5)*2.7 = 48.6 = mitad de 97.2
    const grande = itemEn(calculateHouse(baseInput()), "ARENA", Rubro.REVOQUES);
    const pequena = itemEn(chica, "ARENA", Rubro.REVOQUES);
    expect(pequena.cantidad).toBeCloseTo(grande.cantidad / 2);
  });

  it("las aberturas tampoco reducen los revoques", () => {
    const sin = calculateHouse(baseInput());
    const con = calculateHouse(baseInput({ aberturas: ABERTURAS_TIPICAS }));
    expect(itemEn(con, "ARENA", Rubro.REVOQUES).cantidadFinal).toBe(
      itemEn(sin, "ARENA", Rubro.REVOQUES).cantidadFinal,
    );
  });

  it("falla con error descriptivo si no hay recetas de revoques", () => {
    expect(() =>
      calculateHouse(baseInput(), {
        recipes: DEFAULT_RECIPES.filter((r) => r.rubro !== Rubro.REVOQUES),
      }),
    ).toThrow(/revoque/i);
  });
});

describe("calculateMaterials — contrapiso", () => {
  it("escala con la superficie de planta (80 m², hormigón 10 cm)", () => {
    const result = calculateHouse(baseInput());
    // cemento: 80 * 0.8 * 1.05 = 67.2 → 68 bolsas
    expect(itemEn(result, "CEMENTO_PORTLAND_25KG", Rubro.CONTRAPISO).cantidadFinal).toBe(68);
    // arena: 80 * 0.06 * 1.10 = 5.28 m³
    expect(itemEn(result, "ARENA", Rubro.CONTRAPISO).cantidadFinal).toBeCloseTo(5.28);
    // piedra: 80 * 0.08 * 1.10 = 7.04 m³
    expect(itemEn(result, "PIEDRA_BOLA", Rubro.CONTRAPISO).cantidadFinal).toBeCloseTo(7.04);
  });

  it("media planta → mitad de materiales", () => {
    const mitad = calculateHouse(baseInput({ anchoM: 8, largoM: 5 }));
    expect(itemEn(mitad, "CEMENTO_PORTLAND_25KG", Rubro.CONTRAPISO).cantidadFinal).toBe(34);
  });

  it("los ítems declaran la receta de 10 cm (la UI lee el espesor de ahí)", () => {
    const result = calculateHouse(baseInput());
    const codigos = new Set(
      result.items
        .filter((i) => i.rubro === Rubro.CONTRAPISO)
        .map((i) => i.recetaCodigo),
    );
    expect(codigos).toEqual(new Set(["CONTRAPISO_HORMIGON_10CM"]));
  });

  it("falla con error descriptivo si no hay receta de contrapiso", () => {
    expect(() =>
      calculateHouse(baseInput(), {
        recipes: DEFAULT_RECIPES.filter((r) => r.rubro !== Rubro.CONTRAPISO),
      }),
    ).toThrow(/contrapiso/i);
  });
});

describe("calculateMaterials — pisos generales", () => {
  it("descuenta la superficie estándar del baño (6 m² por baño)", () => {
    const result = calculateHouse(baseInput()); // 1 baño
    // base: 80 − 6 = 74 m² → cerámica 74 * 1 * 1.10 = 81.4 m²
    const ceramica = itemEn(result, "CERAMICA_PISO", Rubro.PISOS);
    expect(ceramica.cantidad).toBeCloseTo(74);
    expect(ceramica.cantidadFinal).toBeCloseTo(81.4);
  });

  it("cero baños → toda la planta es piso general", () => {
    const result = calculateHouse(baseInput({ cantidadBanios: 0 }));
    expect(itemEn(result, "CERAMICA_PISO", Rubro.PISOS).cantidad).toBeCloseTo(80);
    expect(result.items.some((i) => i.rubro === Rubro.BANOS)).toBe(false);
  });

  it("dos baños descuentan 12 m²", () => {
    const result = calculateHouse(baseInput({ cantidadBanios: 2 }));
    expect(itemEn(result, "CERAMICA_PISO", Rubro.PISOS).cantidad).toBeCloseTo(68);
    // El paquete de baño sigue intacto (sin doble conteo en su contra).
    expect(itemEn(result, "CERAMICA_PISO", Rubro.BANOS).cantidad).toBeCloseTo(12);
  });

  it("sin dato de piso en la receta del baño no hay descuento", () => {
    const sinPiso: Recipe[] = DEFAULT_RECIPES.map((r) =>
      r.rubro === Rubro.BANOS
        ? { ...r, items: r.items.filter((i) => i.codigoMaterial !== "CERAMICA_PISO") }
        : r,
    );
    const result = calculateHouse(baseInput(), { recipes: sinPiso });
    expect(itemEn(result, "CERAMICA_PISO", Rubro.PISOS).cantidad).toBeCloseTo(80);
  });

  it("planta menor que los baños → sin items de pisos (mínimo 0)", () => {
    const result = calculateHouse(
      baseInput({ anchoM: 2, largoM: 2, cantidadBanios: 1 }),
    );
    expect(result.items.some((i) => i.rubro === Rubro.PISOS)).toBe(false);
  });

  it("falla con error descriptivo si no hay receta de pisos", () => {
    expect(() =>
      calculateHouse(baseInput(), {
        recipes: DEFAULT_RECIPES.filter((r) => r.rubro !== Rubro.PISOS),
      }),
    ).toThrow(/piso/i);
  });
});

describe("calculateMaterials — aberturas como rubro", () => {
  it("convierte cada tipo de abertura en items con etiqueta de exterior", () => {
    const result = calculateHouse(baseInput({ aberturas: ABERTURAS_TIPICAS }));
    const puerta = itemEn(result, "PUERTA_ESTANDAR", Rubro.ABERTURAS);
    expect(puerta.nombreMaterial).toBe("Puerta exterior");
    expect(puerta.cantidadFinal).toBe(1);
    expect(puerta.unidad).toBe(Unit.UN);
    const ventana = itemEn(result, "VENTANA_ESTANDAR", Rubro.ABERTURAS);
    expect(ventana.nombreMaterial).toBe("Ventana exterior (ref. 120 × 110 cm)");
    expect(ventana.cantidadFinal).toBe(4);
  });

  it("agrupa aberturas del mismo tipo y suma cantidades", () => {
    const result = calculateHouse(
      baseInput({
        aberturas: [
          { tipo: "VENTANA", cantidad: 2 },
          { tipo: "VENTANA", cantidad: 3 },
          { tipo: "PUERTA", cantidad: 1 },
        ],
      }),
    );
    const ventanas = result.items.filter((i) => i.rubro === Rubro.ABERTURAS);
    expect(ventanas).toHaveLength(2);
    const ventana = ventanas.find((i) => i.codigoMaterial === "VENTANA_ESTANDAR")!;
    expect(ventana.cantidadFinal).toBe(5);
  });

  it("sin aberturas no hay rubro Aberturas", () => {
    expect(calculateHouse(baseInput()).items.some((i) => i.rubro === Rubro.ABERTURAS)).toBe(false);
  });

  it("falla con error descriptivo si falta la receta del tipo cargado", () => {
    expect(() =>
      calculateHouse(baseInput({ aberturas: ABERTURAS_TIPICAS }), {
        recipes: DEFAULT_RECIPES.filter((r) => r.codigo !== "ABERTURA_PUERTA"),
      }),
    ).toThrow(/abertura|puerta/i);
  });
});

describe("calculateMaterials — techo", () => {
  it("chapa a 30° usa la superficie inclinada", () => {
    const chapa = item("CHAPA_TRAPEZOIDAL_C25");
    // techo: 80 / cos30° ≈ 92.376 m²; chapa: × 1.05 × 1.05 ≈ 101.85 ml
    expect(chapa.cantidadFinal).toBe(102);
  });

  it("losa: superficie = planta y agrega acero/hormigón", () => {
    const result = calculateHouse(baseInput({ tipoTecho: RoofType.LOSA, anguloTechoGrados: 0 }));
    const acero = result.items.find((i) => i.codigoMaterial === "ACERO_LOSA_ADL15");
    expect(acero?.cantidadFinal).toBe(840); // 80 m² * 10 kg/m² * 1.05
    expect(result.items.some((i) => i.codigoMaterial === "PIEDRA_BOLA")).toBe(true);
  });

  it("no incluye chapas ni tornillos cuando el techo es losa (y viceversa)", () => {
    const losa = calculateHouse(baseInput({ tipoTecho: RoofType.LOSA, anguloTechoGrados: 0 }));
    expect(losa.items.some((i) => i.codigoMaterial === "CHAPA_TRAPEZOIDAL_C25")).toBe(false);

    const chapaResult = calculateHouse(baseInput());
    expect(chapaResult.items.some((i) => i.codigoMaterial === "ACERO_LOSA_ADL15")).toBe(false);
  });
});

describe("calculateMaterials — baños", () => {
  it("un baño multiplica el paquete por 1", () => {
    const inodoro = item("INODORO_COMPLETO");
    expect(inodoro.cantidadFinal).toBe(1);
    expect(item("PEGAMENTO_CERAMICO_25KG", Rubro.BANOS).cantidadFinal).toBe(5); // 4*1*1.05
  });

  it("dos baños duplican el paquete", () => {
    const inodoro = calculateHouse(baseInput({ cantidadBanios: 2 })).items.find(
      (i) => i.codigoMaterial === "INODORO_COMPLETO",
    );
    expect(inodoro?.cantidadFinal).toBe(2);
  });

  it("cero baños no agrega items del paquete", () => {
    const result = calculateHouse(baseInput({ cantidadBanios: 0 }));
    expect(result.items.some((i) => i.rubro === "Baños")).toBe(false);
  });
});

describe("calculateMaterials — waste y rounding", () => {
  it("el desperdicio se aplica por RecipeItem", () => {
    const sinWaste: Recipe[] = DEFAULT_RECIPES.map((r) =>
      r.rubro === Rubro.MAMPOSTERIA
        ? { ...r, items: r.items.map((i) => ({ ...i, desperdicioPct: 0 })) }
        : r,
    );
    const result = calculateHouse(baseInput(), { recipes: sinWaste });
    // 97.2 * 16 sin desperdicio = 1555.2 → ceil 1556
    expect(itemEn(result, "LADRILLO_HUECO_12X18X33", Rubro.MAMPOSTERIA).cantidadFinal).toBe(1556);
  });

  it("arena (m³ continuo) conserva 2 decimales y bolsas van a entero", () => {
    const arena = item("ARENA", Rubro.MAMPOSTERIA);
    expect(arena.cantidadFinal).toBeCloseTo(2.35); // 97.2*0.022*1.10
    expect(Number.isInteger(item("LADRILLO_HUECO_12X18X33", Rubro.MAMPOSTERIA).cantidadFinal)).toBe(true);
  });
});

describe("calculateMaterials — errores", () => {
  it("falla si no hay receta para el sistema constructivo", () => {
    expect(() =>
      calculateHouse(baseInput({ sistemaConstructivo: "STEEL_FRAMING" as never })),
    ).toThrow(/receta de muros/i);
  });

  it("falla si el catálogo no conoce un material de la receta", () => {
    const catalogoIncompleto = { ...DEFAULT_MATERIAL_CATALOG };
    delete (catalogoIncompleto as Partial<typeof catalogoIncompleto>).ARENA;
    expect(() =>
      calculateHouse(baseInput(), { catalog: catalogoIncompleto }),
    ).toThrow(/ARENA/);
  });
});
