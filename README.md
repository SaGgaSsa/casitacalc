# CasitaCalc — Calculadora Argentina de Materiales para Vivienda

MVP que calcula **cantidades reales de materiales** (ladrillos, cemento, arena, cal, chapas, aislante, aberturas, baño, etc.) para construir una vivienda rectangular simple en Argentina, con precios editables por el usuario. No es un calculador de costo por m²: produce un cómputo detallado por rubro.

> ⚠️ Toda salida es una estimación orientativa que debe ser revisada por un albañil, MMO o profesional.

## Stack

- **Monorepo**: pnpm workspaces
- **Web**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Validación**: Zod (schemas compartidos entre front y API)
- **Formularios**: React Hook Form
- **Motor de cálculo**: `packages/calculator-core` — funciones puras, sin UI ni DB
- **Base de datos**: PostgreSQL + Prisma ORM (`packages/db`)
- **Tests**: Vitest
- **Deploy**: Render Web Service + Render Postgres

## Estructura

```
casitacalc/
├── apps/
│   └── web/                  # Next.js: páginas + API routes (Route Handlers)
├── packages/
│   ├── calculator-core/      # Motor puro: geometría, recetas, cantidades, precios
│   ├── db/                   # Prisma schema, client singleton, queries y seed
│   └── shared/               # Schemas Zod / tipos / DTOs compartidos
├── docs/design/              # DESIGN.md y mockup HTML del dashboard
└── render.yaml               # Blueprint de deploy en Render
```

### Reglas de arquitectura

- El motor (`calculator-core`) no conoce la DB ni React: recibe `HouseInput` + recetas + catálogo y devuelve cantidades. Los precios se aplican aparte con `applyPrices()`.
- Las API routes orquestan (validan con Zod → consultan DB → llaman al motor). No hay lógica de cálculo ni en componentes React ni en endpoints.
- Las **recetas son datos** (tabla `Recipe`/`RecipeItem`), editables desde `/recipes`; los valores por defecto viven en `calculator-core` como fallback para tests/demo.
- Abstracción `PriceMap` lista para futuros proveedores (CSV, EasyPrice, MercadoLibre) sin tocar el motor; hoy se carga manualmente desde `/materials`.

## Cómo funciona el cálculo

```
muro bruto        = perímetro × alturaParedes
aberturas         = Σ ancho × alto × cantidad
muro neto         = muro bruto − aberturas
techo chapa       = superficiePlanta / cos(ángulo)
techo losa        = superficiePlanta
cantidad material = base × cantidadPorUnidad × (1 + desperdicio%)
redondeo          = entero hacia arriba (un, bolsa, ml) · 2 decimales (m³, m², kg)
```

Cada item del resultado incluye rubro, material, cantidad neta, desperdicio aplicado, cantidad final, precio unitario y subtotal.

## Desarrollo local

Requisitos: Node ≥ 20, pnpm 9+, PostgreSQL corriendo.

```bash
# 1. Instalar dependencias (genera el cliente Prisma vía postinstall)
pnpm install

# 2. Base de datos
cp packages/db/.env.example packages/db/.env    # ajustá DATABASE_URL
cp apps/web/.env.example apps/web/.env          # misma DATABASE_URL
pnpm db:migrate                                 # crea las tablas (prisma migrate dev)
pnpm db:seed                                    # materiales + recetas precargadas

# 3. App
pnpm dev                                        # http://localhost:3000
```

### Crear la base local (primera vez)

```bash
sudo -u postgres psql -c "CREATE USER casitacalc WITH PASSWORD 'casitacalc';"
sudo -u postgres psql -c "CREATE DATABASE casitacalc OWNER casitacalc;"
```

## Scripts útiles

| Comando           | Descripción                                     |
| ----------------- | ----------------------------------------------- |
| `pnpm dev`        | Servidor de desarrollo de la app web            |
| `pnpm build`      | Build ordenado de todos los paquetes            |
| `pnpm test`       | Tests unitarios del motor de cálculo (Vitest)   |
| `pnpm typecheck`  | Verificación de tipos en todo el monorepo       |
| `pnpm lint`       | ESLint de la app web                            |
| `pnpm db:migrate` | Migraciones Prisma                              |
| `pnpm db:seed`    | Precarga materiales y recetas                   |
| `pnpm db:studio`  | Prisma Studio                                   |

## Rutas / pantallas

| Ruta                    | Descripción                                  |
| ----------------------- | -------------------------------------------- |
| `/`                     | Dashboard (resumen, proyectos recientes, precios) |
| `/projects`             | Listado completo                             |
| `/projects/new`         | Formulario de vivienda (medidas, techo, aberturas, baños) |
| `/projects/[id]`        | Detalle del proyecto (URL pública compartible, sin login) |
| `/projects/[id]/edit`   | Edición + recálculo                          |
| `/projects/[id]/result` | Cómputo completo por rubro con totales       |
| `/materials`            | Catálogo con edición manual de precios       |
| `/recipes`              | Recetas configurables                        |

## API

| Método | Ruta                            | Acción                              |
| ------ | ------------------------------- | ----------------------------------- |
| POST   | `/api/projects`                 | Crear proyecto                      |
| GET    | `/api/projects`                 | Listar resúmenes                    |
| GET    | `/api/projects/[id]`            | Detalle del proyecto                |
| PUT    | `/api/projects/[id]`            | Actualizar proyecto                 |
| DELETE | `/api/projects/[id]`            | Eliminar proyecto                   |
| POST   | `/api/projects/[id]/calculate`  | Calcular y persistir cómputo        |
| GET    | `/api/materials`                | Catálogo de materiales              |
| PUT    | `/api/materials/[id]/price`     | Actualizar precio (carga manual)    |
| GET    | `/api/recipes`                  | Listar recetas                      |
| PUT    | `/api/recipes/[codigo]`         | Reemplazar ítems de una receta      |

Entrada/salida validadas con schemas Zod de `@casitacalc/shared`.

## Deploy en Render

1. Push del repo a GitHub.
2. En Render: **New → Blueprint** y seleccioná el repo (usa `render.yaml`), o creá manualmente:
   - **Render Postgres** (plan free) → copiá su *Internal Database URL*.
   - **Web Service** (runtime Node):
     - Build: `corepack enable && pnpm install --frozen-lockfile && pnpm db:migrate && pnpm build`
     - Start: `pnpm --filter @casitacalc/web start`
     - Variable `DATABASE_URL` = Internal Database URL.
3. Primera vez, cargá los datos demo ejecutando el seed (shell del servicio): `pnpm db:seed`.

El blueprint incluye la migración (`prisma migrate deploy`) dentro del build.

## Alcance del MVP y roadmap

Implementado:

- Sistema constructivo **tradicional con ladrillo hueco** (la arquitectura acepta nuevos sistemas agregando recetas)
- Techos **chapa** (con inclinación) y **losa**
- Baños como paquete configurable multiplicador
- Precios manuales editables; proyectos compartibles por URL (sin auth)

Futuro: steel framing y bloques, proveedores automáticos de precios (CSV/EasyPrice/MercadoLibre — interfaces ya previstas), login de usuarios, exportación PDF, vista tipo plano con aberturas.

Ver `docs/design/` para la guía visual ("Industrial Precision").
