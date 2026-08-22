import Link from "next/link";
import { ClipboardList, ListTree, ReceiptText, Tags } from "lucide-react";
import { requireAdminPage } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  const email = session.user?.email ?? "";

  const items = [
    { href: "/admin", label: "Resumen", icon: ClipboardList },
    { href: "/admin/projects", label: "Proyectos", icon: Tags },
    { href: "/admin/materials", label: "Materiales", icon: ListTree },
    { href: "/admin/prices", label: "Precios", icon: ReceiptText },
    { href: "/admin/recipes", label: "Recetas", icon: ClipboardList },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administración
          </p>
          <p className="text-sm text-foreground">{email}</p>
        </div>
        <nav className="flex flex-wrap gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
