-- Visitante anónimo dueño + visibilidad + moderación + share.
-- En DBs con proyectos previos quedan con ownerTokenHash = '' (huérfanos,
-- gestionables solo desde administración).

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "ownerTokenHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE INDEX "Project_ownerTokenHash_idx" ON "Project"("ownerTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Project_shareToken_key" ON "Project"("shareToken");
