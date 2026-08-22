# AGENTS.md — CasitaCalc

Calculadora de materiales de construcción para viviendas argentinas. Monorepo pnpm: `apps/web` (Next.js 16 App Router) + `packages/{shared,calculator-core,db}`. UI y copy en español (voseo). Guía visual: `docs/design/DESIGN.md` + mockup `docs/design/code.html`.

## Comandos

```bash
export PNPM_HOME="$HOME/.local/share/pnpm"; export PATH="$PNPM_HOME/bin:$PATH"  # necesario en shells nuevos
pnpm dev                                          # web en :3000
pnpm -r build                                     # orden topológico: shared → calculator-core → db → web
pnpm test                                         # Vitest (solo existe en calculator-core)
pnpm --filter @casitacalc/calculator-core exec vitest run tests/calculator.test.ts   # un solo archivo
pnpm typecheck && pnpm lint                       # verificación completa
docker compose -f ~/docker/postgresql/compose.yaml up -d             # Postgres local (¡fuera del repo!)
```

Validación antes de commitear: rebuild del paquete tocado → `pnpm -r typecheck && pnpm -r test` → `pnpm --filter @casitacalc/web build`.

## Gotchas críticos (costaron debugging real)

- **`.next` embebe los packages al compilar.** Si cambiás algo bajo `packages/*`, reconstruí la web (`pnpm --filter @casitacalc/web build`) antes de `next start`, o el server sirve código viejo sin avisar.
- **pnpm NO viene por corepack**: el corepack del sistema está roto con Node 22; pnpm vive en `~/.local/share/pnpm/bin`.
- **Config de pnpm 11 va en `pnpm-workspace.yaml`** (`allowBuilds` aprueba postinstalls como esbuild/prisma). El campo `"pnpm"` en package.json se ignora.
- **DATABASE_URL vive duplicado**: `packages/db/.env` (CLI Prisma) y `apps/web/.env` (runtime Next). Mismo valor; ambos gitignored.
- El proceso en producción se llama `next-server (v16.x)` — `pkill -f "next start"` no lo mata.
- Nunca dejar lockfile/`pnpm-workspace.yaml` anidados en `apps/*` (create-next-app los crea; aíslan la app del monorepo).

## Arquitectura (reglas no negociables)

- Dependencias solo hacia abajo: `web → {db, calculator-core} → shared`.
- Toda lógica de cálculo vive en `calculator-core` (funciones puras, sin IO ni React). Los endpoints API solo validan con schemas Zod de `@casitacalc/shared`, consultan DB y delegan en el motor.
- Los precios se aplican aparte con `applyPrices(result, priceMap)` — el motor calcula cantidades sin conocer precios. `PriceMap` usa el `codigo` estable del material, nunca el id de DB.
- Las recetas son datos (tablas `Recipe`/`RecipeItem`). `DEFAULT_RECIPES`/`DEFAULT_MATERIAL_CATALOG` en calculator-core son fallback para tests/demo; la fuente real es la DB vía seed.

## Decisiones de dominio que parecen bugs pero no son

- Redondeo por unidad: `un`/`bolsa`/`ml` son **discretas** (ceil); `m2`/`m3`/`kg`/`l` continuas (2 decimales). `ml` es discreta porque chapas y tirantes se compran en metros enteros.
- `subtotalesPorRubro` **no se persiste**: es derivado y se reconstruye desde los ítems en `getLatestResult()`.
- Agregar sistema constructivo / tipo de techo / rubro = extender enums en `packages/shared/src/enums.ts` + filas de Recipe + entradas de catálogo en `recipes-defaults.ts`. El motor lanza errores descriptivos si falta una receta.
- Seed idempotente (upserts), pero `seed.ts` falla si un material del catálogo no tiene precio en `PRECIOS_REFERENCIA`.
- Prisma: editar schema → `cd packages/db && prisma migrate dev --name <x>` → rebuild del paquete (el cliente se genera en postinstall/build).

## Next.js 16

- Ver `apps/web/AGENTS.md` (autogenerado por `next dev`, no borrarlo): apunta a docs incluidas en `node_modules/next/dist/docs/`.
- `params`/`searchParams` son Promises: siempre `await params`; usar el helper global `PageProps<"/projects/[id]">`.
- shadcn/ui ya inicializado (preset radix-nova). Componentes nuevos: `pnpm dlx shadcn@latest add <name> --cwd apps/web`.

## Prueba E2E rápida (server corriendo)

1. `POST /api/projects` con `{ proyecto: HouseInput }` → devuelve `{ id }`
2. `POST /api/projects/<id>/calculate` → cómputo con precios vigentes
3. Casa 8×10 m, chapa 30°, 5 aberturas, 1 baño ≈ $4.5M con precios demo (muro neto 90.12 m² → 1587 ladrillos).

Deploy: blueprint `render.yaml` (Render Web Service + Postgres; `prisma migrate deploy` corre dentro del build).
