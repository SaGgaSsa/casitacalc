import { z } from "zod";

/** Visibilidad del proyecto dentro de CasitaCalc. */
export const ProjectVisibility = {
  PRIVATE: "PRIVATE",
  UNLISTED: "UNLISTED",
  PUBLIC: "PUBLIC",
} as const;
export type ProjectVisibility =
  (typeof ProjectVisibility)[keyof typeof ProjectVisibility];

/** Estado de moderación para la publicación pública de un proyecto. */
export const ModerationStatus = {
  NONE: "NONE",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type ModerationStatus =
  (typeof ModerationStatus)[keyof typeof ModerationStatus];

export const ProjectVisibilityEnum = z.enum(
  Object.values(ProjectVisibility) as [
    ProjectVisibility,
    ...ProjectVisibility[],
  ],
);
export const ModerationStatusEnum = z.enum(
  Object.values(ModerationStatus) as [ModerationStatus, ...ModerationStatus[]],
);

/** Etiquetas es-AR para badges y filtros. */
export const VISIBILITY_LABELS: Record<ProjectVisibility, string> = {
  PRIVATE: "Privado",
  UNLISTED: "Compartido",
  PUBLIC: "Público",
};

export const MODERATION_LABELS: Record<ModerationStatus, string> = {
  NONE: "Sin solicitar",
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

// ── DTOs de la API ──────────────────────────────────────────────────────────

/** PATCH /api/admin/projects/[id]/moderation */
export const ModerationPatchSchema = z.object({
  moderationStatus: ModerationStatusEnum,
});
export type ModerationPatch = z.infer<typeof ModerationPatchSchema>;

/** PATCH /api/admin/projects/[id]/visibility */
export const VisibilityPatchSchema = z.object({
  visibility: ProjectVisibilityEnum,
});
export type VisibilityPatch = z.infer<typeof VisibilityPatchSchema>;

/** POST /api/projects/[id]/share */
export const ShareResponseSchema = z.object({
  id: z.string(),
  visibility: ProjectVisibilityEnum,
  shareUrl: z.string(),
});
export type ShareResponse = z.infer<typeof ShareResponseSchema>;
