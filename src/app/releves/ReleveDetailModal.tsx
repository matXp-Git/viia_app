"use client";

import { useRef, useState } from "react";
import type { Releve } from "@/lib/types";
import { ReleveCard } from "@/components/releve/ReleveCard";
import { Button } from "@/components/ui/Button";

type Props = {
  releve: Releve;
  cityName: string;
  onClose: () => void;
};

export function ReleveDetailModal({ releve, cityName, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    if (!cardRef.current) return;
    setExporting(true);
    setExportError(null);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `releve-${releve.troncon.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setExportError("Export impossible sur cet appareil — capture d'écran manuelle en secours.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-page/90 p-(--space-4)"
      onClick={onClose}
    >
      <div className="flex w-[400px] flex-col gap-(--space-5)" onClick={(e) => e.stopPropagation()}>
        <ReleveCard
          ref={cardRef}
          troncon={releve.troncon}
          cityName={cityName}
          lengthM={releve.length_m}
          countAller={releve.count_aller}
          countRetour={releve.count_retour}
          density={releve.density}
          recordedAt={releve.recorded_at}
        />

        <div className="flex flex-wrap items-center justify-end gap-(--space-4)">
          {exportError ? <p className="mr-auto text-xs text-critical">{exportError}</p> : null}
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase tracking-label text-muted focus-ring hover:text-heading"
          >
            Fermer
          </button>
          <Button type="button" onClick={handleExport} disabled={exporting}>
            {exporting ? "Export..." : "Exporter en PNG →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
