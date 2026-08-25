---
name: mercadolibre-price-survey
description: Use when collecting current Argentine Mercado Libre prices for predefined CasitaCalc construction materials - captures ONE observation per material from its persisted user-validated link or the first search result, for human validation before import.
---

# Mercado Libre Price Survey (CasitaCalc) — método v2

## Overview

**Una observación por material: primer resultado de UNA búsqueda genérica (o el
link validado ya persistido), una sola verificación, datos crudos tal cual se
ven, y el link de ML en la salida para validación humana.**

El agente NO valida presentaciones ni rechaza por paquete/dimensiones: registra
lo observado y marca la duda. La corrección fina la hace el usuario (caso
histórico que motivó este método: un precio de pallet se cargó como ladrillo
unitario porque el agente "verificaba" demasiado y aun así falló).

Principios:

- **Primer resultado = fuente.** Sin segunda búsqueda, sin candidatos
  alternativos, sin evaluar el resto del listado.
- **Una sola apertura de página por material** por corrida.
- **Lo observado manda.** Si el precio es de pallet, `raw_price` queda completo;
  NUNCA se divide: eso lo calcula el importador (`raw_price / package_quantity`).
- **Dato no observable ≠ dato inventado.** Cantidad o presentación ambigua →
  sin fila en CSV; pendiente en report.md con su link.
- **El link SIEMPRE viaja en la salida** (columna `url` y reporte).

Este skill NO toca PostgreSQL, NO llama APIs internas ni la API/MCP de ML, NO
importa precios, NO calcula `normalizedUnitPrice`. Solo genera archivos.

## Entrada y salida

- `packages/shared/src/materials.json` — catálogo maestro: códigos válidos.
- `config/price-surveys/mercadolibre-price-specs.json` — query genérica
  (nombre del producto, SIN pesos/medidas/cantidades) y presentación esperada
  por material.
- `config/price-surveys/mercadolibre-validated-links.json` — URLs ya
  **validadas por el usuario**: si el material tiene entrada, se usa ese link
  directo y NO se busca.
- Salida: `data/price-surveys/mercadolibre/YYYY-MM-DD/prices.csv` +
  `report.md` (fecha real de la corrida). Si la carpeta del día ya existe de
  otra metodología, renombrá los archivos viejos con sufijo `.metodo-v1` antes
  de escribir.

## Método

1. **Resolver el link**, en este orden estricto:
   a. Link en `mercadolibre-validated-links.json` → usalo directo (paso 3).
   b. Si no hay: UNA búsqueda en ML con la query del spec usando navegador real
      (Playwright + Chrome local; fetch directo recibe el muro anti-bot). Tomá
      **EL PRIMER resultado orgánico** (no patrocinado). Fin de la búsqueda.
2. **Verificación única**: abrí ese link UNA vez. Extraé de la página: título,
   precio vigente visible (no cuotas, no tachados), moneda, vendedor, marca, y
   toda señal declarada de paquete/presentación ("pallet x90", "pack x10",
   "bolsa 25 kg", dimensiones en título/ficha).
3. **Registrar tal cual**:
   - `raw_price` = precio completo observado (si es de pallet, así queda).
   - `package_quantity`/`package_unit` SOLO si son inequívocos en la página
     (pallet x90 → 90/UNIT; bolsa 25 kg → 1/BAG_25KG).
   - Cantidad/presentación ambigua → **sin fila en CSV**; anotá título, precio,
     link y estado PENDIENTE DE VALIDACIÓN HUMANA en report.md. Solo generás la
     fila si el usuario te indica el dato (ej. "ese pallet trae 90").
4. **report.md**: una sección por material — query usada o link reutilizado,
   título, precio, presentación observada, LINK COMPLETO de ML y estado
   (fila emitida / pendiente de validación). El usuario valida al final.

## Ciclo de reutilización de links

1. Corrida inicial: descubrís links por búsqueda; el usuario valida datos y
   links.
2. Persistí en `mercadolibre-validated-links.json` solo lo aprobado:
   `url`, `external_id`, `package_quantity` confirmada si aplica, fecha,
   nota libre. Un material sin entrada se busca de nuevo en la próxima corrida.
3. Corridas siguientes: abrí el link persistido y observá el precio vigente.
   Si el link murió (404 / publicación finalizada): **NO busques reemplazo por
   tu cuenta** — reportalo y consultá al usuario.

## Formato CSV

Contrato intacto con el importador: SOLO filas aceptadas, encabezado exacto de
13 columnas (sin `accepted` ni `rejection_reason`):

```csv
source,region,collected_at,material_code,external_id,title,url,currency,raw_price,package_quantity,package_unit,brand,seller
```

- `source=MERCADOLIBRE`, `region=GBA`, `currency=ARS`, `collected_at` real.
- `external_id` = `MLA<número>` sin guiones si la URL lo muestra; `""` si no.
- `raw_price` sin separadores de miles. Nunca `normalizedUnitPrice`.
- Rechazos/pendientes viven SOLO en report.md. Corrida sin filas → CSV con solo
  encabezado (el preview lo rechaza y está bien).

## Red Flags — STOP

- "El primer resultado es raro, pruebo el segundo" → NO. Primer resultado o
  link validado; lo raro se reporta para validación humana.
- "Es un pallet, divido $X / 90" → NO. Registrás `raw_price` completo +
  `package_quantity=90`; divide el importador. Dividir vos = solo con
  indicación explícita del usuario.
- "No veo la cantidad, pongo 1" → NO. Esa suposición fue EL falso positivo
  histórico ($115.000 por ladrillo). Queda pendiente de validación.
- "Abro varias publicaciones para más muestras" → NO. Este método releva UNA
  observación por material por diseño.
- "El link validado falló, busco otro parecido" → NO. Reportar y consultar.
- "La ficha dice otra presentación, descarto" → NO. Se registra la discrepancia
  en report.md; decide el usuario.

Violar la letra de estas reglas es violar su espíritu.
