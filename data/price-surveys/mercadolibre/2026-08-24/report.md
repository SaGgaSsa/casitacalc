# Relevamiento de precios Mercado Libre — 2026-08-24 (corrida 2, navegador real)

Metodología: navegación con Chromium real vía Playwright MCP (sin muro anti-bot)
y **evidencia de nivel tarjeta** (datos tomados del listado de resultados, sin
abrir cada publicación). Este nivel fue elegido explícitamente por el usuario
para acelerar la corrida y es MÁS DÉBIL que el del skill: no observa condición,
presentación en ficha ni packs ambiguos. Queda documentado como tal.

Cambio de método respecto del skill original: queries por nombre de producto
(sin peso) tras verificar que el buscador de ML ignora el término de peso y que
el mercado argentino vende cemento en bolsas de 25 kg (no existe 50 kg en ML).

## Cambios de catálogo asociados (código)

- `packages/shared/src/materials.json`: alta de `CEMENTO_PORTLAND_25KG`
  (`BAG_25KG`, unidad nominal `bolsa`). `CEMENTO_PORTLAND_50KG` queda intacto.
- `config/price-surveys/mercadolibre-price-specs.json`: el entry de 50KG se
  reemplaza por `CEMENTO_PORTLAND_25KG` (queries por nombre: "cemento portland",
  "cemento loma negra", "cemento holcim", "cemento avellaneda"; weightKg 25).
  Queries de cal también pasaron a nombre ("cal hidratada", "cal comun",
  "cal hidrat extra").
- `packages/db/src/seed.ts`: precio referencia `CEMENTO_PORTLAND_25KG: 11000`
  (orientativo; el seed falla si falta).
- Test de catálogo actualizado 23 → 24 entradas. Tests de shared/calculator-core OK.

---

## CEMENTO_PORTLAND_25KG — Cemento Portland 25 kg

- Queries usadas: "cemento portland" (target alcanzado); se ejecutó además
  "cemento loma negra" solo para confirmar duplicados/caps.
- Inspeccionados (tarjetas evaluadas): ~33 · Aceptados: 8 · Rechazados: 3 ·
  Excluidos por cap: 4.
- Rango observado: $8.790 - $22.000 (informativo, NUNCA precio oficial).

### Rechazados y ambiguos

- /p/MLA76060493 Cemento De Albañilería Plasticor X 25kg -- WRONG_PRODUCT (cemento de albañilería, no portland)
- UP/MLAU651859975 Cemento Avellaneda X 20 Kg -- WRONG_PACKAGE_SIZE (20 ≠ 25 kg)
- UP/MLAU2629213615 / P/MLA47039419 / UP277833678 / UP276876045 / UP278071714 / UP278066902 / UP3259867771 Caller-Juntamax-Revokito 1-10 kg -- WRONG_PACKAGE_SIZE
- CEMENTOS AVELLANEDA S.A (blanco Cimsa/Cemex/Oyak 25kg) -- WRONG_PRODUCT (cemento blanco)

### Excluidos por cap de vendedor (máx. 2)

- UP/MLAU3962291360 Bolsa Cemento Avellaneda X 25 Kg Tipo Portland ($11.140, CEMENTOS AVELLANEDA S.A, 3ª del vendedor)
- UP/MLAU3177114577 Cemento Loma Negra Cpc40 Bolsa X 25 Kg ($12.672, LOMA NEGRA, 3ª)
- UP/MLAU3715125995 Cemento Loma Negra Cpc40 Gris 25kg ($12.699, LOMA NEGRA, cap)
- UP/MLAU3352264903 Cemento Portland Porlan Holcim 25kg ($10.815, HOLCIM, 3ª)

```text
Accepted: 8
Required minimum: 5
Status: OK
```

---

## CAL_HIDRATADA_25KG — Cal hidratada 25 kg

- Queries usadas: "cal hidratada" (target alcanzado; no hizo falta ejecutar
  "cal comun" ni "cal hidrat extra").
- Inspeccionados: 23 · Aceptados: 8 · Rechazados: 7.
- Rango observado: $3.500 - $27.800 (informativo). Warning: spread amplio;
  el mínimo ($3.500) es un outlier evidente frente al cluster $8.800-$9.500.

### Rechazados y ambiguos

- UP/MLAU363733576 Cal Hidráulica Loma Negra 25kg Hidratada Cacique Plus -- WRONG_PRODUCT (título declara hidráulica; spec exige NO hidráulica)
- UP/MLAU263660703 Cal Hidrat Extra X 25kg ($8.143, PALERMO MATERIALES) -- WRONG_PRODUCT (su ficha declara "Modelo: Hidráulica" y "Elaborada con cal hidráulica"; verificado abriendo la página en la fase 1 de esta misma corrida)
- P/MLA2082449115 Cal Hidratada Santa Elena X 20kg -- WRONG_PACKAGE_SIZE
- UP/MLAU272932737 Cal Aerea Hidratada Juntamax X 4 Kg -- WRONG_PACKAGE_SIZE
- UP/MLAU310890893 Cal Aérea Hidratada Juntamax X 4 Kg -- WRONG_PACKAGE_SIZE
- P/MLA2101037738 Cal Hidrat Avellaneda 25 Kg Por Palet -- UNKNOWN_PACKAGE_QUANTITY (pallet sin cantidad declarada)
- UP/MLAU366151405 Cal Común Hidrat ($7.000) -- NOT_ENOUGH_INFORMATION (sin peso en título ni ficha verificable a nivel tarjeta)

```text
Accepted: 8
Required minimum: 5
Status: OK
```

---

## LADRILLO_HUECO_18X18X33 — Ladrillo hueco 18x18x33

- Queries usadas: las 3 del spec ("ladrillo hueco 18x18x33",
  "ladrillo ceramico hueco 18x18x33", "ladrillo hueco 18 33"). Las 3 devuelven
  el mismo universo de publicaciones.
- Inspeccionados: 20 · Aceptados: 4 · Rechazados: 6 · Excluidos por filtro del
  spec (excludeTerms "pallet"): 6.
- Rango observado: $1.248 - $120.597 (informativo). WARNING fuerte: dos filas
  aceptadas (~$115.000 y ~$120.597) tienen precio de pallet siendo unitarias en
  título; a nivel tarjeta no puede distinguirse. Tratar como outliers probables
  al importar.

### Rechazados y ambiguos

- P/MLA12196990 Ladrillo Hueco 12x18x33 Later-cer -- WRONG_DIMENSIONS ({12,18,33} ≠ {18,18,33})
- P/MLA2089924416 Ladrillos Huecos 12x18x33 x pallet 144 Totos -- WRONG_DIMENSIONS
- Tejuela Ladrillo Común Rectificado -- WRONG_PRODUCT
- Liston Ladrillo Vista Cordoba -- WRONG_PRODUCT (ladrillo vista, excluido por spec)
- Ladrillo Aislante K26 Saemsa / Retak 15x25x50 / Retak 7.5x50x25 / Placa Refractaria / Parasoles de cemento -- WRONG_PRODUCT

### Excluidos por excludeTerms del spec ("pallet", cantidad declarada o no)

- UP/MLAU293699901 ($169.229), UP/MLAU295192060 ($125.343), UP/MLAU293836588
  ($5.129, además "consultar"), UP/MLAU294146668 ($2.987, "consultar"),
  P/MLA2083134601 ($111.942), UP/MLAU3190529435 ($162.561).

```text
Accepted: 4
Required minimum: 5
Status: INSUFFICIENT_SAMPLE_SIZE
```

---

## Warnings

- **Evidencia de tarjeta**: precios y títulos observados en el listado; NO se
  abrió cada publicación (decisión del usuario para acelerar). El campo seller
  en tarjetas catálogo muestra marca/tienda oficial (ej. "HIDRAT"), no siempre
  el vendedor real; el cap de 2 por vendedor se aplicó sobre ese valor
  observable.
- `external_id` vacío en filas `/p/` y `/up/`: esas URLs identifican productos
  de catálogo (MLA/MLAU), no publicaciones individuales; el ID de publicación
  no es determinable sin abrir la página.
- Precios de tarjeta coincidieron con los JSON-LD verificados por página en la
  fase 1 para las publicaciones superpuestas ($9.400/$8.143/$3.500/$9.400),
  lo que da confianza en el nivel elegido.
- Ladrillo: INSUFFICIENT_SAMPLE_SIZE + outliers probables (ver arriba). No se
  relajaron criterios para llegar al mínimo.
