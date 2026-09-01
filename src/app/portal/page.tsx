import { Eyebrow } from "@/components/ui/Eyebrow";

export default function PortalHome() {
  return (
    <main className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-9)">
      <Eyebrow>Dashboard client / ville</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Vos missions</h1>
      <p className="mt-(--space-2) max-w-[62ch] text-charcoal/85">
        À construire : vue cloisonnée, carte des zones couvertes, indicateurs agrégés jour/période
        (§3.3 du cahier de specs) — via <code>get_mission_totals()</code>, jamais un accès direct aux
        pesées.
      </p>
    </main>
  );
}
