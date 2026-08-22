import type { ProjectResponse } from "@casitacalc/shared";
import { getProjectFull, projectToHouseInput } from "@casitacalc/db";

type Row = NonNullable<Awaited<ReturnType<typeof getProjectFull>>>;

/** Fila de DB → DTO de respuesta de proyecto (sin datos del dueño). */
export function projectResponse(row: Row): ProjectResponse {
  const house = projectToHouseInput(row);
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    proyecto: {
      ...house,
      superficieCubiertaM2: house.anchoM * house.largoM,
    },
  };
}
