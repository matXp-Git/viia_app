import tokens from "../../References/viia-design-tokens.json";
import type { OrderDetails } from "@/lib/orderData";
import { delayLabel, timeSlotLabel } from "@/lib/orders";
import { estimateAmount, formatEuro, priceModeLabel } from "@/lib/pricing";

// E-mail clients don't support CSS variables, so the palette is read from the
// same design-tokens file the app's CSS is generated from.
const color = {
  accent: tokens.color.brand.accent.value,
  ink: tokens.color.brand.black.value,
  text: tokens.color.brand.charcoal.value,
  page: tokens.color.brand.offwhite.value,
  card: tokens.color.brand.white.value,
  line: tokens.color.line.onLight.value,
};

export type OrderEmailStatus = "sent" | "skipped" | "failed";

export function orderNotifyAddress(): string {
  return process.env.ORDER_NOTIFY_EMAIL || "order@viia.pro";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildOrderEmailContent(details: OrderDetails, bonUrl: string, isCopy: boolean) {
  const { order, mission, cityName, clientName, zoneName } = details;
  const reference = mission.reference ?? "—";
  const mode = priceModeLabel(order.price_mode);
  const estimate = `${order.street_count} rue${order.street_count > 1 ? "s" : ""} × ${formatEuro(order.unit_price)} = ${formatEuro(estimateAmount(order.street_count, order.unit_price))} ${mode}`;
  const priceRule = `Prix estimatif, ajusté à l'issue de la mission selon la longueur réelle des tronçons. Un forfait de ${formatEuro(order.discontinuity_fee)} ${mode} s'applique pour chaque coupure entre deux rues non contiguës.`;

  const rows: [string, string][] = [
    ["Client", clientName],
    ["Ville", cityName],
    ["Zone", zoneName],
    ["Délai d'intervention", delayLabel(order)],
  ];
  if (mission.time_slot) rows.push(["Créneau horaire", timeSlotLabel[mission.time_slot]]);
  if (mission.remark) rows.push(["Remarque", mission.remark]);
  rows.push(["Estimation", estimate]);

  const subject = oneLine(`${isCopy ? "Copie — " : ""}Commande ${reference} — ${zoneName} (${cityName})`);

  const text = [
    `Bon de commande ${reference}`,
    "",
    ...rows.map(([label, value]) => `${label} : ${value}`),
    "",
    "Rues :",
    ...mission.streets.map((street, index) => `${index + 1}. ${street}`),
    "",
    priceRule,
    "",
    `Voir le bon de commande : ${bonUrl}`,
  ].join("\n");

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 16px 8px 0;color:${color.text};font-size:12px;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:8px 0;color:${color.ink};font-size:14px;font-weight:bold">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const streetsHtml = mission.streets
    .map((street) => `<li style="margin:2px 0;color:${color.ink};font-size:14px">${escapeHtml(street)}</li>`)
    .join("");

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:${color.page};font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:${color.card};border:1px solid ${color.line}">
    <tr><td style="padding:24px">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:${color.text}">${isCopy ? "Copie de votre" : "Nouveau"} bon de commande</div>
      <h1 style="margin:4px 0 16px;font-size:24px;color:${color.ink}">${escapeHtml(reference)}</h1>
      <table role="presentation" width="100%" style="border-top:1px solid ${color.line}">${rowsHtml}</table>
      <div style="margin-top:16px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:${color.text}">Rues (${mission.streets.length})</div>
      <ol style="margin:8px 0 0;padding-left:20px">${streetsHtml}</ol>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${color.text}">${escapeHtml(priceRule)}</p>
      <p style="margin:24px 0 0"><a href="${escapeHtml(bonUrl)}" style="display:inline-block;padding:12px 24px;background:${color.accent};color:${color.ink};font-size:13px;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:0.08em;border-radius:999px">Voir le bon de commande</a></p>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

// Sends the purchase-order e-mail through Resend. Never throws: an order must
// stay valid even if the e-mail service is down or not configured yet.
export async function sendOrderEmail(params: {
  details: OrderDetails;
  bonUrl: string;
  to: string[];
  replyTo?: string | null;
  isCopy?: boolean;
}): Promise<OrderEmailStatus> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[order-email] RESEND_API_KEY / ORDER_EMAIL_FROM not set — e-mail skipped");
    return "skipped";
  }

  const recipients = [...new Set(params.to.filter(Boolean))];
  if (recipients.length === 0) return "skipped";

  const { subject, text, html } = buildOrderEmailContent(params.details, params.bonUrl, params.isCopy ?? false);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });
    if (!response.ok) {
      console.error("[order-email] Resend rejected the message", response.status, await response.text());
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("[order-email] network error", error);
    return "failed";
  }
}
