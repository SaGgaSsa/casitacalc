# Catálogo Maestro de Materiales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar la definición de materiales en un solo archivo (`packages/shared/src/materials.json`) del que derivan `calculator-core`, el seed de DB y el agente del skill de relevamiento de precios.

**Architecture:** Datos maestros como JSON importado estáticamente en `shared` (capa base), validado con Zod al cargar. `calculator-core` deriva su `DEFAULT_MATERIAL_CATALOG` (API pública intacta); `seed.ts` itera el maestro y pierde su mapa `CATEGORIAS`; un test anti-drift garantiza que las specs del skill solo referencien códigos existentes.

**Tech Stack:** TypeScript + Zod (ya en shared), Vitest (calculator-core), tsc `resolveJsonModule` (ya en `tsconfig.base.json`; verificado que tsc copia el JSON al `dist/`).

**Spec:** Diseño aprobado en chat (2026-08-23): archivo maestro identidad-only (sin precios), ubicación `packages/shared`, sin tocar schema Prisma ni flujo de importación ni precios demo.

## Global Constraints

- Exportar PNPM antes de cualquier comando: `export PNPM_HOME="$HOME/.local/share/pnpm"; export PATH="$PNPM_HOME/bin:$PATH"`.
- Dependencias solo hacia abajo: `web → {db, calculator-core} → shared`. El JSON vive en shared porque es la única capa de la que dependen todos los consumidores.
- Los workspace deps resuelven a **dist**: tras cambiar shared, correr `pnpm --filter @casitacalc/shared build` antes de testear/typecheckear consumidores.
- NO crear ABM, NO modificar `schema.prisma`, NO tocar `PRECIOS_REFERENCIA` ni el flujo de importación de precios.
- Valores de `unidad`: strings exactas del enum `Unit` de shared: `"un" | "bolsa" | "kg" | "l" | "m2" | "m3" | "ml"`.
- Commits Conventional en español (estilo repo: `feat(prices): ...`). Nunca `git add -A`.
- Al terminar cada tarea: commit explícito con rutas.

---

### Task 1: Catálogo maestro en shared (datos + loader) con test

**Files:**
- Create: `packages/shared/src/materials.json`
- Create: `packages/shared/src/materials-catalog.ts`
- Modify: `packages/shared/src/index.ts` (agregar export)
- Test: `packages/calculator-core/tests/materials-catalog.test.ts`

**Interfaces:**
- Produces: `MATERIAL_CATALOG: MaterialMasterEntry[]` donde `MaterialMasterEntry = { codigo: string; nombre: string; categoria: string; unidad: Unit }`, y `MATERIAL_CODES: ReadonlySet<string>` — exportados desde `@casitacalc/shared`. Las tareas 2, 3 y 4 consumen exactamente estos nombres.

- [ ] **Step 1: Escribir el test que falla**

Crear `packages/calculator-core/tests/materials-catalog.test.ts` (mismo estilo de imports que `calculator.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { MATERIAL_CATALOG } from "@casitacalc/shared";

describe("catálogo maestro de materiales", () => {
  it("carga las 23 entradas desde el archivo maestro", () => {
    expect(MATERIAL_CATALOG.length).toBe(23);
  });

  it("cada entrada tiene código/nombre/categoría no vacíos y formato de código estable", () => {
    for (const entry of MATERIAL_CATALOG) {
      expect(entry.codigo).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(entry.nombre.length).toBeGreaterThan(0);
      expect(entry.categoria.length).toBeGreaterThan(0);
    }
  });

  it("no tiene códigos duplicados", () => {
    const codigos = MATERIAL_CATALOG.map((m) => m.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
pnpm --filter @casitacalc/calculator-core exec vitest run tests/materials-catalog.test.ts
```

Esperado: FAIL — el import de `MATERIAL_CATALOG` no existe en `@casitacalc/shared`.

- [ ] **Step 3: Crear `packages/shared/src/materials.json`**

Contenido EXACTO (merge de `DEFAULT_MATERIAL_CATALOG` en `recipes-defaults.ts:22-46` + mapa `CATEGORIAS` en `seed.ts:35-59`; `unidad` con valores del enum `Unit`):

```json
[
  { "codigo": "LADRILLO_HUECO_18X18X33", "nombre": "Ladrillo hueco 18x18x33", "categoria": "Mampostería", "unidad": "un" },
  { "codigo": "CEMENTO_PORTLAND_50KG", "nombre": "Cemento Portland 50 kg", "categoria": "Aglomerantes", "unidad": "bolsa" },
  { "codigo": "CAL_HIDRATADA_25KG", "nombre": "Cal hidratada 25 kg", "categoria": "Aglomerantes", "unidad": "bolsa" },
  { "codigo": "ARENA_GRUESA", "nombre": "Arena gruesa de construcción", "categoria": "Agregados", "unidad": "m3" },
  { "codigo": "ARENA_FINA", "nombre": "Arena fina", "categoria": "Agregados", "unidad": "m3" },
  { "codigo": "PIEDRA_BOLA", "nombre": "Piedra bola 20/40", "categoria": "Agregados", "unidad": "m3" },
  { "codigo": "ACERO_LOSA_ADL15", "nombre": "Acero para losa (malla + hierros)", "categoria": "Hierro y acero", "unidad": "kg" },
  { "codigo": "CHAPA_TRAPEZOIDAL_C25", "nombre": "Chapa trapezoidal C25", "categoria": "Techo", "unidad": "ml" },
  { "codigo": "TIRANTE_MADERA_2X3", "nombre": "Tirante de madera 2\"x3\"", "categoria": "Techo", "unidad": "ml" },
  { "codigo": "TORNILLO_AUTOPERFORANTE", "nombre": "Tornillo autoperforante techa", "categoria": "Techo", "unidad": "un" },
  { "codigo": "FILM_BARRERA_HIDRICA", "nombre": "Film barrera de humedad", "categoria": "Techo", "unidad": "m2" },
  { "codigo": "INODORO_COMPLETO", "nombre": "Inodoro completo con mochila", "categoria": "Sanitarios", "unidad": "un" },
  { "codigo": "LAVATORIO_PEDESTAL", "nombre": "Lavatorio con pedestal", "categoria": "Sanitarios", "unidad": "un" },
  { "codigo": "GRIFERIA_LAVATORIO", "nombre": "Grifería de lavatorio", "categoria": "Sanitarios", "unidad": "un" },
  { "codigo": "DUCHA_JUEGO", "nombre": "Juego de ducha", "categoria": "Sanitarios", "unidad": "un" },
  { "codigo": "CANO_PVC_100_4M", "nombre": "Caño PVC 110 mm x 4 m", "categoria": "Sanitarios", "unidad": "un" },
  { "codigo": "CANO_PVC_40_4M", "nombre": "Caño PVC 40 mm x 4 m", "categoria": "Sanitarios", "unidad": "un" },
  { "codigo": "DESAGUE_PISO", "nombre": "Desagüe de piso", "categoria": "Sanitarios", "unidad": "un" },
  { "codigo": "SIFON_LAVATORIO", "nombre": "Sifón lavatorio", "categoria": "Sanitarios", "unidad": "un" },
  { "codigo": "CERAMICA_PISO", "nombre": "Cerámica de piso", "categoria": "Revestimientos", "unidad": "m2" },
  { "codigo": "CERAMICA_PARED", "nombre": "Cerámica de pared", "categoria": "Revestimientos", "unidad": "m2" },
  { "codigo": "PEGAMENTO_CERAMICO_30KG", "nombre": "Pegamento cerámico 30 kg", "categoria": "Adhesivos", "unidad": "bolsa" },
  { "codigo": "PASTINA", "nombre": "Pastina", "categoria": "Adhesivos", "unidad": "kg" }
]
```

- [ ] **Step 4: Crear `packages/shared/src/materials-catalog.ts`**

```ts
import { z } from "zod";
import rawCatalog from "./materials.json";
import { UnitEnum, type Unit } from "./enums";

/** Entrada del catálogo maestro de materiales (`src/materials.json`). */
export interface MaterialMasterEntry {
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: Unit;
}

const MaterialMasterEntrySchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  unidad: UnitEnum,
});

const MaterialCatalogFileSchema = z
  .array(MaterialMasterEntrySchema)
  .min(1)
  .refine(
    (entries) => new Set(entries.map((e) => e.codigo)).size === entries.length,
    "Códigos de material duplicados en materials.json",
  );

/** Catálogo maestro validado. Falla rápido al importar si el archivo es inválido. */
export const MATERIAL_CATALOG: MaterialMasterEntry[] =
  MaterialCatalogFileSchema.parse(rawCatalog);

/** Set de códigos válidos para consultas rápidas (tests, guards). */
export const MATERIAL_CODES: ReadonlySet<string> = new Set(
  MATERIAL_CATALOG.map((m) => m.codigo),
);
```

- [ ] **Step 5: Exportar desde `packages/shared/src/index.ts`**

Agregar junto a los demás `export *`:

```ts
export * from "./materials-catalog";
```

- [ ] **Step 6: Build de shared y verificar que el test pasa**

```bash
pnpm --filter @casitacalc/shared build && ls packages/shared/dist/materials.json && pnpm --filter @casitacalc/calculator-core exec vitest run tests/materials-catalog.test.ts
```

Esperado: build OK, `dist/materials.json` existe (tsc lo copia), 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/materials.json packages/shared/src/materials-catalog.ts packages/shared/src/index.ts packages/calculator-core/tests/materials-catalog.test.ts
git commit -m "feat(shared): catálogo maestro de materiales validado con Zod"
```

---

### Task 2: calculator-core deriva DEFAULT_MATERIAL_CATALOG del maestro

**Files:**
- Modify: `packages/calculator-core/src/recipes-defaults.ts:1-46`

**Interfaces:**
- Consumes: `MATERIAL_CATALOG` desde `@casitacalc/shared` (Task 1).
- Produces: `DEFAULT_MATERIAL_CATALOG: MaterialCatalog` sin cambios de forma — `Record<string, { nombre: string; unidad: Unit }>`. Consumidores actuales (`calculator.ts`, `seed.ts`, tests) no cambian.

- [ ] **Step 1: Reemplazar la definición hardcodeada**

En `recipes-defaults.ts`, agregar al import existente de shared `MATERIAL_CATALOG`, y reemplazar el objeto literal `DEFAULT_MATERIAL_CATALOG` (líneas 22-46) por:

```ts
import { MATERIAL_CATALOG, ... } from "@casitacalc/shared";
```

```ts
/**
 * Catálogo derivado del archivo maestro `packages/shared/src/materials.json`
 * (fuente única compartida con el seed y el relevamiento de precios).
 */
export const DEFAULT_MATERIAL_CATALOG: MaterialCatalog = Object.fromEntries(
  MATERIAL_CATALOG.map((m) => [m.codigo, { nombre: m.nombre, unidad: m.unidad }]),
);
```

Las interfaces `MaterialCatalogEntry` y `MaterialCatalog` quedan como están.

- [ ] **Step 2: Correr toda la suite de calculator-core**

```bash
pnpm --filter @casitacalc/calculator-core test
```

Esperado: PASS sin cambios en ningún test (la derivación produce exactamente el mismo contenido).

- [ ] **Step 3: Commit**

```bash
git add packages/calculator-core/src/recipes-defaults.ts
git commit -m "refactor(calculator-core): derivar DEFAULT_MATERIAL_CATALOG del catálogo maestro"
```

---

### Task 3: seed.ts consume el catálogo maestro

**Files:**
- Modify: `packages/db/src/seed.ts:1-84`

**Interfaces:**
- Consumes: `MATERIAL_CATALOG` desde `@casitacalc/shared` (Task 1).
- Produces: mismas filas `Material` en DB que hoy (codigo/nombre/categoria/unidad idénticos).

- [ ] **Step 1: Editar seed.ts**

Cambios exactos:
1. Import: quitar `DEFAULT_MATERIAL_CATALOG` (queda `DEFAULT_RECIPES`); agregar `MATERIAL_CATALOG` al import de `@casitacalc/shared`.
2. Borrar el mapa `CATEGORIAS` completo (líneas 35-59).
3. Reemplazar `seedMaterials()`:

```ts
async function seedMaterials() {
  const fecha = new Date();
  for (const info of MATERIAL_CATALOG) {
    const precio = PRECIOS_REFERENCIA[info.codigo];
    if (precio === undefined) {
      throw new Error(`Falta precio de referencia para "${info.codigo}" en el seed`);
    }
    await prisma.material.upsert({
      where: { codigo: info.codigo },
      create: {
        codigo: info.codigo,
        nombre: info.nombre,
        categoria: info.categoria,
        unidad: info.unidad,
        precioDefault: precio,
        precioActual: precio,
        fechaActualizacionPrecio: fecha,
        fuente: "Referencia demo",
      },
      update: {},
    });
  }
  console.log(`✓ Materiales: ${MATERIAL_CATALOG.length}`);
}
```

- [ ] **Step 2: Typecheck de db**

```bash
pnpm --filter @casitacalc/db typecheck
```

Esperado: PASS.

- [ ] **Step 3: Correr el seed real contra la DB local (verificación end-to-end)**

```bash
docker compose -f ~/docker/postgresql/compose.yaml up -d
export DATABASE_URL="$(grep '^DATABASE_URL' packages/db/.env | cut -d'"' -f2)"
pnpm --filter @casitacalc/db seed
```

Esperado: `✓ Materiales: 23` + `Seed completado` (upserts idempotentes; la DB queda igual que antes).

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/seed.ts
git commit -m "refactor(db): seed consume el catálogo maestro de shared"
```

---

### Task 4: Guard anti-drift specs de relevamiento ↔ catálogo maestro

**Files:**
- Modify: `packages/calculator-core/tests/materials-catalog.test.ts`

**Interfaces:**
- Consumes: `MATERIAL_CATALOG` (Task 1); archivo `config/price-surveys/mercadolibre-price-specs.json` leído con fs.
- Produces: nada exportable — es un test de regresión que rompe CI si alguien agrega una spec con código inexistente.

- [ ] **Step 1: Agregar el test**

Append al archivo de Task 1:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SPECS_PATH = fileURLToPath(
  new URL("../../../config/price-surveys/mercadolibre-price-specs.json", import.meta.url),
);

describe("drift: specs de relevamiento vs catálogo maestro", () => {
  it("todo materialCode de las specs existe en el catálogo maestro", () => {
    const specs = JSON.parse(readFileSync(SPECS_PATH, "utf8")) as {
      materials: { materialCode: string }[];
    };
    for (const spec of specs.materials) {
      expect(
        MATERIAL_CODES.has(spec.materialCode),
        `materialCode desconocido en specs: ${spec.materialCode}`,
      ).toBe(true);
    }
  });
});
```

Nota: `MATERIAL_CODES` hay que importarlo también en el import de `@casitacalc/shared` del Step 1 de Task 1.

Ruta: `tests/` → `../../../` llega a la raíz del monorepo → `config/...`. Correcto.

- [ ] **Step 2: Correr el test**

```bash
pnpm --filter @casitacalc/calculator-core exec vitest run tests/materials-catalog.test.ts
```

Esperado: PASS (los 3 códigos de las specs existen en el maestro). Si fallara, hay drift REAL: corregir el código en las specs, nunca al revés.

- [ ] **Step 3: Commit**

```bash
git add packages/calculator-core/tests/materials-catalog.test.ts
git commit -m "test(calculator-core): guard anti-drift entre specs de relevamiento y catálogo"
```

---

### Task 5: Skill y AGENTS.md apuntan al archivo maestro

**Files:**
- Modify: `.agents/skills/mercadolibre-price-survey/SKILL.md` (sección "Entrada y salida")
- Modify: `AGENTS.md` (bullet de decisiones de dominio sobre extender enums/catálogo)

- [ ] **Step 1: Actualizar "Entrada y salida" en SKILL.md**

Reemplazar el primer bullet de la sección por:

```markdown
- **QUÉ relevar**: dos archivos, en este orden:
  1. `packages/shared/src/materials.json` — catálogo maestro: LA lista de
     materiales existentes (codigo, nombre, categoria, unidad nominal).
     Nunca releves materiales fuera de ese archivo ni inventes códigos.
  2. `config/price-surveys/mercadolibre-price-specs.json` — por material a
     relevar: queries, excludeTerms, presentación esperada, min/target/maxSamples,
     maxSamplesPerSeller. Solo se releva un material si tiene entrada acá;
     los códigos siempre salen del catálogo maestro.
```

- [ ] **Step 2: Actualizar AGENTS.md**

En "Decisiones de dominio que parecen bugs pero no son", el bullet "Agregar sistema constructivo / tipo de techo / rubro = ..." — separar la parte de materiales en su propio bullet:

```markdown
- Agregar un **material** nuevo = una entrada en `packages/shared/src/materials.json`
  (fuente única: catálogo del motor, seed de DB y specs de relevamiento) + su precio
  en `PRECIOS_REFERENCIA` de `packages/db/src/seed.ts` (el seed falla si falta).
  `DEFAULT_MATERIAL_CATALOG` se deriva de ahí.
- Agregar sistema constructivo / tipo de techo / rubro = extender enums en
  `packages/shared/src/enums.ts` + filas de Recipe en `recipes-defaults.ts`.
  El motor lanza errores descriptivos si falta una receta.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/mercadolibre-price-survey/SKILL.md AGENTS.md
git commit -m "docs(skill): relevamiento lee materiales del catálogo maestro"
```

---

### Task 6: Validación completa

- [ ] **Step 1: Typecheck + tests de todo el monorepo**

```bash
pnpm -r typecheck && pnpm -r test
```

Esperado: todo PASS (incluye tests web de integración contra `casitacalc_test`).

- [ ] **Step 2: Build de web (embebe los packages)**

```bash
pnpm --filter @casitacalc/web build
```

Esperado: build OK (gotcha de AGENTS.md: `.next` embebe packages).

- [ ] **Step 3: Sin commit** — solo verificación final; reportar resultados.
