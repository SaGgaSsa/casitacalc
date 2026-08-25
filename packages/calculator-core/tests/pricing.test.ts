import { describe, expect, it } from "vitest";
import {
  computeReferenceProposals,
  hashDedupeKey,
  median,
  observationDedupeKey,
  parseCsvText,
  validatePriceCsvRow,
  type ParsedCsvRow,
  type PriceRowContext,
} from "../src/pricing";
import { RejectionReason, RowStatus } from "@casitacalc/shared";

const CTX: PriceRowContext = {
  enabledSources: ["EASY", "MERCADOLIBRE", "MANUAL"],
  materialsByCode: {
    CEMENTO_PORTLAND_50KG: { unidad: "bolsa" },
    LADRILLO_HUECO_12X18X33: { unidad: "un" },
    ARENA_GRUESA: { unidad: "m3" },
    CAL_HIDRATADA_25KG: { unidad: "bolsa" },
  },
};

function csvRow(line: number, overrides: Record<string, string> = {}): ParsedCsvRow {
  return {
    line,
    data: {
      source: "MERCADOLIBRE",
      region: "GBA",
      collected_at: "2026-08-22",
      material_code: "CEMENTO_PORTLAND_50KG",
      external_id: "MLA123",
      title: "Cemento Holcim 50kg",
      url: "https://articulo.mercadolibre.com.ar/MLA123",
      currency: "ARS",
      raw_price: "12500",
      package_quantity: "1",
      package_unit: "BAG_50KG",
      brand: "Holcim",
      seller: "",
      accepted: "true",
      rejection_reason: "",
      ...overrides,
    },
  };
}

describe("parseCsvText", () => {
  it("parsea un CSV válido con comillas y comas embebidas", () => {
    const text = [
      "source,title,raw_price",
      'MERCADOLIBRE,"Cemento, marca X",12500',
      "EASY,Cemento Y,12999",
    ].join("\n");
    const parsed = parseCsvText(text);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.data.title).toBe("Cemento, marca X");
    expect(parsed.rows[1]?.data.source).toBe("EASY");
  });

  it("reporta filas con cantidad de columnas incorrecta sin romper el resto", () => {
    const text = ["source,title", "MERCADOLIBRE,Cemento,extra", "EASY,Otro"].join("\n");
    const parsed = parseCsvText(text);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]?.line).toBe(2);
  });

  it("soporta CRLF y BOM", () => {
    const parsed = parseCsvText(
      "\uFEFFsource,title\r\nEASY,Cemento\r\n",
    );
    expect(parsed.headers).toEqual(["source", "title"]);
    expect(parsed.rows).toHaveLength(1);
  });
});

describe("validatePriceCsvRow — validaciones", () => {
  it("acepta una fila válida y normaliza el precio server-side", () => {
    const result = validatePriceCsvRow(csvRow(2), CTX, new Set());
    expect(result.status).toBe(RowStatus.VALID);
    expect(result.dto?.materialCode).toBe("CEMENTO_PORTLAND_50KG");
    expect(result.normalizedUnitPrice).toBe(12500 / 1);
    expect(result.normalizedUnit).toBe("bolsa");
  });

  it("rechaza campo obligatorio faltante", () => {
    const row = csvRow(2, { title: "" });
    const result = validatePriceCsvRow(row, CTX, new Set());
    expect(result.status).toBe(RowStatus.INVALID);
    expect(result.reason).toBe(RejectionReason.MISSING_REQUIRED_FIELD);
  });

  it("rechaza source desconocida", () => {
    const result = validatePriceCsvRow(csvRow(2, { source: "SODIMAC" }), CTX, new Set());
    expect(result.status).toBe(RowStatus.INVALID);
    expect(result.reason).toBe(RejectionReason.UNKNOWN_SOURCE);
  });

  it("rechaza región desconocida", () => {
    const result = validatePriceCsvRow(csvRow(2, { region: "PATAGONIA" }), CTX, new Set());
    expect(result.status).toBe(RowStatus.INVALID);
    expect(result.reason).toBe(RejectionReason.UNKNOWN_REGION);
  });

  it("rechaza material_code inexistente", () => {
    const result = validatePriceCsvRow(
      csvRow(2, { material_code: "LADRILLO_FANTASMA" }),
      CTX,
      new Set(),
    );
    expect(result.status).toBe(RowStatus.INVALID);
    expect(result.reason).toBe(RejectionReason.UNKNOWN_MATERIAL_CODE);
  });

  it("rechaza moneda no soportada", () => {
    const result = validatePriceCsvRow(csvRow(2, { currency: "USD" }), CTX, new Set());
    expect(result.status).toBe(RowStatus.INVALID);
    expect(result.reason).toBe(RejectionReason.UNKNOWN_CURRENCY);
  });

  it("rechaza precio negativo, cero y no numérico", () => {
    for (const raw_price of ["-100", "0", "doce mil"]) {
      const result = validatePriceCsvRow(csvRow(2, { raw_price }), CTX, new Set());
      expect(result.status).toBe(RowStatus.INVALID);
      expect(result.reason).toBe(RejectionReason.NEGATIVE_PRICE);
    }
  });

  it("rechaza packageQuantity inválido (cero, negativo, no numérico)", () => {
    for (const package_quantity of ["0", "-3", "varios"]) {
      const result = validatePriceCsvRow(csvRow(2, { package_quantity }), CTX, new Set());
      expect(result.status).toBe(RowStatus.INVALID);
      expect(result.reason).toBe(RejectionReason.INVALID_PACKAGE_QUANTITY);
    }
  });

  it("rechaza package_unit desconocida con UNKNOWN_PACKAGE_QUANTITY", () => {
    const result = validatePriceCsvRow(csvRow(2, { package_unit: "CAJA" }), CTX, new Set());
    expect(result.status).toBe(RowStatus.INVALID);
    expect(result.reason).toBe(RejectionReason.UNKNOWN_PACKAGE_QUANTITY);
  });

  it("rechaza unidad incompatible con el material", () => {
    // Cemento se vende en bolsa; M2 no corresponde.
    const result = validatePriceCsvRow(csvRow(2, { package_unit: "M2" }), CTX, new Set());
    expect(result.status).toBe(RowStatus.INVALID);
    expect(result.reason).toBe(RejectionReason.INCOMPATIBLE_UNIT);
  });

  it("rechaza bolsa de tamaño distinto a la nominal del código", () => {
    const result = validatePriceCsvRow(csvRow(2, { package_unit: "BAG_25KG" }), CTX, new Set());
    expect(result.status).toBe(RowStatus.INVALID);
    expect(result.reason).toBe(RejectionReason.INCOMPATIBLE_UNIT);
  });

  it("rechaza fecha futura e inválida", () => {
    const futuro = validatePriceCsvRow(
      csvRow(2, { collected_at: "2099-01-01" }),
      CTX,
      new Set(),
    );
    expect(futuro.reason).toBe(RejectionReason.INVALID_DATE);
    const invalida = validatePriceCsvRow(
      csvRow(2, { collected_at: "ayer" }),
      CTX,
      new Set(),
    );
    expect(invalida.reason).toBe(RejectionReason.INVALID_DATE);
  });
});

describe("normalización de packs", () => {
  it("pack de 10 ladrillos → precio por unidad", () => {
    const result = validatePriceCsvRow(
      csvRow(2, {
        material_code: "LADRILLO_HUECO_12X18X33",
        title: "Pack 10 ladrillos",
        raw_price: "12000",
        package_quantity: "10",
        package_unit: "UNIT",
        external_id: "",
      }),
      CTX,
      new Set(),
    );
    expect(result.status).toBe(RowStatus.VALID);
    expect(result.normalizedUnitPrice).toBe(1200);
    expect(result.normalizedUnit).toBe("un");
  });

  it("bolsa de cemento → precio por bolsa", () => {
    const result = validatePriceCsvRow(csvRow(2), CTX, new Set());
    expect(result.normalizedUnitPrice).toBe(12500);
    expect(result.normalizedUnit).toBe("bolsa");
  });

  it("m3 de arena vendido en m3 fraccionario", () => {
    const result = validatePriceCsvRow(
      csvRow(2, {
        material_code: "ARENA_GRUESA",
        raw_price: "14000",
        package_quantity: "0.5",
        package_unit: "M3",
        external_id: "",
      }),
      CTX,
      new Set(),
    );
    expect(result.status).toBe(RowStatus.VALID);
    expect(result.normalizedUnitPrice).toBe(28000);
  });

  it("UNIT exige cantidad entera", () => {
    const result = validatePriceCsvRow(
      csvRow(2, {
        material_code: "LADRILLO_HUECO_12X18X33",
        package_quantity: "10.5",
        package_unit: "UNIT",
      }),
      CTX,
      new Set(),
    );
    expect(result.reason).toBe(RejectionReason.INVALID_PACKAGE_QUANTITY);
  });
});

describe("duplicados", () => {
  it("detecta duplicado dentro del archivo por externalId", () => {
    const seen = new Set<string>();
    const primera = validatePriceCsvRow(csvRow(2), CTX, seen);
    expect(primera.status).toBe(RowStatus.VALID);

    const segunda = validatePriceCsvRow(csvRow(3), CTX, seen);
    expect(segunda.status).toBe(RowStatus.INVALID);
    expect(segunda.reason).toBe(RejectionReason.DUPLICATE_ROW);
  });

  it("sin externalId usa source+materialCode+url+collectedAt", () => {
    const seen = new Set<string>();
    const base = { external_id: "", url: "https://tienda.com/p/1" };
    const primera = validatePriceCsvRow(csvRow(2, base), CTX, seen);
    expect(primera.status).toBe(RowStatus.VALID);

    const duplicada = validatePriceCsvRow(
      csvRow(3, { ...base, title: "Cemento otra publicación" }),
      CTX,
      seen,
    );
    expect(duplicada.reason).toBe(RejectionReason.DUPLICATE_ROW);

    // Misma URL otro día NO es duplicada.
    const otroDia = validatePriceCsvRow(
      csvRow(4, { ...base, collected_at: "2026-08-23" }),
      CTX,
      seen,
    );
    expect(otroDia.status).toBe(RowStatus.VALID);
  });

  it("marca DUPLICATE_IN_DB contra el historial", () => {
    const key = observationDedupeKey({
      source: "MERCADOLIBRE",
      externalId: "MLA123",
      materialCode: "CEMENTO_PORTLAND_50KG",
      url: "https://articulo.mercadolibre.com.ar/MLA123",
      collectedAt: new Date("2026-08-22T00:00:00.000Z"),
    });
    const ctx = { ...CTX, existingDedupeHashes: new Set([hashDedupeKey(key)]) };
    const result = validatePriceCsvRow(csvRow(2), ctx, new Set());
    expect(result.reason).toBe(RejectionReason.DUPLICATE_IN_DB);
  });
});

describe("filas rechazadas por el proveedor", () => {
  it("accepted=false con motivo conocido lo preserva", () => {
    const result = validatePriceCsvRow(
      csvRow(2, { accepted: "false", rejection_reason: "UNKNOWN_PACKAGE_QUANTITY" }),
      CTX,
      new Set(),
    );
    expect(result.status).toBe(RowStatus.INVALID);
    expect(result.reason).toBe(RejectionReason.UNKNOWN_PACKAGE_QUANTITY);
    // Igual conserva el DTO para evidencia.
    expect(result.dto?.title).toContain("Cemento");
  });
});

describe("mediana y propuestas", () => {
  it("calcula mediana (no promedio)", () => {
    expect(median([1, 2, 100])).toBe(2);
    expect(median([1, 2, 3, 100])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it("agrupa por material y propone la mediana de aceptadas", () => {
    const obs = [
      { materialCode: "CEMENTO_PORTLAND_50KG", normalizedUnitPrice: 12000 },
      { materialCode: "CEMENTO_PORTLAND_50KG", normalizedUnitPrice: 12500 },
      { materialCode: "CEMENTO_PORTLAND_50KG", normalizedUnitPrice: 13000 },
      { materialCode: "ARENA_GRUESA", normalizedUnitPrice: 27000 },
    ];
    const { proposals } = computeReferenceProposals(obs);
    const cemento = proposals.find((p) => p.materialCode === "CEMENTO_PORTLAND_50KG");
    expect(cemento?.medianPrice).toBe(12500);
    expect(cemento?.sampleSize).toBe(3);
  });

  it("menos de 5 muestras marca INSUFFICIENT_SAMPLE_SIZE pero propone igual", () => {
    const obs = Array.from({ length: 4 }, (_, i) => ({
      materialCode: "CAL_HIDRATADA_25KG",
      normalizedUnitPrice: 4800 + i * 100,
    }));
    const { proposals, warnings } = computeReferenceProposals(obs);
    expect(proposals[0]?.insufficientSample).toBe(true);
    expect(proposals[0]?.medianPrice).toBe(4950);
    expect(warnings.some((w) => w.startsWith("INSUFFICIENT_SAMPLE_SIZE"))).toBe(true);
  });

  it("5 o más muestras no marcan warning", () => {
    const obs = Array.from({ length: 5 }, (_, i) => ({
      materialCode: "CAL_HIDRATADA_25KG",
      normalizedUnitPrice: 4800 + i * 100,
    }));
    const { proposals, warnings } = computeReferenceProposals(obs);
    expect(proposals[0]?.insufficientSample).toBe(false);
    expect(warnings).toHaveLength(0);
  });
});

describe("umbral de inflación", () => {
  it("marca EXCEEDS_INFLATION cuando la mediana supera anterior × (1 + tasa)", () => {
    const obs = [{ materialCode: "CEMENTO_PORTLAND_50KG", normalizedUnitPrice: 13000 }];
    const { proposals, warnings } = computeReferenceProposals(obs, {
      previousPrices: new Map([["CEMENTO_PORTLAND_50KG", 12500]]),
      monthlyRate: 0.025,
    });
    // Umbral: 12500 × 1,025 = 12812.5 → 13000 supera.
    expect(proposals[0]?.exceedsInflation).toBe(true);
    expect(proposals[0]?.previousPrice).toBe(12500);
    expect(warnings).toContain("EXCEEDS_INFLATION:CEMENTO_PORTLAND_50KG");
  });

  it("no marca cuando la mediana queda dentro del umbral", () => {
    const obs = [12400, 12700, 12800, 12800, 12900].map((normalizedUnitPrice) => ({
      materialCode: "CEMENTO_PORTLAND_50KG",
      normalizedUnitPrice,
    }));
    const { proposals, warnings } = computeReferenceProposals(obs, {
      previousPrices: new Map([["CEMENTO_PORTLAND_50KG", 12500]]),
      monthlyRate: 0.025,
    });
    expect(proposals[0]?.exceedsInflation).toBe(false);
    expect(proposals[0]?.previousPrice).toBe(12500);
    expect(warnings).toHaveLength(0);
  });

  it("mediana exactamente igual al umbral no marca (comparación estricta)", () => {
    const obs = [{ materialCode: "CAL_HIDRATADA_25KG", normalizedUnitPrice: 10250 }];
    const { proposals } = computeReferenceProposals(obs, {
      previousPrices: new Map([["CAL_HIDRATADA_25KG", 10000]]),
      monthlyRate: 0.025,
    });
    expect(proposals[0]?.exceedsInflation).toBe(false);
  });

  it("sin precio anterior publicado no marca", () => {
    const obs = Array.from({ length: 5 }, (_, i) => ({
      materialCode: "LADRILLO_HUECO_12X18X33",
      normalizedUnitPrice: 2900 + i * 50,
    }));
    const { proposals, warnings } = computeReferenceProposals(obs, {
      previousPrices: new Map(),
      monthlyRate: 0.025,
    });
    expect(proposals[0]?.exceedsInflation).toBe(false);
    expect(proposals[0]?.previousPrice).toBeNull();
    expect(warnings).toHaveLength(0);
  });

  it("sin opciones usa la tasa mensual por defecto de shared", () => {
    const obs = [{ materialCode: "CEMENTO_PORTLAND_50KG", normalizedUnitPrice: 10300 }];
    const { proposals, warnings } = computeReferenceProposals(obs, {
      previousPrices: new Map([["CEMENTO_PORTLAND_50KG", 10000]]),
    });
    // Umbral con tasa default: 10000 × 1,025 = 10250 → 10300 supera.
    expect(proposals[0]?.exceedsInflation).toBe(true);
    expect(warnings).toContain("EXCEEDS_INFLATION:CEMENTO_PORTLAND_50KG");
  });

  it("cada material se compara contra su propio precio anterior", () => {
    const obs = [
      ...Array.from({ length: 5 }, (_, i) => ({
        materialCode: "CEMENTO_PORTLAND_50KG",
        normalizedUnitPrice: 12800 + i * 100, // mediana 13000
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        materialCode: "ARENA_GRUESA",
        normalizedUnitPrice: 28200 + i * 100, // mediana 28400
      })),
    ];
    const { proposals, warnings } = computeReferenceProposals(obs, {
      previousPrices: new Map([
        ["CEMENTO_PORTLAND_50KG", 12500],
        ["ARENA_GRUESA", 28000],
      ]),
      monthlyRate: 0.025,
    });
    const porCodigo = Object.fromEntries(proposals.map((p) => [p.materialCode, p]));
    expect(porCodigo.CEMENTO_PORTLAND_50KG?.exceedsInflation).toBe(true);
    // Umbral arena: 28000 × 1,025 = 28700 → 28400 queda dentro.
    expect(porCodigo.ARENA_GRUESA?.exceedsInflation).toBe(false);
    expect(warnings).toEqual(["EXCEEDS_INFLATION:CEMENTO_PORTLAND_50KG"]);
  });
});
