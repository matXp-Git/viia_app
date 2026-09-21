"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PricingSetting, TimeSlot } from "@/lib/types";
import { estimateAmount, formatEuro, priceModeLabel } from "@/lib/pricing";
import { REMARK_MAX_LENGTH, WITHIN_DAYS_OPTIONS } from "@/lib/orders";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { createOrderAction } from "../../../actions";

type Delay = "" | "date" | `${(typeof WITHIN_DAYS_OPTIONS)[number]}`;

type Props = {
  zoneId: string;
  zoneName: string;
  cityName: string;
  streets: string[];
  pricing: PricingSetting;
  todayIso: string;
  clientQuery: string;
};

export function OrderForm({ zoneId, zoneName, cityName, streets, pricing, todayIso, clientQuery }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [delay, setDelay] = useState<Delay>("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<"" | TimeSlot>("");
  const [remark, setRemark] = useState("");

  const mode = priceModeLabel(pricing.price_mode);
  const estimate = estimateAmount(streets.length, pricing.price_per_street);
  const delayReady = delay !== "" && (delay !== "date" || date >= todayIso);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createOrderAction({
        zoneId,
        delayType: delay === "date" ? "date" : "within_days",
        targetDate: delay === "date" ? date : null,
        withinDays: delay === "date" || delay === "" ? null : Number(delay),
        timeSlot: slot || null,
        remark: remark.trim(),
      });
      if (result.error || !result.orderId) {
        setError(result.error ?? "La commande n'a pas pu être enregistrée.");
        return;
      }
      const query = new URLSearchParams(clientQuery.replace(/^\?/, ""));
      query.set("created", "1");
      query.set("mail", result.mail ?? "skipped");
      router.push(`/commandes/bon/${result.orderId}?${query.toString()}`);
    });
  }

  const radioClass = "flex cursor-pointer items-center gap-(--space-2) text-sm text-heading";

  return (
    <div>
      <Link href={`/commandes${clientQuery}`} className="text-xs uppercase tracking-label text-muted hover:text-heading">
        ← Commandes
      </Link>
      <h1 className="mt-(--space-2) text-display-sm">Commander : {zoneName}</h1>
      <p className="mt-(--space-1) text-sm text-muted">{cityName}</p>

      <div className="mt-(--space-6) grid gap-(--space-6) tablet:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-(--space-6)">
          <fieldset className="border border-divider p-(--space-4)">
            <legend className="px-(--space-2) text-2xs uppercase tracking-label text-muted">Délai d&apos;intervention</legend>
            <div className="flex flex-col gap-(--space-3)">
              {WITHIN_DAYS_OPTIONS.map((days) => (
                <label key={days} className={radioClass}>
                  <input
                    type="radio"
                    name="delay"
                    checked={delay === String(days)}
                    onChange={() => setDelay(String(days) as Delay)}
                    className="accent-[var(--color-accent)]"
                  />
                  Sous {days} jours
                </label>
              ))}
              <label className={radioClass}>
                <input
                  type="radio"
                  name="delay"
                  checked={delay === "date"}
                  onChange={() => setDelay("date")}
                  className="accent-[var(--color-accent)]"
                />
                Date précise
              </label>
              {delay === "date" ? (
                <TextField
                  label="Intervenir le"
                  type="date"
                  min={todayIso}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              ) : null}
            </div>
          </fieldset>

          <SelectField
            label="Créneau horaire (facultatif)"
            value={slot}
            onChange={(event) => setSlot(event.target.value as "" | TimeSlot)}
          >
            <option value="">Pas de préférence</option>
            <option value="matin">Matin</option>
            <option value="apres_midi">Après-midi</option>
          </SelectField>

          <TextAreaField
            label={`Remarque (facultatif) — ${remark.length}/${REMARK_MAX_LENGTH}`}
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            maxLength={REMARK_MAX_LENGTH}
            placeholder="Accès, points d'attention, personne à contacter..."
            className="max-w-[520px]"
          />
        </div>

        <aside className="flex flex-col gap-(--space-4)">
          <div className="border border-divider p-(--space-4)">
            <div className="text-2xs uppercase tracking-label text-muted">Rues ({streets.length})</div>
            <ol className="mt-(--space-2) list-decimal pl-(--space-5) text-sm text-heading">
              {streets.map((street, index) => (
                <li key={index}>{street}</li>
              ))}
            </ol>
          </div>

          <div className="border border-divider p-(--space-4)">
            <div className="text-2xs uppercase tracking-label text-muted">Prix estimatif</div>
            <div className="mt-(--space-2) text-sm text-body">
              {streets.length} rue{streets.length > 1 ? "s" : ""} × {formatEuro(pricing.price_per_street)} {mode}
            </div>
            <div className="mt-(--space-1) text-xl font-bold text-heading">
              {formatEuro(estimate)} <span className="text-sm font-normal text-muted">{mode}</span>
            </div>
            <p className="mt-(--space-3) text-xs leading-relaxed text-muted">
              Estimation basée sur des rues de 700 m. Le prix final est ajusté à l&apos;issue de la mission selon la longueur
              réelle des tronçons. Un forfait de {formatEuro(pricing.discontinuity_fee)} {mode} s&apos;ajoute pour chaque
              coupure entre deux rues non contiguës.
            </p>
          </div>
        </aside>
      </div>

      {error ? <p className="mt-(--space-5) text-xs text-critical">{error}</p> : null}

      <div className="mt-(--space-6) flex flex-wrap items-center gap-(--space-4)">
        <Button type="button" onClick={submit} disabled={pending || !delayReady}>
          {pending ? "Envoi de la commande..." : "Valider la commande →"}
        </Button>
        {!delayReady ? <span className="text-xs text-muted">Choisissez un délai d&apos;intervention pour valider.</span> : null}
      </div>
    </div>
  );
}
