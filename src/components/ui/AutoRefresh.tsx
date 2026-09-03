"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Periodically re-runs the page's server-side data fetch so live indicators
// (e.g. LivePulse driven by "was there a GPS point in the last N seconds")
// stay accurate without a manual reload.
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, router]);

  return null;
}
