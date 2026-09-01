import { Eyebrow } from "@/components/ui/Eyebrow";

export default function ManagerHome() {
  return (
    <main className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-9)">
      <Eyebrow>Dashboard manager</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Missions &amp; opérations</h1>
      <p className="mt-(--space-2) max-w-[62ch] text-charcoal/85">
        À construire : administration (villes, opérateurs, missions), carte multi-tracés MapLibre,
        indicateurs agrégés, détail par opérateur, filtres (§3.0 et §3.2 du cahier de specs).
      </p>
    </main>
  );
}
