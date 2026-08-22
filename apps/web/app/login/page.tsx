"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

/**
 * Login de administración con Google.
 * Auth.js rechaza emails fuera de ADMIN_EMAILS y vuelve con ?error=AccessDenied.
 */
function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const error = searchParams.get("error");

  return (
    <div className="mx-auto max-w-md px-4 py-20 md:px-8">
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Administración
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Iniciá sesión con la cuenta autorizada para gestionar proyectos, materiales,
          recetas y precios.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            Esa cuenta no tiene permisos de administración.
          </p>
        )}

        <Button
          className="mt-6 w-full uppercase"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await signIn("google", { callbackUrl: "/admin" });
            } finally {
              setLoading(false);
            }
          }}
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81"
            />
          </svg>
          {loading ? "Conectando…" : "Iniciar sesión con Google"}
        </Button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground"
        >
          Volver a la calculadora
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
