# Relevamiento de precios Mercado Libre — 2026-08-25 (método v2, links validados)

**Método:** corrida con reutilización de los 3 links ya aprobados por el usuario
en `config/price-surveys/mercadolibre-validated-links.json` (sin búsquedas).
**Nivel de evidencia: verificación completa de página** (no modo tarjeta):
título, presentación y precio observados directamente en cada ficha, con
cruce contra JSON-LD/meta `itemprop=price`. Siempre precio de lista vigente
(las cuotas visibles se ignoran por regla del skill).

Sin rechazos ni pendientes en esta corrida. Vendedores observables cambiaron
respecto de ayer (son páginas de catálogo `/p/` con oferta rotativa); se
registra el vendedor visible hoy.

---

## CEMENTO_PORTLAND_25KG — Cemento Portland 25 kg

- Fuente: link validado (corrida 2026-08-24), sin búsqueda.
- Título observado: "Bolsa Cemento Avellaneda X 25 Kg"
- Precio visible en ficha: **$22.000/unidad** — coincide con JSON-LD y meta
  itemprop (22000 ARS, InStock).
- Presentación verificada en ficha: Marca Cementos Avellaneda S.A, Tipo
  Portland, **Peso 25 kg**, Unidad de venta Unidad → `1 / BAG_25KG`
- Vendedor visible hoy: SANITARIOSLAPRIMERA (MercadoLíder; ayer figuraba
  CEMENTOS AVELLANEDA S.A — misma página de catálogo MLA53674271).
- Inspeccionados: 1 / Aceptados: 1 / Rechazados: 0
- Rango observado: $22.000 (N=1)
- Estado: ✅ fila emitida

## CAL_HIDRATADA_25KG — Cal hidratada 25 kg

- Fuente: link validado (corrida 2026-08-24), sin búsqueda.
- Título observado: "Bolsa Cal Hidrat X 25 Kg"
- Precio visible en ficha: **$3.500/bolsa** — coincide con JSON-LD y meta
  (3500 ARS, InStock).
- Presentación verificada en ficha: Marca Hidrat, Fabricante Cementos
  Avellaneda, **Peso neto 25 kg** → `1 / BAG_25KG`
- Vendedor visible hoy: BETCEVE (+5 ventas).
- Inspeccionados: 1 / Aceptados: 1 / Rechazados: 0
- Rango observado: $3.500 (N=1)
- ⚠️ Warning persistente: esta publicación sigue siendo el outlier conocido
  ($3.500 vs cluster $8.800-$9.500 de la corrida v1). El usuario la validó
  sabiéndolo; se registra tal cual.
- Estado: ✅ fila emitida

## LADRILLO_HUECO_12X18X33 — Ladrillo hueco 12x18x33

- Fuente: link validado (corrida 2026-08-24), sin búsqueda.
- Título observado: "Ladrillo Huecos Por Unidad 12x18x33 9"
- Precio visible en ficha: **$2.850/unidad** — hoy coincide con JSON-LD y meta
  (2850 ARS, InStock). Ayer lo visible era $3.000 vs JSON-LD $2.850; hoy no hay
  discrepancia.
- Dimensiones verificadas en ficha: "Largo x Ancho x Altura = 33 cm x 12 cm x
  18 cm" → terna exacta {12,18,33} ✓. Venta por unidad → `1 / UNIT`
- Vendedor visible hoy: THE FISHEMAN (+100 ventas). Fabricante declarado: Easy.
- Inspeccionados: 1 / Aceptados: 1 / Rechazados: 0
- Rango observado: $2.850-$3.000 entre las corridas 08-24/08-25 (informativo)
- ⚠️ Warning menor: la tabla de atributos muestra un atributo raro
  "Cantidad de ladrillos = 7" (atributo de catálogo de Easy, posiblemente mal
  etiquetado). El título declara venta "Por Unidad" y el precio es consistente
  con el valor por unidad de ayer ($3.000); no hay señal de pack x7 a ese
  precio. Se emite como unidad con este warning asentado.
- Estado: ✅ fila emitida

---

## Resumen

| Material | Fuente | Precio observado hoy | CSV | Estado |
|---|---|---|---|---|
| CEMENTO_PORTLAND_25KG | link validado | $22.000 bolsa 25kg | ✅ | verificado |
| CAL_HIDRATADA_25KG | link validado | $3.500 bolsa 25kg (outlier) | ✅ | verificado |
| LADRILLO_HUECO_12X18X33 | link validado | $2.850/un unidad 12x18x33 | ✅ | verificado |

Rechazados y ambiguos: ninguno.
Pendientes de verificación: ninguno.

`mercadolibre-validated-links.json` no se modifica: los 3 links siguen vivos y
no hubo altas ni bajas que decidir.
