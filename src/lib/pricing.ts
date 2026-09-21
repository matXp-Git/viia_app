import type { SupabaseClient } from "@supabase/supabase-js";
import type { PriceMode, PricingSetting } from "@/lib/types";

// Fallback only — the real tariff lives in the pricing_setting table and is
// edited by the manager. Used if that row can't be read.
export const DEFAULT_PRICING: PricingSetting = {
  price_per_street: 70,
  discontinuity_fee: 10,
  price_mode: "ttc",
};

export function priceModeLabel(mode: PriceMode): string {
  return mode === "ttc" ? "TTC" : "HT";
}

export function formatEuro(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function estimateAmount(streetCount: number, unitPrice: number): number {
  return Math.round(streetCount * unitPrice * 100) / 100;
}

export async function getPricing(supabase: SupabaseClient): Promise<PricingSetting> {
  const { data } = await supabase
    .from("pricing_setting")
    .select("price_per_street, discontinuity_fee, price_mode")
    .eq("id", true)
    .maybeSingle();
  return (data as PricingSetting | null) ?? DEFAULT_PRICING;
}
