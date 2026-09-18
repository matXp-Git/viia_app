import { forwardRef } from "react";
import type { Density } from "@/lib/types";
import { densityLabel, densityPerMeter, estimatedWeightKg } from "@/lib/density";
import { ReportCardGrid } from "@/components/ui/ReportCardGrid";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Logo } from "@/components/ui/Logo";

type Props = {
  troncon: string;
  cityName: string;
  lengthM: number;
  countAller: number;
  countRetour: number;
  density: Density;
  recordedAt: string;
  className?: string;
};

// Shared "relevé terrain" card — the export-to-PNG modal and the public
// prospect report both render the exact same card from this component.
export const ReleveCard = forwardRef<HTMLDivElement, Props>(function ReleveCard(
  { troncon, cityName, lengthM, countAller, countRetour, density, recordedAt, className = "" },
  ref,
) {
  const perMeter = densityPerMeter(countAller, countRetour, lengthM);
  const totalDechets = countAller + countRetour;

  return (
    <div
      ref={ref}
      className={`flex w-[400px] flex-col gap-(--space-5) border border-divider bg-page p-(--space-6) ${className}`}
    >
      <div className="flex items-center justify-between">
        <Logo className="h-3.5 w-auto text-heading" />
        <Eyebrow>Relevé terrain</Eyebrow>
      </div>

      <div>
        <div className="text-2xs uppercase tracking-label text-muted">{cityName}</div>
        {/* Hauteur fixe (2 lignes) — un titre court comme un titre long
            produisent toujours une fiche de la même taille. */}
        <h2 className="mt-(--space-1) line-clamp-2 min-h-[3.75rem] text-xl leading-tight text-heading">{troncon}</h2>
      </div>

      <ReportCardGrid
        columns={3}
        className="max-w-none"
        cells={[
          { label: "Date", value: new Date(recordedAt).toLocaleDateString("fr-FR") },
          { label: "Longueur", value: `${lengthM.toLocaleString("fr-FR")} m` },
          { label: "Total déchets", value: String(totalDechets), emphasis: true },
          { label: "Déchets / m", value: perMeter !== null ? perMeter.toFixed(2) : "—" },
          { label: "Densité", value: densityLabel[density] },
          {
            label: "Poids estimé",
            value: `${estimatedWeightKg(totalDechets).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg`,
          },
        ]}
      />
    </div>
  );
});
