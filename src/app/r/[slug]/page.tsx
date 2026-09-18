import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PublicReport } from "@/lib/types";
import { reportPhotoUrl } from "@/lib/storage";
import { ReleveCard } from "@/components/releve/ReleveCard";
import { Logo } from "@/components/ui/Logo";
import { PrintButton } from "./PrintButton";

export default async function PublicReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_report", { p_slug: slug });
  if (!data) notFound();

  const report = data as PublicReport;

  return (
    <div data-theme="dark" className="report-print min-h-screen bg-page text-body">
      <style>{`
        @media print {
          .report-print {
            --color-page: #ffffff;
            --color-surface: #ffffff;
            --color-heading: #000000;
            --color-body: #222222;
            --color-muted: #555555;
            --color-divider: #cccccc;
            color-scheme: light;
          }
        }
      `}</style>

      <div className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-9)">
        <div className="flex flex-wrap items-center justify-between gap-(--space-4)">
          <Logo className="h-5 w-auto text-heading" />
          <PrintButton />
        </div>

        <div className="mt-(--space-7)">
          {report.city_name ? <div className="text-2xs uppercase tracking-label text-muted">{report.city_name}</div> : null}
          <h1 className="mt-(--space-1) text-display-lg text-heading">{report.title}</h1>
          <p className="mt-(--space-2) max-w-[62ch] text-sm text-muted">
            Ce rapport reprend l&apos;ensemble des relevés réalisés par ViiA sur la période.
          </p>
        </div>

        {report.photos.length > 0 ? (
          <div className="mt-(--space-7) flex flex-wrap gap-(--space-5)">
            {report.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.storage_path}
                src={reportPhotoUrl(photo.storage_path)}
                alt=""
                className="aspect-square w-[400px] border border-divider object-cover"
              />
            ))}
          </div>
        ) : null}

        <div className="mt-(--space-9) flex flex-wrap gap-(--space-5)">
          {report.releves.map((releve) => (
            <div key={releve.id} className="break-inside-avoid">
              <ReleveCard
                troncon={releve.troncon}
                cityName={releve.city_name}
                lengthM={releve.length_m}
                countAller={releve.count_aller}
                countRetour={releve.count_retour}
                density={releve.density}
                recordedAt={releve.recorded_at}
              />
            </div>
          ))}
        </div>
        {report.releves.length === 0 ? <p className="mt-(--space-7) text-sm text-muted">Aucun relevé dans ce rapport.</p> : null}
      </div>
    </div>
  );
}
