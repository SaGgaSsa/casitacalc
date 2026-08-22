"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderOpen,
  Home,
  Menu,
  Package,
  Shield,
  SquarePlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/logo";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home, exact: true },
  { href: "/materials", label: "Materiales", icon: Package, exact: true },
  { href: "/projects", label: "Mis proyectos", icon: FolderOpen, exact: false },
  { href: "/projects/new", label: "Nuevo cálculo", icon: SquarePlus, exact: true },
] as const;

function NavLinks({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <Shield className="size-4" />
            Administración
          </Link>
        )}
      </nav>
    </>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("px-6 py-5", className)}>
      <Link href="/" aria-label="CasitaCalc — Inicio">
        <BrandMark />
      </Link>
    </div>
  );
}

export function AppShell({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-svh w-full">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <Brand />
        <NavLinks isAdmin={isAdmin} />
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-sidebar-border bg-sidebar shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                aria-label="Cerrar menú"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex min-h-svh flex-col md:pl-64">
        {/* Header mobile */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <button
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <Menu className="size-5" />
          </button>
          <BrandMark className="px-1" />
          <Link
            href="/projects/new"
            aria-label="Nuevo cálculo"
            className="rounded-md p-1.5 text-primary hover:bg-accent"
          >
            <SquarePlus className="size-5" />
          </Link>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
