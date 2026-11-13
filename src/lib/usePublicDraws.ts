"use client";
import { useEffect, useState } from "react";
export type PublicDraw = {
  id: string; title: string; prize: string; description: string;
  status: "preview" | "coming_soon" | "closed"; display_order: number;
  hero_image_url: string | null; prize_image_url: string | null;
};
export function usePublicDraws() {
  const [draws, setDraws] = useState<PublicDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("No fue posible cargar el catálogo.");
        return res.json() as Promise<{ draws: PublicDraw[] }>;
      })
      .then((data) => setDraws(data.draws))
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  return { draws, loading, error };
}
