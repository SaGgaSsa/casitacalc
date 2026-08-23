---
name: mercadolibre-price-survey
description: Use when collecting current Argentine Mercado Libre prices for predefined CasitaCalc construction materials that must be exported as normalized price observations.
---

# Mercado Libre Price Survey (CasitaCalc)

## Overview

Producir evidencia de precios normalizada desde publicaciones reales de Mercado
Libre Argentina, en el CSV que consume el importador de CasitaCalc. El formato
base lo define `docs/price-import-format.md`, pero este skill fija DOS
excepciones que siempre ganan: **solo filas aceptadas y verificadas**, y
**encabezado de 13 columnas** (sin `accepted` ni `rejection_reason`).

Este skill NO toca PostgreSQL, NO llama APIs internas de CasitaCalc, NO usa la
API/MCP de Mercado Libre, NO importa ni publica precios, NO calcula medianas ni
`normalizedUnitPrice`. Solo genera archivos.

**Principio rector: no observado = desconocido.** Nunca inferir precio,
cantidad, vendedor, peso, dimensiones, URL ni externalId. Ante duda: sin fila;
va a `report.md`.

## Entrada y salida

- **QUÉ relevar**: `config/price-surveys/mercadolibre-price-specs.json`
  (códigos, queries, presentación esperada, `excludeTerms`, min/target/maxSamples).
  Nunca releves materiales fuera de ese archivo ni inventes códigos.
- **Salida**: `data/price-surveys/mercadolibre/YYYY-MM-DD/prices.csv` +
  `report.md`, donde YYYY-MM-DD es la fecha real de la corrida.

## Método

1. Leé la PriceSpec del material. Ejecutá sus queries en mercadolibre.com.ar
   navegando la web.
2. **Dos niveles de evidencia:** un resultado de buscador (snippet) es solo un
   **candidato** que descubre URLs. Para aceptar un precio necesitás haber
   **verificado directamente la página de la publicación** (título,
   presentación/dimensiones y precio observados en la propia página).
   Candidato no verificado (ej.: login-wall) → pendiente en `report.md`,
   nunca fila en el CSV.
3. Aceptá hasta `targetSamples`; cortá en `maxSamples`. No reutilices la misma
   publicación. Cap determinista: **no aceptes más de `maxSamplesPerSeller`
   publicaciones del mismo vendedor** (campo del spec; default 2 si falta).
   Los excedentes por cap van al `report.md`. Tiendas oficiales no quedan
   excluidas por serlo, pero sí respetan el cap.
4. Duplicado = mismo MLA ID o misma URL. Canonicalizá la URL (sin parámetros de
   tracking tipo `matt_tool`). `external_id` = `MLA<número>` sin guiones; `""`
   si no puede determinarse.

## Reglas de aceptación

- Solo ARS, condición nueva, **precio normal vigente visible**. Nunca como
  `raw_price`: cuotas, precios tachados, descuentos bancarios o por medio de
  pago, cupones, costo de envío.
- Packs solo si la cantidad es inequívoca ("Pack x10" → `package_quantity=10`).
  Pallet/pack sin cantidad declarada → rechazado con motivo
  `UNKNOWN_PACKAGE_QUANTITY` en el `report.md` (nunca estimar).
- No descartes por precio raro: una publicación válida con precio extraño sigue
  siendo evidencia; los outliers los detecta otra capa.

## Evidencia (anti-alucinación)

Una fila solo se escribe con datos realmente observados **en la página de la
publicación**: title, url, raw_price e info de paquete. Si a un candidato le
falta verificación completa (no pudiste abrir su URL real, no se ve el precio,
la presentación es ambigua), **no generes fila**: anotalo en `report.md` como
pendiente o rechazado, según corresponda. Jamás derives ni completes un campo
a partir de otros datos.

## Motivos de rechazo (vocabulario cerrado, SOLO report.md)

`WRONG_PRODUCT` `WRONG_PACKAGE_SIZE` `WRONG_DIMENSIONS`
`UNKNOWN_PACKAGE_QUANTITY` `UNKNOWN_UNIT` `USED_PRODUCT` `INVALID_PRICE`
`DUPLICATE` `NOT_ENOUGH_INFORMATION`

Estos códigos son del relevamiento y se usan **exclusivamente dentro de
`report.md`**. El catálogo del importador (`INCOMPATIBLE_UNIT`,
`DUPLICATE_ROW`, etc.) es otro: nunca mezclarlos ni escribir motivos propios
en el CSV.

Excluir publicaciones por `maxSamplesPerSeller` NO es `DUPLICATE` (duplicado =
mismo MLA ID o misma URL, nada más): se describe en texto libre en el
`report.md` ("excluido por cap de vendedor").

## Formato CSV

`prices.csv` contiene **SOLO observaciones aceptadas y verificadas**. Rechazos,
ambiguos, duplicados y pendientes van al `report.md`, jamás al CSV.

Encabezado exacto (**13 columnas**: SIN `accepted` ni `rejection_reason` —
son opcionales para el importador, que asume `accepted=true`; sin esas
columnas no existe forma de escribir rechazos en el CSV):

```csv
source,region,collected_at,material_code,external_id,title,url,currency,raw_price,package_quantity,package_unit,brand,seller
```

- No agregues `accepted` ni `rejection_reason` aunque
  `docs/examples/prices-example.csv` los muestre (ilustración histórica del
  formato): este documento manda. Si tu salida tiene alguna fila con motivo de
  rechazo, está mal: esa fila pertenece a report.md.

Ejemplo de decisión (candidato con producto equivocado, verificado en su
página):

```text
Candidato: "Cemento Blanco Portland Bolsa 50kg" ($16.000), material CAL_HIDRATADA_25KG

MAL (fila en prices.csv):
...,CAL_HIDRATADA_25KG,MLA111000003,Cemento Blanco Portland Bolsa 50kg,...,16000,1,BAG_50KG,,Corralon Sur,false,WRONG_PRODUCT

BIEN:
prices.csv -> sin fila para MLA111000003
report.md  -> Rechazados y ambiguos: MLA111000003 Cemento Blanco 50kg $16.000 -- WRONG_PRODUCT
```

- `source=MERCADOLIBRE`, `region=GBA`, `currency=ARS`, `collected_at=YYYY-MM-DD`
  real (una fecha por corrida, no futura).
- `material_code` y queries salen del spec. `package_unit` compatible con la
  bolsa nominal del código (`_50KG`→`BAG_50KG`, `_25KG`→`BAG_25KG`) o `UNIT`
  para piezas; `package_quantity` entero si es UNIT.
- `accepted` y `rejection_reason` no existen en este CSV: toda fila emitida es
  una aceptación.
- `raw_price` sin separadores de miles, punto decimal opcional.
- Nunca agregues columnas ni `normalizedUnitPrice`: lo calcula CasitaCalc
  server-side.
- Si la corrida termina sin observaciones verificadas, dejá el archivo solo con
  el encabezado: el preview del importador lo rechaza (`MISSING_HEADER`) y eso
  es correcto — no había nada que importar.

## report.md

Corto, una sección por material: queries usadas; inspeccionados / aceptados /
rechazados; rango observado `$X - $Y` (informativo, NUNCA precio oficial);
warnings; y dos listas explícitas: **Rechazados y ambiguos** (con su motivo del
vocabulario) y **Pendientes de verificación** (candidatos descubiertos por
snippet cuya página no pudo verificarse). Si aceptadas < `minSamples`:

```text
Accepted: N
Required minimum: M
Status: INSUFFICIENT_SAMPLE_SIZE
```

No inventes ni relajes criterios para llegar al mínimo: el importador/admin
decide después.

## Red Flags — STOP

- "Completo la URL / la cantidad / las medidas con lo que debería ser" → NO.
  Pendiente en report.md.
- "El snippet muestra título y precio claros, lo acepto directo" → NO.
  Snippet = candidato; sin página verificada no hay fila.
- "Lo agrego al CSV como rechazado para dejar auditoría" / "va con
  `accepted=false` y su unidad real, como en el ejemplo" → NO. Los rechazos
  viven SOLO en report.md; el CSV de 13 columnas ni siquiera tiene esas
  columnas.
- "Sumo bolsas de 25 kg para llegar a 5 muestras" → NO.
  `INSUFFICIENT_SAMPLE_SIZE`.
- "Ya tengo 3 de Ferro Norte pero necesito más muestras" → NO.
  `maxSamplesPerSeller`; excedentes fuera.
- "El pallet trae ~400 unidades" → NO. `UNKNOWN_PACKAGE_QUANTITY`.
- "Uso el precio en cuotas, es el más visible" → NO. Precio de lista vigente.
- "Es ladrillo hueco, será 18x18x33" → NO. Sin medidas verificables:
  `NOT_ENOUGH_INFORMATION`.

Violar la letra de estas reglas es violar su espíritu.
