import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  generateVisitorToken,
} from "@/lib/visitor";

/**
 * Emite la cookie anónima del visitante si no existe.
 * El token se propaga al request del mismo pase para que handlers y páginas
 * lo vean incluso en la primera visita.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(VISITOR_COOKIE)?.value) {
    return NextResponse.next();
  }

  const token = generateVisitorToken();

  // Propagar al request de este pase (patrón documentado de proxy).
  const requestHeaders = new Headers(request.headers);
  const existing = request.headers.get("cookie");
  requestHeaders.set(
    "cookie",
    existing
      ? `${existing}; ${VISITOR_COOKIE}=${token}`
      : `${VISITOR_COOKIE}=${token}`,
  );

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set({
    name: VISITOR_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml)$).*)",
  ],
};
