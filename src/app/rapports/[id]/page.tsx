import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { City, Client, Releve, Report, ReportPhoto } from "@/lib/types";
import { ReportBuilder } from "./ReportBuilder";

export default async function ReportEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: report }, { data: cities }, { data: clients }, { data: releves }, { data: selection }, { data: photos }] =
    await Promise.all([
      supabase.from("report").select("*").eq("id", id).single(),
      supabase.from("city").select("*").order("name"),
      supabase.from("client").select("*").order("name"),
      supabase.from("releve").select("*").order("recorded_at", { ascending: false }),
      supabase.from("report_releve").select("releve_id").eq("report_id", id),
      supabase.from("report_photo").select("*").eq("report_id", id).order("position"),
    ]);

  if (!report) notFound();

  return (
    <ReportBuilder
      report={report as Report}
      cities={(cities ?? []) as City[]}
      clients={(clients ?? []) as Client[]}
      releves={(releves ?? []) as Releve[]}
      initialSelectedIds={(selection ?? []).map((s) => s.releve_id)}
      photos={(photos ?? []) as ReportPhoto[]}
    />
  );
}
