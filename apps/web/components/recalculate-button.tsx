"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecalculateButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await fetch(`/api/projects/${projectId}/calculate`, { method: "POST" });
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Calculando…" : "Recalcular materiales"}
    </Button>
  );
}
