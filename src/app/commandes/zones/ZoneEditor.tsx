"use client";

import { useEffect, useRef, useState, useTransition, type ClipboardEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { City, PriceMode } from "@/lib/types";
import { formatEuro, priceModeLabel } from "@/lib/pricing";
import { MAX_STREETS } from "@/lib/orders";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { saveZoneAction } from "../actions";

type Row = { id: number; value: string };

type Props = {
  zoneId: string | null;
  // Managers/commercials create zones on behalf of a client; a client's own
  // account is resolved server-side.
  clientId: string | null;
  clientName: string | null;
  clientQuery: string;
  cities: City[];
  initialName: string;
  initialCityId: string;
  initialStreets: string[];
  discontinuityFee: number;
  priceMode: PriceMode;
};

const iconButton =
  "px-(--space-2) py-1 text-xs uppercase text-muted focus-ring hover:text-heading disabled:opacity-30 disabled:hover:text-muted";

export function ZoneEditor({
  zoneId,
  clientId,
  clientName,
  clientQuery,
  cities,
  initialName,
  initialCityId,
  initialStreets,
  discontinuityFee,
  priceMode,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [cityId, setCityId] = useState(initialCityId);
  const [rows, setRows] = useState<Row[]>(() =>
    (initialStreets.length > 0 ? initialStreets : [""]).map((value, index) => ({ id: index, value })),
  );
  const nextId = useRef(Math.max(initialStreets.length, 1));
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    if (pendingFocus.current !== null) {
      document.getElementById(`street-${pendingFocus.current}`)?.focus();
      pendingFocus.current = null;
    }
  });

  const filledCount = rows.filter((row) => row.value.trim() !== "").length;
  const atLimit = rows.length >= MAX_STREETS;

  function updateRow(id: number, value: string) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, value } : row)));
  }

  function addRowAfter(id: number | null) {
    if (atLimit) return;
    const newId = nextId.current++;
    pendingFocus.current = newId;
    setRows((prev) => {
      if (id === null) return [...prev, { id: newId, value: "" }];
      const index = prev.findIndex((row) => row.id === id);
      return [...prev.slice(0, index + 1), { id: newId, value: "" }, ...prev.slice(index + 1)];
    });
  }

  function removeRow(id: number) {
    setRows((prev) => (prev.length <= 1 ? [{ id, value: "" }] : prev.filter((row) => row.id !== id)));
  }

  function moveRow(id: number, direction: -1 | 1) {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.id === id);
      const target = index + direction;
      const current = prev[index];
      const other = prev[target];
      if (!current || !other) return prev;
      const next = [...prev];
      next[index] = other;
      next[target] = current;
      return next;
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, id: number) {
    if (event.key === "Enter") {
      event.preventDefault();
      addRowAfter(id);
    }
  }

  // Pasting a column of street names (one per line) fills one row each.
  function handlePaste(event: ClipboardEvent<HTMLInputElement>, id: number) {
    const text = event.clipboardData.getData("text");
    if (!/\r?\n/.test(text)) return;
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    event.preventDefault();

    const inserted = lines.map((value) => ({ id: nextId.current++, value }));
    setRows((prev) => {
      const index = prev.findIndex((row) => row.id === id);
      const current = prev[index];
      const keepCurrent = current && current.value.trim() !== "" ? [current] : [];
      return [...prev.slice(0, index), ...keepCurrent, ...inserted, ...prev.slice(index + 1)].slice(0, MAX_STREETS);
    });
  }

  function save(thenOrder: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await saveZoneAction({
        zoneId,
        clientId,
        cityId,
        name,
        streets: rows.map((row) => row.value),
      });
      if (result.error || !result.zoneId) {
        setError(result.error ?? "Enregistrement impossible.");
        return;
      }
      router.push(thenOrder ? `/commandes/zones/${result.zoneId}/commander${clientQuery}` : `/commandes${clientQuery}`);
    });
  }

  return (
    <div>
      <Link href={`/commandes${clientQuery}`} className="text-xs uppercase tracking-label text-muted hover:text-heading">
        ← Commandes
      </Link>
      <h1 className="mt-(--space-2) text-display-sm">{zoneId ? "Modifier la zone" : "Nouvelle zone"}</h1>
      {clientName ? <p className="mt-(--space-1) text-sm text-muted">Client : {clientName}</p> : null}

      <div className="mt-(--space-6) flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
        <TextField
          label="Nom de la zone"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          placeholder="Centre-ville, quartier de la gare..."
          className="max-w-[360px]"
        />
        <SelectField label="Ville" value={cityId} onChange={(event) => setCityId(event.target.value)}>
          <option value="" disabled>
            Choisir...
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-(--space-6)">
        <div className="text-2xs uppercase tracking-label text-muted">
          Rues ({filledCount})
        </div>
        <p className="mt-(--space-1) max-w-[70ch] text-xs text-muted">
          Conseil : saisissez les rues dans l&apos;ordre où elles se suivent. Des rues contiguës évitent le forfait de{" "}
          {formatEuro(discontinuityFee)} {priceModeLabel(priceMode)} appliqué en fin de mission à chaque coupure. L&apos;existence
          des rues et leur longueur ne sont pas vérifiées par l&apos;application.
        </p>

        <ol className="mt-(--space-3) flex flex-col gap-(--space-2)">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center gap-(--space-2)">
              <span className="w-6 text-right text-xs tabular-nums text-muted">{index + 1}.</span>
              <input
                id={`street-${row.id}`}
                value={row.value}
                onChange={(event) => updateRow(row.id, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, row.id)}
                onPaste={(event) => handlePaste(event, row.id)}
                maxLength={150}
                placeholder="Nom de la rue"
                aria-label={`Rue ${index + 1}`}
                className="w-full max-w-[420px] rounded-sm border border-divider bg-transparent px-(--space-3) py-(--space-3) text-sm text-body focus-ring"
              />
              <button type="button" onClick={() => moveRow(row.id, -1)} disabled={index === 0} aria-label="Monter" className={iconButton}>
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveRow(row.id, 1)}
                disabled={index === rows.length - 1}
                aria-label="Descendre"
                className={iconButton}
              >
                ↓
              </button>
              <button type="button" onClick={() => removeRow(row.id)} aria-label="Retirer la rue" className={`${iconButton} text-critical`}>
                ✕
              </button>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => addRowAfter(null)}
          disabled={atLimit}
          className="mt-(--space-3) text-xs uppercase tracking-label text-muted underline decoration-divider underline-offset-2 focus-ring hover:text-heading disabled:opacity-40"
        >
          + Ajouter une rue
        </button>
        <p className="mt-(--space-1) text-2xs text-muted">Astuce : collez une liste (une rue par ligne) pour remplir plusieurs lignes d&apos;un coup.</p>
      </div>

      {error ? <p className="mt-(--space-5) text-xs text-critical">{error}</p> : null}

      <div className="mt-(--space-6) flex flex-wrap items-center gap-(--space-4)">
        <Button type="button" onClick={() => save(true)} disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer et commander →"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => save(false)} disabled={pending}>
          Enregistrer la zone
        </Button>
      </div>
    </div>
  );
}
