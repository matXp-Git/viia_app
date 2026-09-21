import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOrderDetails } from "@/lib/orderData";
import { getOrderingContext } from "../../context";
import { BonActions } from "./BonActions";
import { BonDocument } from "./BonDocument";

type SearchParams = { client?: string; created?: string; mail?: string };

export default async function BonDeCommandePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const ctx = await getOrderingContext(query.client);
  const supabase = await createClient();

  const details = await loadOrderDetails(supabase, id);
  if (!details) notFound();

  const { order } = details;
  const backQuery = ctx.isStaff ? `?client=${order.client_id}` : "";
  const mailSent = query.mail === "sent";

  return (
    <div>
      {query.created ? (
        <div className="mb-(--space-5) border border-divider p-(--space-4) text-sm text-heading print:hidden">
          <div className="font-bold">Commande enregistrée.</div>
          <div className="mt-(--space-1) text-body">
            {mailSent
              ? "Un e-mail de confirmation vous a été envoyé, ainsi qu'à ViiA. La mission apparaît dans vos missions en cours."
              : "La mission apparaît dans vos missions en cours et dans le suivi de ViiA. L'e-mail de confirmation n'a pas pu être envoyé : utilisez « Recevoir par e-mail » ou imprimez ce bon de commande."}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-(--space-4) print:hidden">
        <Link href={`/commandes${backQuery}`} className="text-xs uppercase tracking-label text-muted hover:text-heading">
          ← Commandes
        </Link>
        <BonActions orderId={order.id} />
      </div>

      <div className="mt-(--space-5)">
        <BonDocument details={details} />
      </div>
    </div>
  );
}
