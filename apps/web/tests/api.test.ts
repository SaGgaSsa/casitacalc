import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PROJECTS_PER_VISITOR, type ProjectSummary } from "@casitacalc/shared";
import { prisma } from "@casitacalc/db";

import { GET as projectsGET, POST as projectsPOST } from "@/app/api/projects/route";
import {
  DELETE as projectDELETE,
  GET as projectGET,
  PUT as projectPUT,
} from "@/app/api/projects/[id]/route";
import {
  DELETE as shareDELETE,
  POST as sharePOST,
} from "@/app/api/projects/[id]/share/route";
import { POST as requestPubPOST } from "@/app/api/projects/[id]/request-publication/route";
import { GET as publicListGET } from "@/app/api/public/projects/route";
import { GET as publicDetailGET } from "@/app/api/public/projects/[id]/route";
import { GET as shareTokenGET } from "@/app/api/share/[token]/route";
import { GET as adminProjectsGET } from "@/app/api/admin/projects/route";
import { PATCH as moderationPATCH } from "@/app/api/admin/projects/[id]/moderation/route";
import { PATCH as visibilityPATCH } from "@/app/api/admin/projects/[id]/visibility/route";
import { DELETE as adminProjectDELETE } from "@/app/api/admin/projects/[id]/route";
import { PUT as pricePUT } from "@/app/api/materials/[id]/price/route";

import {
  CASA_VALIDA,
  hashToken,
  json,
  limpiarProyectos,
  makeVisitorToken,
  req,
  seedProject,
} from "./helpers";

// Sesión admin mutable: null = visitante común; set = sesión de admin.
vi.mock("@/auth", () => ({
  auth: () => Promise.resolve((globalThis as Record<string, unknown>).__TEST_ADMIN_SESSION__ ?? null),
}));

function setAdminSession(email: string | null) {
  (globalThis as Record<string, unknown>).__TEST_ADMIN_SESSION__ =
    email === null ? undefined : { user: { email }, expires: "9999" };
}

async function params<T extends Record<string, string>>(v: T) {
  return { params: Promise.resolve(v) };
}

beforeEach(async () => {
  setAdminSession(null);
  await limpiarProyectos();
});

describe("ownership de proyectos", () => {
  it("el dueño puede modificar su proyecto", async () => {
    const token = makeVisitorToken();
    const id = await seedProject(hashToken(token));

    const res = await projectPUT(
      req(`/api/projects/${id}`, { method: "PUT", body: { proyecto: CASA_VALIDA }, token }),
      await params({ id }),
    );
    expect(res.status).toBe(200);
  });

  it("un visitante ajeno no puede modificar ni eliminar (403)", async () => {
    const id = await seedProject(hashToken(makeVisitorToken()));
    const ajeno = makeVisitorToken();

    const put = await projectPUT(
      req(`/api/projects/${id}`, { method: "PUT", body: { proyecto: CASA_VALIDA }, token: ajeno }),
      await params({ id }),
    );
    expect(put.status).toBe(403);

    const del = await projectDELETE(req(`/api/projects/${id}`, { method: "DELETE", token: ajeno }), await params({ id }));
    expect(del.status).toBe(403);
  });

  it("GET propio sin cookie devuelve 403", async () => {
    const id = await seedProject(hashToken(makeVisitorToken()));
    const res = await projectGET(req(`/api/projects/${id}`), await params({ id }));
    expect(res.status).toBe(403);
  });
});

describe("visibilidad y acceso público", () => {
  it("un proyecto PRIVATE no es visible públicamente", async () => {
    const id = await seedProject(hashToken(makeVisitorToken()));

    const detalle = await publicDetailGET(req(`/api/public/projects/${id}`), await params({ id }));
    expect(detalle.status).toBe(404);

    const lista = await json<ProjectSummary[]>(await publicListGET());
    expect(lista.map((p) => p.id)).not.toContain(id);
  });

  it("un proyecto UNLISTED se abre mediante su shareToken", async () => {
    const token = makeVisitorToken();
    const id = await seedProject(hashToken(token));

    const shared = await json<{ shareUrl: string }>(
      await sharePOST(req(`/api/projects/${id}/share`, { method: "POST", token }), await params({ id })),
    );
    expect(shared.shareUrl).toContain("/share/");

    const shareToken = shared.shareUrl.split("/").pop()!;
    const res = await shareTokenGET(req(`/api/share/${shareToken}`), await params({ token: shareToken }));
    expect(res.status).toBe(200);
    const data = await json<{ proyecto: { nombreProyecto: string } }>(res);
    expect(data.proyecto.nombreProyecto).toBe(CASA_VALIDA.nombreProyecto);
  });

  it("un UNLISTED no aparece en el listado público", async () => {
    const token = makeVisitorToken();
    const id = await seedProject(hashToken(token));
    await sharePOST(req(`/api/projects/${id}/share`, { method: "POST", token }), await params({ id }));

    const lista = await json<ProjectSummary[]>(await publicListGET());
    expect(lista.map((p) => p.id)).not.toContain(id);
  });

  it("PUBLIC sin APPROVED no aparece; PUBLIC + APPROVED sí", async () => {
    const id = await seedProject(hashToken(makeVisitorToken()));
    await prisma.project.update({ where: { id }, data: { visibility: "PUBLIC" } });

    let lista = await json<ProjectSummary[]>(await publicListGET());
    expect(lista.map((p) => p.id)).not.toContain(id);
    expect((await publicDetailGET(req(`/api/public/projects/${id}`), await params({ id }))).status).toBe(404);

    await prisma.project.update({
      where: { id },
      data: { moderationStatus: "APPROVED" },
    });

    lista = await json<ProjectSummary[]>(await publicListGET());
    expect(lista.map((p) => p.id)).toContain(id);
    expect((await publicDetailGET(req(`/api/public/projects/${id}`), await params({ id }))).status).toBe(200);
  });
});

describe("compartir y moderación del dueño", () => {
  it("dejar de compartir vuelve a PRIVATE e invalida el token", async () => {
    const token = makeVisitorToken();
    const id = await seedProject(hashToken(token));

    const { shareUrl } = await json<{ shareUrl: string }>(
      await sharePOST(req(`/api/projects/${id}/share`, { method: "POST", token }), await params({ id })),
    );
    const shareToken = shareUrl.split("/").pop()!;

    await shareDELETE(req(`/api/projects/${id}/share`, { method: "DELETE", token }), await params({ id }));

    const row = await prisma.project.findUniqueOrThrow({ where: { id } });
    expect(row.visibility).toBe("PRIVATE");
    expect(row.shareToken).toBeNull();

    const viejo = await shareTokenGET(req(`/api/share/${shareToken}`), await params({ token: shareToken }));
    expect(viejo.status).toBe(404);
  });

  it("solicitar publicación dos veces devuelve 409 en la segunda", async () => {
    const token = makeVisitorToken();
    const id = await seedProject(hashToken(token));

    const primera = await requestPubPOST(
      req(`/api/projects/${id}/request-publication`, { method: "POST", token }),
      await params({ id }),
    );
    expect(primera.status).toBe(200);

    const segunda = await requestPubPOST(
      req(`/api/projects/${id}/request-publication`, { method: "POST", token }),
      await params({ id }),
    );
    expect(segunda.status).toBe(409);
  });
});

describe("administración", () => {
  it("rechaza visitantes sin sesión de admin (401)", async () => {
    const id = await seedProject(hashToken(makeVisitorToken()));

    expect((await adminProjectsGET(req("/api/admin/projects"))).status).toBe(401);
    expect(
      (
        await moderationPATCH(
          req(`/api/admin/projects/${id}/moderation`, { method: "PATCH", body: { moderationStatus: "APPROVED" } }),
          await params({ id }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await visibilityPATCH(
          req(`/api/admin/projects/${id}/visibility`, { method: "PATCH", body: { visibility: "PUBLIC" } }),
          await params({ id }),
        )
      ).status,
    ).toBe(401);
    expect((await adminProjectDELETE(req(`/api/admin/projects/${id}`, { method: "DELETE" }), await params({ id }))).status).toBe(401);
    expect((await pricePUT(req("/api/materials/cualquiera/price", { method: "PUT", body: { precio: 100 } }), await params({ id: "cualquiera" }))).status).toBe(401);
  });

  it("admin puede aprobar un proyecto pendiente y pasa a público", async () => {
    const id = await seedProject(hashToken(makeVisitorToken()));
    await prisma.project.update({ where: { id }, data: { moderationStatus: "PENDING" } });

    setAdminSession("admin@casitacalc.test");

    // Aparece en la tabla admin con filtro pendientes
    const tabla = await json<ProjectSummary[]>(
      await adminProjectsGET(req("/api/admin/projects?filtro=pending")),
    );
    expect(tabla.map((p) => p.id)).toContain(id);

    const res = await moderationPATCH(
      req(`/api/admin/projects/${id}/moderation`, {
        method: "PATCH",
        body: { moderationStatus: "APPROVED" },
      }),
      await params({ id }),
    );
    expect(res.status).toBe(200);

    const row = await prisma.project.findUniqueOrThrow({ where: { id } });
    expect(row.moderationStatus).toBe("APPROVED");
    expect(row.visibility).toBe("PUBLIC");

    const lista = await json<ProjectSummary[]>(await publicListGET());
    expect(lista.map((p) => p.id)).toContain(id);

    setAdminSession(null);
  });

  it("admin puede rechazar: vuelve a PRIVATE", async () => {
    const id = await seedProject(hashToken(makeVisitorToken()));
    await prisma.project.update({
      where: { id },
      data: { moderationStatus: "PENDING", visibility: "UNLISTED" },
    });

    setAdminSession("admin@casitacalc.test");
    const res = await moderationPATCH(
      req(`/api/admin/projects/${id}/moderation`, {
        method: "PATCH",
        body: { moderationStatus: "REJECTED" },
      }),
      await params({ id }),
    );
    expect(res.status).toBe(200);

    const row = await prisma.project.findUniqueOrThrow({ where: { id } });
    expect(row.moderationStatus).toBe("REJECTED");
    expect(row.visibility).toBe("PRIVATE");
  });

  it("admin puede cambiar visibilidad manualmente", async () => {
    const id = await seedProject(hashToken(makeVisitorToken()));
    setAdminSession("admin@casitacalc.test");

    const res = await visibilityPATCH(
      req(`/api/admin/projects/${id}/visibility`, {
        method: "PATCH",
        body: { visibility: "UNLISTED" },
      }),
      await params({ id }),
    );
    expect(res.status).toBe(200);
    const row = await prisma.project.findUniqueOrThrow({ where: { id } });
    expect(row.visibility).toBe("UNLISTED");
  });

  it("admin puede eliminar cualquier proyecto", async () => {
    const id = await seedProject(hashToken(makeVisitorToken()));
    setAdminSession("admin@casitacalc.test");

    const res = await adminProjectDELETE(
      req(`/api/admin/projects/${id}`, { method: "DELETE" }),
      await params({ id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.project.findUnique({ where: { id } })).toBeNull();
  });
});

describe("creación de proyectos", () => {
  it("crea con ownerTokenHash desde la cookie y nunca desde el body", async () => {
    const token = makeVisitorToken();
    const res = await projectsPOST(
      req("/api/projects", {
        method: "POST",
        body: { proyecto: CASA_VALIDA, ownerTokenHash: "hackeado" },
        token,
      }),
    );
    expect(res.status).toBe(201);

    const row = await prisma.project.findFirstOrThrow();
    expect(row.ownerTokenHash).toBe(hashToken(token));
  });

  it("aplica el límite de proyectos por visitante", async () => {
    const token = makeVisitorToken();
    const hash = hashToken(token);
    for (let i = 0; i < MAX_PROJECTS_PER_VISITOR; i++) await seedProject(hash);

    const res = await projectsPOST(
      req("/api/projects", { method: "POST", body: { proyecto: CASA_VALIDA }, token }),
    );
    expect(res.status).toBe(409);
  });

  it("rechaza nombres cortos o basura (aaaaaa)", async () => {
    for (const nombre of ["abc", "aaaaaa", "hhhjhhh", "12345"]) {
      const res = await projectsPOST(
        req("/api/projects", {
          method: "POST",
          body: { proyecto: { ...CASA_VALIDA, nombreProyecto: nombre } },
          token: makeVisitorToken(),
        }),
      );
      expect(res.status, `nombre "${nombre}" debería ser inválido`).toBe(422);
    }
  });

  it("acepta un nombre descriptivo válido", async () => {
    const res = await projectsPOST(
      req("/api/projects", {
        method: "POST",
        body: { proyecto: { ...CASA_VALIDA, nombreProyecto: "Casa de Juana" } },
        token: makeVisitorToken(),
      }),
    );
    expect(res.status).toBe(201);
  });
});
