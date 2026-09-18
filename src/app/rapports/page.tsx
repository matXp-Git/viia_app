import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { City, Client, Report } from "@/lib/types";
import { CreateReportForm } from "./CreateReportForm";
import { DeleteReportButton } from "./DeleteReportButton";

export default async function RapportsPage() {
  const supabase = await createClient();

  const [{ data: reports }, { data: cities }, { data: clients }] = await Promise.all([
    supabase.from("report").select("*").order("updated_at", { ascending: false }),
    supabase.from("city").select("*").order("name"),
    supabase.from("client").select("*").order("name"),
  ]);

  const cityById = new Map(((cities ?? []) as City[]).map((c) => [c.id, c]));
  const clientById = new Map(((clients ?? []) as Client[]).map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="text-display-sm">Rapports prospection</h1>
      <p className="mt-(--space-2) max-w-[62ch] text-sm text-muted">
        Sélectionne des relevés et des photos pour composer une page à envoyer à un prospect — chaque rapport garde
        un lien fixe, modifiable à tout moment.
      </p>

      <div className="mt-(--space-6)">
        <CreateReportForm cities={(cities ?? []) as City[]} clients={(clients ?? []) as Client[]} />
      </div>

      <div className="mt-(--space-7) flex flex-col">
        {((reports ?? []) as Report[]).map((report) => (
          <div
            key={report.id}
            className="flex flex-wrap items-center justify-between gap-(--space-4) border-t border-divider py-(--space-4) last:border-b"
          >
            <div>
              <Link
                href={`/rapports/${report.id}`}
                className="text-sm font-bold text-heading underline decoration-divider underline-offset-2 hover:decoration-heading"
              >
                {report.title}
              </Link>
              <div className="mt-1 text-xs text-muted">
                {report.city_id ? (cityById.get(report.city_id)?.name ?? "?") : "Toutes villes"}
                {report.client_id ? ` · ${clientById.get(report.client_id)?.name ?? "?"}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-(--space-4)">
              <a
                href={`/r/${report.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs uppercase tracking-label text-muted underline decoration-divider underline-offset-2 hover:text-heading"
              >
                Aperçu public
              </a>
              <DeleteReportButton id={report.id} />
            </div>
          </div>
        ))}
        {(reports ?? []).length === 0 ? <p className="py-(--space-4) text-sm text-muted">Aucun rapport pour le moment.</p> : null}
      </div>
    </div>
  );
}
