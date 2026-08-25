# Relevamiento de precios Mercado Libre — 2026-08-24 (corrida 3, método v2)

**Método v2** (skill reescrito): UNA búsqueda genérica por material (nombre de
producto, sin pesos/medidas), **primer resultado orgánico**, UNA sola
verificación de página, datos registrados tal cual se observan. La validación
fina es humana: cada sección lista su LINK para que lo revises.

Sin links validados previos (`mercadolibre-validated-links.json` recién creado,
vacío): esta corrida descubrió los 3 por búsqueda. Al aprobarlos se persisten y
la próxima corrida los reutiliza sin buscar.

---

## CEMENTO_PORTLAND_25KG — Cemento Portland 25 kg

- Query genérica: `cemento portland` → primer resultado orgánico (los primeros
  patrocinados fueron omitidos: Removedor De Cemento, Pigmento Rojo, etc.).
- Título observado: "Bolsa Cemento Avellaneda X 25 Kg" (badge MÁS VENDIDO)
- Precio visible en ficha: **$22.000/unidad** — coincide con JSON-LD (22000 ARS, InStock)
- Presentación declarada: bolsa x 25 kg → fila emitida con `1 / BAG_25KG`
- Marca/vendedor ficha: Cementos Avellaneda S.A / CEMENTOS AVELLANEDA S.A
- **Link para validación:** https://www.mercadolibre.com.ar/bolsa-cemento-avellaneda-x-25-kg/p/MLA53674271
- Estado: ✅ fila emitida en prices.csv (pendiente de tu OK)

Nota: $22.000 es el precio más alto del rango que venía observándose
($8.790-$22.000 en corrida v1); puede ser publicación de corralón caro o
variación horaria. Se registra tal cual; decidís vos.

---

## CAL_HIDRATADA_25KG — Cal hidratada 25 kg

- Query genérica: `cal hidratada` → primer resultado orgánico.
- Título observado: "Bolsa Cal Hidrat X 25 Kg"
- Precio visible en ficha: **$3.500** — coincide con JSON-LD (3500 ARS, InStock)
- Presentación declarada: bolsa x 25 kg → fila emitida con `1 / BAG_25KG`
- Marca: Hidrat
- **Link para validación:** https://www.mercadolibre.com.ar/bolsa-cal-hidrat-x-25-kg/p/MLA35559872
- Estado: ✅ fila emitida en prices.csv (pendiente de tu OK)

⚠️ Warning heredado: esta misma publicación fue el outlier $3.500 de la corrida
v1 frente al cluster $8.800-$9.500. No se descarta ni se corrige: la decisión
es tuya (¿precio real de tienda barata o publicación desactualizada?).

---

## LADRILLO_HUECO_12X18X33 — Ladrillo hueco 12x18x33

Historial de la corrida sobre este material:

1. Búsqueda genérica `ladrillo hueco` → 1er resultado 12x18x33 $3.000/un.
2. A pedido del usuario se buscó con medidas (`ladrillo hueco 18x18x33`) →
   1er resultado "La Pastoriza 18x18x33 X Pallet 90 Unid" $169.229
   (link: https://www.mercadolibre.com.ar/ladrillo-hueco-la-pastoriza-18x18x33-x-pallet-90-unid/up/MLAU293699901).
3. **El usuario corrigió el dominio: la medida correcta es 12x18x33; 18 de
   alto es muy grande.** Se descartó el relevamiento de 18x18x33 y el código
   de catálogo se **renombró** `LADRILLO_HUECO_18X18X33` →
   `LADRILLO_HUECO_12X18X33` (materials.json, recetas, seed, spec, tests).

Relevamiento final (búsqueda `ladrillo hueco 12x18x33`, primer resultado):

- Título observado: "Ladrillo Huecos Por Unidad 12x18x33 9" (9 agujeros/tubos)
- Precio visible en ficha: **$3.000/unidad** (JSON-LD dice $2.850 — discrepancia
  anotada; manda lo visible al comprador)
- Presentación declarada: por unidad, medidas 12x18x33 → fila emitida con
  `1 / UNIT`. Sin marca/vendedor determinable en ficha. `external_id`
  = MLA2091220516 (sku de URL `/p/`).
- **Link validado por el usuario y persistido en
  `config/price-surveys/mercadolibre-validated-links.json`**:
  https://www.mercadolibre.com.ar/ladrillo-huecos-por-unidad-12x18x33-9/p/MLA2091220516
- Estado: ✅ fila emitida + link persistido

---

## Resumen

| Material | Fuente | Precio observado | CSV | Estado |
|---|---|---|---|---|
| CEMENTO_PORTLAND_25KG | búsqueda v2 (1er orgánico) | $22.000 bolsa 25kg | ✅ | link persistido ✓ |
| CAL_HIDRATADA_25KG | búsqueda v2 (1er orgánico) | $3.500 bolsa 25kg | ✅ | link persistido ✓ |
| LADRILLO_HUECO_12X18X33 | búsqueda con medidas (a pedido) | $3.000/un unidad 12x18x33 | ✅ | link persistido ✓ |

Los 3 links validados por el usuario están en
`config/price-surveys/mercadolibre-validated-links.json`. La próxima corrida
abre esos links directo, sin buscar.

Código renombrado `LADRILLO_HUECO_18X18X33` → `LADRILLO_HUECO_12X18X33` en:
materials.json, recipes-defaults.ts, seed.ts, spec de relevamiento, tests y
esta salida. Nota: la fila vieja puede seguir existiendo en la DB local de dev
(el seed hace upserts y no borra); si molesta, borrarla a mano.

Corridas anteriores de hoy conservadas como `prices.metodo-v1.csv` /
`report.metodo-v1.md`.
