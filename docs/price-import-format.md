# Formato CSV normalizado de precios — CasitaCalc

> **Principio de arquitectura:** CasitaCalc no scrapea, no consulta APIs ni
> ejecuta agentes. La obtención externa (skill, agente, script, API o carga
> manual) es una etapa **desacoplada** que termina siempre en este formato.
> Todo proveedor entra por el mismo pipeline:
>
> ```text
> Obtención externa (skill / agente / script / API / humano)
>         ↓
> CSV NORMALIZADO  (este documento)
>         ↓
> PriceImportService  →  validación  →  PriceCollection
>         ↓
> PriceObservation[]  →  mediana  →  MaterialReferencePrice (DRAFT)
>         ↓
> Publicación manual por administración
> ```

## Archivos

- Especificación: `docs/price-import-format.md` (este archivo)
- Ejemplo: `docs/examples/prices-example.csv`

## Reglas generales

1. Un archivo por **región**: si mezcla regiones, el importador rechaza el
   archivo completo (`MIXED_REGIONS`).
2. Puede mezclar **fuentes** en el mismo archivo (ej.: Easy + Mercado Libre).
3. Codificación UTF-8, separador coma, saltos `\n` o `\r\n`, comillas dobles
   para campos con comas o saltos embebidos (RFC 4180). BOM tolerado.
4. Tamaño máximo: **2 MB**.
5. El precio normalizado **NO viaja en el archivo**: lo calcula siempre
   CasitaCalc server-side (`raw_price / package_quantity`). Nunca se confía en
   cálculos externos.

## Columnas

| Columna            | Obligatoria | Descripción |
|--------------------|-------------|-------------|
| `source`           | sí          | Código de fuente registrada: `EASY`, `MERCADOLIBRE`, `MANUAL`. Nuevas fuentes se agregan como datos (tabla `PriceSource`), sin cambiar el modelo. |
| `region`           | sí          | `CABA` o `GBA`. Extensible a futuro. Una sola por archivo. |
| `collected_at`     | sí          | Fecha del relevamiento: `YYYY-MM-DD` o ISO completo. No puede ser futura. |
| `material_code`    | sí          | Código interno estable del material (ej.: `CEMENTO_PORTLAND_50KG`). Ver `/materials`. Nunca vincular por nombre textual. |
| `external_id`      | no          | ID del producto en la fuente (ej.: `MLA123`). Mejora la detección de duplicados. |
| `title`            | sí          | Título textual del producto publicado. |
| `url`              | sí          | URL http(s) de la publicación; evidencia del precio. |
| `currency`         | sí          | `ARS` (única soportada inicialmente). |
| `raw_price`        | sí          | Precio del paquete tal cual se vende, sin separadores de miles, punto decimal opcional (ej.: `12500`, `12500.50`). Debe ser > 0. |
| `package_quantity` | sí          | Cuántas unidades del paquete trae (ver "Normalización"). > 0. Entero si `package_unit=UNIT`. |
| `package_unit`     | sí          | Unidad del paquete (ver tabla siguiente). |
| `brand`            | no          | Marca. |
| `seller`           | no          | Vendedor. |
| `accepted`         | sí*         | `true`/`false`: si el proveedor considera la fila utilizable. *Opcional (default `true`) pero se recomienda explicitarla. |
| `rejection_reason` | no          | Motivo cuando `accepted=false` (código del catálogo de motivos, ver abajo). |

## Unidades de paquete (`package_unit`)

El vocabulario de paquetes es propio del formato; el precio normalizado se
expresa siempre en la **unidad interna del material**:

| `package_unit` | Unidad interna | Uso típico |
|----------------|----------------|------------|
| `UNIT`         | `un`           | Ladrillos, chapas, piezas sueltas o en pack |
| `BAG_25KG`     | `bolsa`        | Cal 25 kg |
| `BAG_40KG`     | `bolsa`        | Yeso 40 kg |
| `BAG_50KG`     | `bolsa`        | Cemento 50 kg |
| `KG`           | `kg`           | Acero suelto |
| `M2`           | `m2`           | Cerámicos, film |
| `M3`           | `m3`           | Arena, piedra |
| `LITER`        | `l`            | Aditivos líquidos |
| `METER`        | `ml`           | Caños, tirantes |

**Sin conversiones ambiguas:** si la unidad del paquete no corresponde a la
unidad interna del material (o la bolsa no coincide con la nominal del código,
ej. `BAG_25KG` para `CEMENTO_PORTLAND_50KG`), la fila se rechaza con
`INCOMPATIBLE_UNIT`. Si la unidad es desconocida: `UNKNOWN_PACKAGE_QUANTITY`.

## Normalización (ejemplos)

```text
Publicación: Pack 10 ladrillos — $12.000
CSV: raw_price=12000, package_quantity=10, package_unit=UNIT
CasitaCalc: normalizedUnitPrice = 12000 / 10 = $1.200 / un

Publicación: Bolsa cemento 50 kg — $13.000
CSV: raw_price=13000, package_quantity=1, package_unit=BAG_50KG
CasitaCalc: normalizedUnitPrice = $13.000 / bolsa
```

## Validaciones (PriceImportService)

Por fila, en orden: campos obligatorios → fuente habilitada → región →
material existente → moneda → precio positivo → cantidad positiva → unidad de
paquete conocida y compatible → fecha válida y no futura → duplicados →
normalización. **Una fila inválida no invalida el archivo**: se informa en el
preview y no se persiste.

### Duplicados

Clave de identidad (hasheada, con constraint único en DB):

- con `external_id`: `source + external_id + collected_at`
- sin `external_id`: `source + material_code + url + collected_at`

Nunca se insertan observaciones duplicadas silenciosamente.

## Motivos de rechazo (`rejection_reason`)

`MISSING_REQUIRED_FIELD`, `UNKNOWN_SOURCE`, `DISABLED_SOURCE`,
`UNKNOWN_REGION`, `UNKNOWN_MATERIAL_CODE`, `UNKNOWN_CURRENCY`,
`NEGATIVE_PRICE`, `INVALID_PACKAGE_QUANTITY`, `UNKNOWN_PACKAGE_UNIT`,
`UNKNOWN_PACKAGE_QUANTITY`, `INCOMPATIBLE_UNIT`, `INVALID_DATE`,
`DUPLICATE_ROW`, `DUPLICATE_IN_DB`, `EXCLUDED_BY_ADMIN`.

## Qué genera la importación

1. `PriceCollection` (estado `DRAFT`) con contadores totales/aceptadas/rechazadas.
2. Una `PriceObservation` por fila válida (evidencia completa: título, URL,
   precio bruto, paquete, vendedor, marca).
3. Por material agrupado: `MaterialReferencePrice` con la **mediana** (nunca
   promedio) de las observaciones aceptadas, estado `DRAFT`.
4. Con menos de 5 muestras (`MIN_REFERENCE_SAMPLES`): queda marcado
   `INSUFFICIENT_SAMPLE_SIZE` pero la administración puede aprobarlo igual.
5. **Nunca se publica automáticamente.** El precio vigente de la calculadora
   es siempre el último `MaterialReferencePrice` con `status=PUBLISHED` de la
   región; los históricos son inmutables.

## Contrato interno (sin CSV)

Cualquier provider futuro (API, skill, agente, Render cron, CLI) puede generar
directamente el DTO interno y saltear el archivo:

```ts
// NormalizedPriceObservationInput (@casitacalc/shared)
{
  source: "MERCADOLIBRE",
  region: "GBA",
  collectedAt: new Date("2026-08-22"),
  materialCode: "CEMENTO_PORTLAND_50KG",
  externalId: "MLA123",
  title: "Cemento Holcim 50kg",
  url: "https://…",
  currency: "ARS",
  rawPrice: 12500,
  packageQuantity: 1,
  packageUnit: "BAG_50KG",
  brand: "Holcim",
  seller: null,
  accepted: true,
  rejectionReason: null,
}
```

Funciones reutilizables (sin dependencia de la UI):

- `previewPriceImport({ filename, content })` — valida y devuelve preview.
- `confirmPriceImport({ filename, content, createdBy })` — importa tras validar.

## Seguridad

Solo administración puede subir/confirmar/publicar/rechazar/modificar. La API
valida extensión `.csv`, tamaño ≤ 2 MB y contenido; las rutas quedan bajo
`/api/admin/prices/**` con guard de sesión admin.
