import { cn } from "@/lib/utils";

export function LogoBricks({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <rect x="10" y="10" width="44" height="14" rx="3" fill="currentColor" />
      <rect x="10" y="28" width="14" height="12" rx="3" fill="currentColor" />
      <rect x="10" y="44" width="30" height="10" rx="3" fill="currentColor" />
      <rect x="44" y="44" width="10" height="10" rx="3" className="fill-primary" />
    </svg>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoBricks className="size-8 shrink-0 text-foreground" />
      <span className="font-heading text-lg font-bold tracking-tight text-foreground">
        Casita<span className="text-primary">Calc</span>
      </span>
    </span>
  );
}
