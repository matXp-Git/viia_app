import { Eyebrow } from "@/components/ui/Eyebrow";

export default function OperatorHome() {
  return (
    <main className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-9)">
      <Eyebrow>App opérateur</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Mes missions du jour</h1>
      <p className="mt-(--space-2) max-w-[62ch] text-charcoal/85">
        À construire : connexion opérateur, liste des missions assignées, démarrage/fin de mission,
        segment manuel, saisie de pesée (§3.1 du cahier de specs).
      </p>
    </main>
  );
}
