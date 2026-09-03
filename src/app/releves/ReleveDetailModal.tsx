"use client";

import { useRef, useState } from "react";
import type { Releve } from "@/lib/types";
import { densityLabel, densityPerMeter } from "@/lib/density";
import { ReportCardGrid } from "@/components/ui/ReportCardGrid";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

type Props = {
  releve: Releve;
  clientName: string;
  cityName: string;
  onClose: () => void;
};

export function ReleveDetailModal({ releve, clientName, cityName, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const perMeter = densityPerMeter(releve.count_aller, releve.count_retour, releve.length_m);

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
      <div
        className="flex w-full max-w-[560px] flex-col gap-(--space-5)"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={cardRef} className="flex flex-col gap-(--space-5) bg-page p-(--space-5)">
          <div className="flex items-center justify-between">
            <Logo className="h-3.5 w-auto text-heading" />
            <Eyebrow>Relevé terrain</Eyebrow>
          </div>

          <div>
            <div className="text-2xs uppercase tracking-label text-muted">
              {cityName}
              {clientName ? ` — ${clientName}` : ""}
            </div>
            <h2 className="mt-(--space-1) text-display-sm text-heading">{releve.troncon}</h2>
          </div>

          <ReportCardGrid
            columns={3}
            className="max-w-none"
            cells={[
              { label: "Date", value: new Date(releve.recorded_at).toLocaleDateString("fr-FR") },
              { label: "Longueur", value: `${releve.length_m.toLocaleString("fr-FR")} m` },
              {
                label: "Total déchets",
                value: String(releve.count_aller + releve.count_retour),
                emphasis: true,
              },
              { label: "Déchets / m", value: perMeter !== null ? perMeter.toFixed(2) : "—" },
              { label: "Densité", value: densityLabel[releve.density] },
            ]}
          />
        </div>

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
