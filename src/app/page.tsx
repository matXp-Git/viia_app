import { Button, LinkButton } from "@/components/ui/Button";
import { MissionStatusBadge, OperatorStatusBadge } from "@/components/ui/StatusBadge";
import { TextField, SelectField } from "@/components/ui/Field";
import { ListRow } from "@/components/ui/ListRow";
import { ReportCardGrid } from "@/components/ui/ReportCardGrid";
import { Eyebrow, DataLabel } from "@/components/ui/Eyebrow";

export default function Home() {
  return (
    <main className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-9)">
      <header className="mb-(--space-9) border-b border-line pb-(--space-7)">
        <p className="text-xs tracking-eyebrow text-charcoal/60">ViiA Pick — scaffold</p>
        <h1 className="mt-(--space-2) text-display-sm">Suivi de missions</h1>
        <p className="mt-(--space-2) max-w-[62ch] text-charcoal/85">
          Squelette de projet : tokens branchés, composants de base, schéma de BDD. Les trois surfaces
          (opérateur, manager, client/ville) restent à construire.
        </p>
      </header>

      <section className="mb-(--space-9)">
        <Eyebrow>Surfaces</Eyebrow>
        <div className="mt-(--space-4) grid grid-cols-3 gap-(--space-4) max-mobile:grid-cols-1">
          <LinkButton href="/operator" variant="ghost">
            App opérateur →
          </LinkButton>
          <LinkButton href="/manager" variant="ghost">
            Dashboard manager →
          </LinkButton>
          <LinkButton href="/portal" variant="ghost">
            Dashboard client/ville →
          </LinkButton>
        </div>
      </section>

      <section className="mb-(--space-9)">
        <Eyebrow>Boutons</Eyebrow>
        <div className="mt-(--space-4) flex flex-wrap items-center gap-(--space-4)">
          <Button variant="accent">Démarrer la mission →</Button>
          <Button variant="ghost">Segment manuel</Button>
          <Button variant="accent" disabled>
            Envoi...
          </Button>
        </div>
      </section>

      <section className="mb-(--space-9)">
        <Eyebrow>Statuts</Eyebrow>
        <div className="mt-(--space-4) flex flex-wrap items-center gap-(--space-4)">
          <MissionStatusBadge status="planned" />
          <MissionStatusBadge status="in_progress" />
          <MissionStatusBadge status="completed" />
          <OperatorStatusBadge status="active" />
          <OperatorStatusBadge status="inactive" />
        </div>
      </section>

      <section className="mb-(--space-9)">
        <Eyebrow>Champs</Eyebrow>
        <div className="mt-(--space-4) flex flex-wrap gap-(--space-6)">
          <TextField label="Nom de la mission" defaultValue="Secteur 03 — matinée" />
          <TextField label="Email opérateur" defaultValue="j.dupont@" error="Adresse email incomplète" />
          <SelectField label="Ville" defaultValue="lambersart">
            <option value="lambersart">Lambersart</option>
          </SelectField>
          <TextField label="ID mission" defaultValue="LB-00348" disabled />
        </div>
      </section>

      <section className="mb-(--space-9)">
        <Eyebrow>Grille carte</Eyebrow>
        <div className="mt-(--space-4)">
          <ReportCardGrid
            cells={[
              { label: "Zone", value: "Secteur 03" },
              { label: "Début", value: "05:42" },
              { label: "Collecté", value: "72,4 kg" },
            ]}
          />
        </div>
      </section>

      <section>
        <Eyebrow>Missions</Eyebrow>
        <div className="mt-(--space-4)">
          <ListRow
            badge={<MissionStatusBadge status="in_progress" />}
            title="Secteur 03 — matinée"
            meta="J. Dupont · 05:42"
            value="72,4 kg"
          />
          <ListRow
            badge={<MissionStatusBadge status="completed" />}
            title="Secteur 07 — soirée"
            meta="M. Lefèvre · 18:10"
            value="54,1 kg"
          />
          <ListRow
            badge={<MissionStatusBadge status="planned" />}
            title="Secteur 01 — nuit"
            meta="Non assignée"
            value="—"
          />
        </div>
        <div className="mt-(--space-3)">
          <DataLabel>Zone / Urbaine · Périurbaine</DataLabel>
        </div>
      </section>
    </main>
  );
}
