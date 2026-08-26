# Relevamiento de precios Mercado Libre — 2026-08-25 (método v2, catálogo consolidado)

**Método:** corrida en dos pasadas. Primera pasada automática sobre los 24
materiales (links validados + búsqueda genérica, primer orgánico, una sola
verificación). Segunda pasada tras revisión humana del informe: se aplicaron
decisiones de catálogo y links aprobados explícitamente por el usuario, que se
persistieron en `mercadolibre-validated-links.json`.

**Cambios de catálogo aplicados en esta revisión** (`materials.json` v2, ahora
22 materiales):

- `CEMENTO_PORTLAND_50KG` removido: resuelto con el cemento de 25 kg.
- `ARENA_GRUESA` + `ARENA_FINA` unificados en `ARENA` ("Arena"): en la práctica
  siempre se usa arena fina; el survey la busca como "arena fina".
- `TIRANTE_MADERA_2X3` → `TIRANTE_MADERA_2X4`: el tirante real es 2"x4".
- `CANO_PVC_40_4M` → `CANO_PVC_20_3M`: caño PVC eléctrico 20 mm x 3 m.
- `PEGAMENTO_CERAMICO_30KG` → `PEGAMENTO_CERAMICO_25KG`: desbloquea BAG_25KG.

**Nivel de evidencia:** verificación completa de página (título, presentación,
precio en ficha, cruce contra JSON-LD/meta). Siempre precio de lista vigente;
cuotas ignoradas. Cobertura total: 22/22 materiales con fila emitida; ninguna
fila fue inventada ni dividida manualmente — las normalizaciones no declaradas
en ficha (bolson de arena, bolson de piedra 1 m³, cerámicas /m²) fueron
indicadas explícitamente por el usuario y quedan asentadas en cada sección.

---

## LADRILLO_HUECO_12X18X33 — Ladrillo hueco 12x18x33

- Fuente: link validado (corrida 2026-08-24), sin búsqueda.
- Título observado: "Ladrillo Huecos Por Unidad 12x18x33 9"
- Precio visible: **$2.850/unidad** (DOM = JSON-LD, InStock).
- Presentación verificada: terna {12,18,33} ✓, venta por unidad → `1 / UNIT`.
- Vendedor visible: THE FISHEMAN (+100 ventas).
- Estado: ✅ fila emitida.

## CEMENTO_PORTLAND_25KG — Cemento Portland 25 kg

- Fuente: link validado (corrida 2026-08-24), sin búsqueda.
- Título observado: "Bolsa Cemento Avellaneda X 25 Kg"
- Precio visible: **$22.000/bolsa 25 kg** (DOM = JSON-LD).
- Vendedor visible hoy: SANITARIOSLAPRIMERA.
- Estado: ✅ fila emitida.
- Nota: cubre también al ex `CEMENTO_PORTLAND_50KG`, removido del catálogo.

## CAL_HIDRATADA_25KG — Cal hidratada 25 kg

- Fuente: link validado (corrida 2026-08-24), sin búsqueda.
- Título observado: "Bolsa Cal Hidrat X 25 Kg"
- Precio visible: **$3.500/bolsa 25 kg**.
- ⚠️ Warning persistente: outlier conocido ($3.500 vs cluster $8.800-$9.500);
  el usuario lo mantiene validado.
- Estado: ✅ fila emitida.

## ARENA — Arena (ex ARENA_GRUESA / ARENA_FINA)

- Fuente: link aprobado por el usuario en la revisión; búsqueda original
  `arena fina`.
- Título observado: "Arena Fina Construccion Bolson + (seña Por Bolson)"
- Precio visible: **$45.000/bolson** — vendedor corralondemar.
  https://www.mercadolibre.com.ar/up/MLAU256624573
- El título menciona "seña", pero el usuario confirmó: "el precio está bien,
  es el del bolson (50.000 en Easy)".
- Emitida bajo indicación expresa del usuario → `1 / M3` (el bolson se toma
  como unidad del material).
- Estado: ✅ fila emitida por decisión humana asentada.

## PIEDRA_BOLA — Piedra bola 20/40

- Fuente: link aprobado por el usuario (búsqueda `piedra construccion`).
- Título observado: "Piedra En Bolsón X 900kg Zona Oeste Capital" — $67.684 —
  Materiales Nuciari, Modelo Piedra Partida 6/20 (equivalente funcional).
  https://www.mercadolibre.com.ar/up/MLAU365715250
- Normalización: el usuario confirmó que **el bolson es de 1 m³** → `1 / M3`
  ($67.684/m³). La ficha declara 900 kg por bolson; el volumen quedó asentado
  por indicación humana.
- Estado: ✅ fila emitida por decisión humana asentada.

## ACERO_LOSA_ADL15 — Acero para losa (varillas + malla)

- Fuente: link aprobado por el usuario ("varilla 8mm x 12 metros"); la query
  del spec quedó en `varilla hierro para losa`.
- Título observado: "Varilla De Hierro Aletado 8mm Construccion" — **$14.403
  por barra** — Acerbrag, sin vendedor visible.
  https://www.mercadolibre.com.ar/up/MLAU282801822
- Presentación declarada en la ficha (descripción): Diámetro 8 mm, Largo
  12 mts, **Peso: 4,74 Kg**, aletada ADN-420 → barra = 4,74 kg de acero
  → `4.74 / KG`; normalizado ≈ $3.039,45/kg.
- Estado: ✅ fila emitida.

## CHAPA_TRAPEZOIDAL_C25 — Chapa trapezoidal C25

- Fuente: link aprobado por el usuario (era posición 2 de la búsqueda original
  `chapa trapezoidal`).
- Título observado: "Chapa Trapezoidal Color C25 Largo 2,00 Mts Ternium Color
  Negra"
- Precio visible: **$60.298/lámina** (DOM = JSON-LD) — Tienda oficial Provecom.
- Presentación verificada: Calibre C25 ✓, espesor 0,5 mm, Largo x Ancho
  **2 m x 1,1 m**, Unidad de venta Lámina → lámina = 2 metros lineales
  → `2 / METER`; normalizado ≈ $30.149/ml.
- Estado: ✅ fila emitida.

## TIRANTE_MADERA_2X4 — Tirante de madera 2"x4"

- Fuente: link aprobado por el usuario; código renombrado desde _2X3.
- Título observado: "Tirante De Madera Pino Cepillado 2 X 4 X 3.05 Mts Techos"
- Precio visible: **$7.600/pieza** — pino Alto Paraná, sin vendedor visible.
- Presentación verificada: 3,05 m × 10 cm × 5 cm (2"x4" ✓) → pieza de 3,05
  metros lineales → `3.05 / METER`; normalizado ≈ $2.492/ml.
- Estado: ✅ fila emitida.

## TORNILLO_AUTOPERFORANTE — Tornillo autoperforante techa

- Fuente: link aprobado por el usuario; REEMPLAZA al tornillo de durlock
  relevado en la primera pasada (fila descartada, MLA28987946).
- Título observado: "Tornillo Autoperf Hex Pta Mecha 14 X 2 1/2 (6,3 X 63mm)"
- Precio visible: **$23.999/pack** — Cambell — FERRETERIA LAURE.
- Presentación verificada: hexagonal, punta mecha, uso declarado "fijación de
  chapas metálicas" (techa ✓); Formato Pack, **Unidades por pack: 200**
  → `200 / UNIT`; normalizado ≈ $120/tornillo.
- Estado: ✅ fila emitida.

## FILM_BARRERA_HIDRICA — Film barrera de humedad

- Sin cambios respecto de la primera pasada (sin observación del usuario).
- "Film Nylon Negro Polietileno Aislante 4 X Metro 200 Micrones" — $5.980 —
  Ancho 4 m × Largo 1 m, Rendimiento declarado 4 m² → `4 / M2`
  (≈$1.495/m²). Mayorista-Plast / MAYORISTA-PLAST.
  https://www.mercadolibre.com.ar/p/MLA2089996126
- Estado: ✅ fila emitida.

## INODORO_COMPLETO — Inodoro completo con mochila

- Fuente: link aprobado por el usuario; REEMPLAZA al smart toilet de la primera
  pasada (outlier descartado, MLA68375743).
- Título observado: "Inodoro Largo de Loza Sanitaria con Tanque y Asiento,
  Modelo Delfi en Blanco"
- Precio visible: **$209.999/unidad** (DOM = JSON-LD) — Global Sanitarios.
- Presentación verificada: inodoro largo c/deposito, loza sanitaria →
  `1 / UNIT`.
- Estado: ✅ fila emitida.

## LAVATORIO_PEDESTAL — Lavatorio con pedestal

- Fuente: link aprobado por el usuario ("bacha de baño"); reemplaza el
  pendiente de la primera pasada (bacha bajo mesada, MLA29789240).
- Título observado: "Bacha De Baño Aries M-311 Blanca 61x47,5x87,5cm
  C/pedestal"
- Precio visible: **$142.000/unidad** — Aries / ARIES 123.
- Presentación verificada: bacha blanca con pedestal (altura total 87,5 cm)
  → `1 / UNIT`.
- Estado: ✅ fila emitida.

## GRIFERIA_LAVATORIO — Grifería de lavatorio

- Sin cambios respecto de la primera pasada (sin observación del usuario).
- "Grifería Para Baño Completo Hydros Lavatorio - 344211 - De mesa..." —
  $41.891 — Hydros / GRAMABI → `1 / UNIT`.
  https://www.mercadolibre.com.ar/p/MLA22798151
- Estado: ✅ fila emitida.

## DUCHA_JUEGO — Juego de ducha

- Fuente: link aprobado por el usuario; REEMPLAZA a la columna digital de la
  primera pasada (MLA74875399).
- Título observado: "Juego Griferia Baño Combo Peirano Pura Baño Bidet Ducha"
- Precio visible: **$224.858/juego** — Peirano, línea Pura, cromo.
- Presentación verificada: combo grifería baño+bidet+ducha, doble comando
  → `1 / UNIT`.
- ⚠️ Warning menor: incluye grifería de bidet (combo), no solo ducha.
- Estado: ✅ fila emitida con warning asentado.

## CANO_PVC_100_4M — Caño PVC 110 mm x 4 m

- Sin cambios respecto de la primera pasada.
- "Caño Desague 110 X 4 Mt C/ Oring Awaduct Cloacal Y Pluvial" — $32.999 —
  Awaduct (ficha declara polipropileno, warning asentado) → `1 / UNIT`.
  https://www.mercadolibre.com.ar/p/MLA29748381
- Estado: ✅ fila emitida.

## CANO_PVC_20_3M — Caño PVC 20 mm x 3 m

- Fuente: link aprobado por el usuario; código renombrado desde CANO_PVC_40_4M
  (el caño real es eléctrico rígido de 20 mm).
- Título observado: "Caño Rigido Pvc 20mm Kalop X 3mts Exterior X 30 Unidades"
- Precio visible: **$74.273/pack x30** — Kalop, sello IRAM, curvable en frío;
  sin vendedor visible.
- Presentación verificada: Formato Pack, Unidades por pack 30 (la ficha abre
  en ×30; existen variantes ×5/×10 como publicaciones separadas). La receta
  necesita 2 caños/baño; se registra el pack tal cual se vende → `30 / UNIT`;
  normalizado ≈ $2.475,77/caño de 3 m.
- Estado: ✅ fila emitida.

## DESAGUE_PISO — Desagüe de piso

- Sin cambios respecto de la primera pasada.
- "Rejilla Piso Acero Inox 10x10cm Inomax Anti Pelo Bichos Olor" — $7.428 —
  rejilla c/marco → `1 / UNIT`. https://www.mercadolibre.com.ar/p/MLA40332783
- Estado: ✅ fila emitida.

## SIFON_LAVATORIO — Sifón lavatorio

- Sin cambios respecto de la primera pasada.
- "Sifon Simple Pvc Regulable - Duke Color Blanco" — $9.050 — Duke /
  sanitariosnuevacelina → `1 / UNIT`.
  https://www.mercadolibre.com.ar/p/MLA27087834
- Estado: ✅ fila emitida.

## CERAMICA_PISO — Cerámica de piso

- Fuente: ficha de la primera pasada, ahora aprobada por el usuario con la
  instrucción: "está declarado como /m2 ... calcular con eso".
- Título observado: "Ceramica Scop Asturias Deco 45,3x45,3 Calcareo M2 1ra"
- Precio visible: **$11.258/m²** (DOM = JSON-LD 11258) — San Lorenzo.
  https://www.mercadolibre.com.ar/up/MLAU3647535113
- Emitida bajo indicación expresa del usuario → `1 / M2`. La ficha muestra
  "Unidad de venta: Caja"; el criterio /m² quedó asentado aquí.
- Estado: ✅ fila emitida por decisión humana asentada.

## CERAMICA_PARED — Cerámica de pared

- Fuente: link aprobado por el usuario, mismo criterio /m² que piso.
- Título observado: "Cerámica 33x33 Azul Simil Venecita Revestimiento Pileta"
- Precio visible: **$20.630/m²** — Tuazulejo, azulejo brillante para pared
  (uso declarado pared/piso/pileta).
  https://www.mercadolibre.com.ar/up/MLAU259623289
- Emitida bajo indicación expresa del usuario → `1 / M2` (la ficha dice
  "Unidad de venta: Caja"; criterio asentado).
- Estado: ✅ fila emitida por decisión humana asentada.

## PEGAMENTO_CERAMICO_25KG — Pegamento cerámico 25 kg

- Código renombrado desde `_30KG` por decisión del usuario ("cambiar a 25kg");
  esto desbloquea el enum (`BAG_25KG`).
- Fuente: primer resultado de la búsqueda original `pegamento ceramico`,
  verificado hoy: coincide con la nueva presentación del material.
- Título observado: "Pegamento Adhesivo Impermeable Potenciado 25 Kg Klaukol
  Sika"
- Precio visible: **$23.850/bolsa 25 kg** — Klaukol / corralondemar.
  https://www.mercadolibre.com.ar/p/MLA45718445
- Presentación verificada: Bolsa, peso 25 kg → `1 / BAG_25KG`.
- Estado: ✅ fila emitida.

## PASTINA — Pastina

- Sin cambios respecto de la primera pasada (sin observación del usuario).
- "Repara Pastina En Pomo Sinteplast | Color Gris I 420 Gr" — $11.495 —
  Peso declarado 420 g → `0.42 / KG` (≈$27.369/kg).
  https://www.mercadolibre.com.ar/p/MLA66799576
- ⚠️ Warning fuerte persistente: pastina acrílica de reparación en pomo chico,
  no pastina cementicia en bolsa; el precio/kg resultará outlier. Sujeta a
  descarte en el preview del importador.
- Estado: ✅ fila emitida con warning asentado.

---

## Resumen

| Material | Fuente | Precio observado | CSV | Estado |
|---|---|---|---|---|
| LADRILLO_HUECO_12X18X33 | link validado | $2.850/un | ✅ | emitido |
| CEMENTO_PORTLAND_25KG | link validado | $22.000 bolsa 25kg | ✅ | emitido |
| CAL_HIDRATADA_25KG | link validado | $3.500 bolsa 25kg (outlier conocido) | ✅ | emitido |
| ARENA | link aprobado usuario | $45.000/bolson (=1 m3 por indicación) | ✅ | emitido c/nota |
| PIEDRA_BOLA | link aprobado usuario | $67.684/bolson = 1 m3 (indicación humana) | ✅ | emitido c/nota |
| ACERO_LOSA_ADL15 | link aprobado usuario | $14.403/barra 8mm x12m = 4,74 kg (≈$3.039,45/kg) | ✅ | emitido |
| CHAPA_TRAPEZOIDAL_C25 | link aprobado usuario | $60.298 lámina 2m (≈$30.149/ml) | ✅ | emitido |
| TIRANTE_MADERA_2X4 | link aprobado usuario | $7.600 pieza 3,05m (≈$2.492/ml) | ✅ | emitido |
| TORNILLO_AUTOPERFORANTE | link aprobado usuario | $23.999 pack x200 (≈$120/un) | ✅ | emitido |
| FILM_BARRERA_HIDRICA | búsqueda v1 | $5.980 x 4 m² (≈$1.495/m²) | ✅ | emitido |
| INODORO_COMPLETO | link aprobado usuario | $209.999/un | ✅ | emitido |
| LAVATORIO_PEDESTAL | link aprobado usuario | $142.000/un | ✅ | emitido |
| GRIFERIA_LAVATORIO | búsqueda v1 | $41.891/un | ✅ | emitido |
| DUCHA_JUEGO | link aprobado usuario | $224.858/juego combo | ✅ | emitido c/warning |
| CANO_PVC_100_4M | búsqueda v1 | $32.999/caño 4m | ✅ | emitido c/warning |
| CANO_PVC_20_3M | link aprobado usuario | $74.273 pack x30 (≈$2.475,77/caño) | ✅ | emitido |
| DESAGUE_PISO | búsqueda v1 | $7.428/un | ✅ | emitido |
| SIFON_LAVATORIO | búsqueda v1 | $9.050/un | ✅ | emitido |
| CERAMICA_PISO | aprobada usuario (/m2) | $11.258/m² | ✅ | emitido c/nota |
| CERAMICA_PARED | link aprobado usuario (/m2) | $20.630/m² | ✅ | emitido c/nota |
| PEGAMENTO_CERAMICO_25KG | búsqueda v1 + rename | $23.850 bolsa 25kg | ✅ | emitido |
| PASTINA | búsqueda v1 | $11.495 pomo 420g (≈$27.369/kg) | ✅ | emitido c/warning |

Totales: 22 materiales del catálogo consolidado → **22 filas emitidas /
0 pendientes**: el CSV cumple la cobertura total exigida por el importador.

Filas descartadas por decisión humana en esta revisión:

- Tornillo drywall T2 ×1000 (MLA28987946) → reemplazado por el techa ×200.
- Inodoro smart Casa Hadid $838.766 (MLA68375743) → reemplazado por Delfi.
- Columna ducha digital Fikoo (MLA74875399) → reemplazada por combo Peirano.
- Varilla 25mm Acerbrag $102.000 sin unidad declarada (MLAU234147351) →
  reemplazada por la varilla 8mm × 12 m con peso declarado en ficha.

Criterios humanos asentados (revisar en preview del importador):

- ARENA: bolson tomado como 1 m3 a $45.000 (referencia Easy $50.000).
- CERAMICA_PISO/PARED: precios tratados como /m2 aunque la ficha dice
  "Unidad de venta: Caja".
- Opcionales a descartar fila por fila si se prefieren proxies más limpios:
  CAL_HIDRATADA_25KG (outlier histórico $3.500), PASTINA (formato pomo
  acrílico), DUCHA_JUEGO (combo con bidet).

`mercadolibre-validated-links.json` actualizado: 13 links aprobados (los 3
originales + 10 de esta revisión). Listo para importar y publicar desde el
admin.
