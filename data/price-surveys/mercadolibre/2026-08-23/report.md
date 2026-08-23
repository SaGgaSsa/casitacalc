# Mercado Libre Price Survey

Date: 2026-08-23
Region: GBA
Source: MERCADOLIBRE

> **WARNING — ACCESO LIMITADO / SIN OBSERVACIONES VERIFICADAS:** Mercado Libre
> bloqueó el acceso directo a publicaciones (login-wall anti-bot en `listado`,
> `articulo` y páginas de catálogo; también vía proxy lector). Bajo la regla
> "snippet = candidato, página verificada = evidencia", esta corrida **no
> genera observaciones aceptadas**: ningún precio fue verificado directamente
> en una página de publicación. Ningún dato fue inferido ni completado.
> Recomendación: re-ejecutar desde un entorno con navegación completa.

`prices.csv` queda solo con el encabezado. El preview del importador lo rechaza
(`MISSING_HEADER`: "El archivo no tiene una región válida") porque la región se
deriva de las filas — comportamiento esperado y correcto: no había nada que
importar.

## CEMENTO_PORTLAND_50KG

Queries:
- cemento portland 50 kg
- cemento holcim fuerte 50 kg bolsa precio
- site:articulo.mercadolibre.com.ar "cemento portland" "50"

Candidates inspected: 9
Accepted: 0

Observed range: n/a (sin muestras verificadas)

Rechazados y ambiguos:
- MLA2106435990 — Cemento Portland gris Revokito x 1 Kg ($2.000) — WRONG_PACKAGE_SIZE

Pendientes de verificación (presentación correcta en título/snippet, página
inaccesible o sin precio observable):
- MLA1401670069 Loma Negra 50 kg x2 (pack)
- MLA1592109074 Loma Negra x 50 kg
- MLA1625442792 Avellaneda 50 kg
- MLA927158729 Holcim bolsa x 50 kg
- MLA848188744 Holcim bolsa x 50 kg (Degacor)
- MLA872756655 Avellaneda CPC40 x 50 kg ("Oferta")
- MLA1845974896 Caller Portland gris 5 kg — WRONG_PACKAGE_SIZE además

Warnings:
- Publicaciones pausadas detectadas en resultados: excluidas.

Status: INSUFFICIENT_SAMPLE_SIZE

## CAL_HIDRATADA_25KG

Queries:
- site:articulo.mercadolibre.com.ar "cal hidratada" 25 kg bolsa

Candidates inspected: 3
Accepted: 0

Observed range: n/a (sin muestras verificadas)

Rechazados y ambiguos:
- MLA1411392523 Cal Hidratada Santa Elena 20 kg — WRONG_PACKAGE_SIZE
- MLA1403328709 Cal Hidratada Extra 25 kg pack x2 — cantidad declarada pero sin
  acceso a la página para verificar precio (NOT_ENOUGH_INFORMATION)

Pendientes de verificación:
- MLA2200248072 Bolsa De Cal Hidratada Común Avellaneda 25 Kgs — snippet mostraba
  "$7.500" de lista; página inaccesible → NO se registra como observación.
  Primer candidato a verificar en re-corrida con navegación completa.

Status: INSUFFICIENT_SAMPLE_SIZE

## LADRILLO_HUECO_18X18X33

Queries:
- site:articulo.mercadolibre.com.ar ladrillo hueco ceramico 18x18x33
- ladrillo hueco ceramico "18x18x33" precio mercadolibre articulo
- site:listado.mercadolibre.com.ar "ladrillo hueco" "18x18x33"

Candidates inspected: 4
Accepted: 0

Observed range: n/a (sin muestras verificadas)

Pendientes de verificación:
- Snippet de listado sin URL de publicación: "Ladrillo Hueco 18x18x33 X Pallet
  (90 Unidades) Materiales Nuciari $111.942" — cantidad declarada y precio
  visibles en el snippet, pero sin publicación identificable. Buscar la
  publicación real en la próxima corrida.

Warnings:
- Precios de corralones fuera de Mercado Libre (Canarias, Ferromundo, etc.):
  fuente fuera de alcance (source=MERCADOLIBRE); ignorados.

Status: INSUFFICIENT_SAMPLE_SIZE

## Resumen de corrida

| Material | Aceptadas | Estado |
|---|---|---|
| CEMENTO_PORTLAND_50KG | 0 | INSUFFICIENT_SAMPLE_SIZE |
| CAL_HIDRATADA_25KG | 0 | INSUFFICIENT_SAMPLE_SIZE |
| LADRILLO_HUECO_18X18X33 | 0 | INSUFFICIENT_SAMPLE_SIZE |

Ningún criterio fue relajado para aumentar muestras. El importador/admin decide
el paso siguiente.
