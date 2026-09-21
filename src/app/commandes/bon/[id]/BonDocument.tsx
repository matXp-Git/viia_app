import type { OrderDetails } from "@/lib/orderData";
import { delayLabel, formatDateFr, timeSlotLabel } from "@/lib/orders";
import { estimateAmount, formatEuro, priceModeLabel } from "@/lib/pricing";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Logo } from "@/components/ui/Logo";
import { MissionStatusBadge } from "@/components/ui/StatusBadge";
import { PrintLightScope } from "@/components/ui/PrintLightScope";

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface p-(--space-4)">
      <div className="text-2xs uppercase tracking-label text-muted">{label}</div>
      <div className="mt-(--space-2) text-sm font-bold text-heading">{children}</div>
    </div>
  );
}

// The purchase order itself — on screen, printed, or saved as PDF.
export function BonDocument({ details }: { details: OrderDetails }) {
  const { order, mission, cityName, clientName, zoneName } = details;
  const mode = priceModeLabel(order.price_mode);
  const estimate = estimateAmount(order.street_count, order.unit_price);

  return (
      <PrintLightScope>
        <article className="mx-auto max-w-[760px] border border-divider bg-surface p-(--space-7) text-body">
          <div className="flex items-start justify-between gap-(--space-4)">
            <Logo className="h-5 w-auto text-heading" />
            <MissionStatusBadge status={mission.status} />
          </div>

          <div className="mt-(--space-6)">
            <Eyebrow>Bon de commande</Eyebrow>
            <h1 className="mt-(--space-2) text-display-sm text-heading">{mission.reference ?? "—"}</h1>
            <p className="mt-(--space-1) text-xs text-muted">Commande passée le {new Date(order.created_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</p>
          </div>

          <div className="mt-(--space-6) grid grid-cols-2 gap-px border border-divider bg-divider max-mobile:grid-cols-1">
            <Cell label="Client">{clientName}</Cell>
            <Cell label="Ville">{cityName}</Cell>
            <Cell label="Zone">{zoneName}</Cell>
            <Cell label="Délai d'intervention">{delayLabel(order)}</Cell>
            <Cell label="Créneau horaire">{mission.time_slot ? timeSlotLabel[mission.time_slot] : "Non précisé"}</Cell>
            <Cell label="Rues">{order.street_count}</Cell>
          </div>

          <div className="mt-(--space-6)">
            <div className="text-2xs uppercase tracking-label text-muted">Rues à traiter</div>
            <ol className="mt-(--space-2) list-decimal pl-(--space-6) text-sm text-heading">
              {mission.streets.map((street, index) => (
                <li key={index} className="py-0.5">
                  {street}
                </li>
              ))}
            </ol>
          </div>

          {mission.remark ? (
            <div className="mt-(--space-6)">
              <div className="text-2xs uppercase tracking-label text-muted">Remarque</div>
              <p className="mt-(--space-2) whitespace-pre-line text-sm text-heading">{mission.remark}</p>
            </div>
          ) : null}

          <div className="mt-(--space-6) border-t border-divider pt-(--space-5)">
            <div className="text-2xs uppercase tracking-label text-muted">Tarification ({mode})</div>
            <table className="mt-(--space-3) w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b border-divider">
                  <td className="py-(--space-2) text-body">
                    {order.street_count} rue{order.street_count > 1 ? "s" : ""} × {formatEuro(order.unit_price)}
                  </td>
                  <td className="py-(--space-2) text-right tabular-nums text-heading">{formatEuro(estimate)}</td>
                </tr>
                <tr className="border-b border-divider">
                  <td className="py-(--space-2) text-body">
                    Forfait par coupure entre deux rues non contiguës (ajouté en fin de mission)
                  </td>
                  <td className="py-(--space-2) text-right tabular-nums text-heading">
                    {formatEuro(order.discontinuity_fee)}
                  </td>
                </tr>
                <tr>
                  <td className="pt-(--space-3) font-bold text-heading">Estimation {mode}</td>
                  <td className="pt-(--space-3) text-right text-lg font-bold tabular-nums text-heading">
                    {formatEuro(order.estimated_amount)}
                  </td>
                </tr>
                {order.final_amount !== null ? (
                  <tr>
                    <td className="pt-(--space-2) font-bold text-heading">Montant final {mode}</td>
                    <td className="pt-(--space-2) text-right text-lg font-bold tabular-nums text-heading">
                      {formatEuro(order.final_amount)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <p className="mt-(--space-4) text-xs leading-relaxed text-muted">
              {order.final_amount !== null
                ? "Montant final ajusté selon la longueur réelle des tronçons et la continuité des rues constatées lors de la mission."
                : "Prix estimatif basé sur des rues de 700 m. Il sera ajusté à l'issue de la mission avec les données réelles : longueur des tronçons et continuité des rues."}
            </p>
          </div>
        </article>
      </PrintLightScope>
  );
}
