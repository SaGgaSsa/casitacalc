import { z } from "zod";

import {
  HouseInputObjectSchema,
  HouseInputSchema,
} from "./house-input";
import {
  ModerationStatusEnum,
  ProjectVisibilityEnum,
} from "./project";

export * from "./enums";
export * from "./opening";
export * from "./house-input";
export * from "./result";
export * from "./material";
export * from "./recipe";
export * from "./project";

// ── DTOs de la API ──────────────────────────────────────────────────────────

/** POST /api/projects */
export const CreateProjectRequestSchema = z.object({
  proyecto: HouseInputSchema,
});

export const ProjectResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  proyecto: HouseInputObjectSchema.extend({
    /** m² cubiertos calculados = ancho * largo. */
    superficieCubiertaM2: z.number().positive(),
  }),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

/** Lista resumida para tablas del dashboard (propios y admin). */
export const ProjectSummarySchema = z.object({
  id: z.string(),
  nombreProyecto: z.string(),
  superficieM2: z.number(),
  sistemaConstructivo: z.string(),
  fechaCreacion: z.string(),
  costoEstimado: z.number().nullable(),
  visibility: ProjectVisibilityEnum,
  moderationStatus: ModerationStatusEnum,
});

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

/** Proyectos PUBLIC+APPROVED para la galería pública. */
export const PublicProjectSummarySchema = ProjectSummarySchema.omit({
  visibility: true,
  moderationStatus: true,
});

export type PublicProjectSummary = z.infer<typeof PublicProjectSummarySchema>;
