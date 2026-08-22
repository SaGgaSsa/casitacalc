-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "nombreProyecto" TEXT NOT NULL,
    "anchoM" DECIMAL(8,2) NOT NULL,
    "largoM" DECIMAL(8,2) NOT NULL,
    "alturaParedesM" DECIMAL(5,2) NOT NULL,
    "sistemaConstructivo" TEXT NOT NULL,
    "tipoTecho" TEXT NOT NULL,
    "anguloTechoGrados" DECIMAL(5,2) NOT NULL,
    "cantidadBanios" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opening" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "anchoM" DECIMAL(6,2) NOT NULL,
    "altoM" DECIMAL(6,2) NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "Opening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "precioDefault" DECIMAL(14,2) NOT NULL,
    "precioActual" DECIMAL(14,2) NOT NULL,
    "fechaActualizacionPrecio" TIMESTAMP(3),
    "fuente" TEXT,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "rubro" TEXT NOT NULL,
    "sistemaConstructivo" TEXT,
    "tipoTecho" TEXT,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "codigoMaterial" TEXT NOT NULL,
    "cantidadPorUnidad" DECIMAL(12,4) NOT NULL,
    "desperdicioPct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationResult" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "totalGeneral" DECIMAL(16,2) NOT NULL,
    "geometriaJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationResultItem" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "codigoMaterial" TEXT NOT NULL,
    "nombreMaterial" TEXT NOT NULL,
    "rubro" TEXT NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "unidad" TEXT NOT NULL,
    "desperdicioPct" DECIMAL(5,2) NOT NULL,
    "cantidadFinal" DECIMAL(14,2) NOT NULL,
    "precioUnitario" DECIMAL(14,2),
    "subtotal" DECIMAL(14,2),

    CONSTRAINT "CalculationResultItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Opening_projectId_idx" ON "Opening"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_codigo_key" ON "Material"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_codigo_key" ON "Recipe"("codigo");

-- CreateIndex
CREATE INDEX "RecipeItem_recipeId_idx" ON "RecipeItem"("recipeId");

-- CreateIndex
CREATE INDEX "CalculationResult_projectId_idx" ON "CalculationResult"("projectId");

-- CreateIndex
CREATE INDEX "CalculationResultItem_resultId_idx" ON "CalculationResultItem"("resultId");

-- AddForeignKey
ALTER TABLE "Opening" ADD CONSTRAINT "Opening_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationResult" ADD CONSTRAINT "CalculationResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationResultItem" ADD CONSTRAINT "CalculationResultItem_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "CalculationResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
