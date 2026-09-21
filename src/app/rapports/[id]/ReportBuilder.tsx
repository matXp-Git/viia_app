"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { City, Client, Releve, Report, ReportPhoto } from "@/lib/types";
import { densityLabel, densityPerMeter } from "@/lib/density";
import { reportPhotoUrl, REPORT_PHOTOS_BUCKET } from "@/lib/storage";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { saveReport, addReportPhoto, deleteReportPhoto } from "../actions";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";

const MAX_PHOTOS = 10;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

type Props = {
  report: Report;
  cities: City[];
  clients: Client[];
  releves: Releve[];
  initialSelectedIds: string[];
  photos: ReportPhoto[];
};

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Échec de compression"))), "image/jpeg", JPEG_QUALITY);
  });
}

export function ReportBuilder({ report, cities, clients, releves, initialSelectedIds, photos }: Props) {
  const [title, setTitle] = useState(report.title);
  const [cityId, setCityId] = useState(report.city_id ?? "");
  const [clientId, setClientId] = useState(report.client_id ?? "");
  const [dateFrom, setDateFrom] = useState(report.date_from ?? "");
  const [dateTo, setDateTo] = useState(report.date_to ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));

  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [currentPhotos, setCurrentPhotos] = useState(photos);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const cityById = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const candidates = useMemo(() => {
    return releves.filter((r) => {
      if (cityId && r.city_id !== cityId) return false;
      if (clientId && r.client_id !== clientId) return false;
      const day = r.recorded_at.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [releves, cityId, clientId, dateFrom, dateTo]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    setSaveError(null);
    setSaved(false);
    startSaving(async () => {
      const result = await saveReport(report.id, {
        title,
        cityId: cityId || null,
        clientId: clientId || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        releveIds: Array.from(selected),
      });
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  async function handleFiles(fileList: FileList) {
    const remaining = MAX_PHOTOS - currentPhotos.length;
    if (remaining <= 0) return;
    const files = Array.from(fileList).slice(0, remaining);

    setUploading(true);
    setUploadError(null);
    const supabase = createBrowserSupabaseClient();

    let position = currentPhotos.length;

    for (const file of files) {
      let uploadedPath: string | null = null;
      try {
        const blob = await compressImage(file);
        const path = `${report.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        uploadedPath = path;

        const record = await addReportPhoto(report.id, path, position);
        if (record.error || !record.id) throw new Error(record.error);
        const photoId = record.id;

        // The database id (not the file path) is what deleting relies on.
        setCurrentPhotos((prev) => [
          ...prev,
          { id: photoId, report_id: report.id, storage_path: path, position, created_at: new Date().toISOString() },
        ]);
        position += 1;
      } catch {
        // Don't leave an uploaded file that no report row points to.
        if (uploadedPath) await supabase.storage.from(REPORT_PHOTOS_BUCKET).remove([uploadedPath]);
        setUploadError("Échec de l'envoi d'une photo — réessaie.");
      }
    }
    setUploading(false);
  }

  function handleDeletePhoto(photoId: string) {
    const removed = currentPhotos.find((p) => p.id === photoId);
    setCurrentPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setUploadError(null);
    startSaving(async () => {
      const result = await deleteReportPhoto(photoId);
      if (result.error && removed) {
        setCurrentPhotos((prev) => [...prev, removed].sort((a, b) => a.position - b.position));
        setUploadError(result.error);
      }
    });
  }

  const publicPath = `/r/${report.slug}`;
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}${publicPath}` : publicPath;

  return (
    <div>
      <Link href="/rapports" className="text-xs uppercase tracking-label text-muted hover:text-heading">
        ← Rapports
      </Link>
      <h1 className="mt-(--space-2) text-display-sm">{report.title}</h1>

      <div className="mt-(--space-4) flex flex-wrap items-center gap-(--space-3) border border-divider p-(--space-4)">
        <span className="text-2xs uppercase tracking-label text-muted">Lien public</span>
        <code className="text-sm text-heading">{publicUrl}</code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(publicUrl)}
          className="text-xs uppercase tracking-label text-muted underline decoration-divider underline-offset-2 hover:text-heading"
        >
          Copier
        </button>
        <a
          href={publicPath}
          target="_blank"
          rel="noreferrer"
          className="text-xs uppercase tracking-label text-muted underline decoration-divider underline-offset-2 hover:text-heading"
        >
          Voir la page →
        </a>
      </div>

      <div className="mt-(--space-7) flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
        <TextField label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-[320px]" />
        <SelectField label="Ville" value={cityId} onChange={(e) => setCityId(e.target.value)}>
          <option value="">Toutes</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </SelectField>
        <SelectField label="Client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Tous</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Du" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <TextField label="Au" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="mt-(--space-7)">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-heading">Relevés ({selected.size} sélectionné{selected.size > 1 ? "s" : ""})</h2>
        </div>
        <div className="mt-(--space-3) overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-2xs uppercase tracking-label text-muted">
                <th className="py-(--space-2) pr-(--space-3) font-normal" />
                <th className="py-(--space-2) pr-(--space-4) font-normal">Ville</th>
                <th className="py-(--space-2) pr-(--space-4) font-normal">Tronçon</th>
                <th className="py-(--space-2) pr-(--space-4) text-right font-normal">Déchets/m</th>
                <th className="py-(--space-2) pr-(--space-4) font-normal">Densité</th>
                <th className="py-(--space-2) font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((releve) => {
                const perMeter = densityPerMeter(releve.count_aller, releve.count_retour, releve.length_m);
                return (
                  <tr
                    key={releve.id}
                    onClick={() => toggle(releve.id)}
                    className="cursor-pointer border-b border-divider hover:bg-surface"
                  >
                    <td className="py-(--space-2) pr-(--space-3)">
                      <input
                        type="checkbox"
                        checked={selected.has(releve.id)}
                        onChange={() => toggle(releve.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-[var(--color-accent)]"
                      />
                    </td>
                    <td className="py-(--space-2) pr-(--space-4) text-heading">{cityById.get(releve.city_id)?.name ?? "?"}</td>
                    <td className="py-(--space-2) pr-(--space-4) text-heading">{releve.troncon}</td>
                    <td className="py-(--space-2) pr-(--space-4) text-right tabular-nums text-heading">
                      {perMeter !== null ? perMeter.toFixed(2) : "—"}
                    </td>
                    <td className="py-(--space-2) pr-(--space-4) text-heading">{densityLabel[releve.density]}</td>
                    <td className="py-(--space-2) text-xs text-muted">{new Date(releve.recorded_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {candidates.length === 0 ? <p className="py-(--space-4) text-sm text-muted">Aucun relevé pour ces critères.</p> : null}
        </div>
      </div>

      <div className="mt-(--space-7)">
        <h2 className="text-sm font-bold text-heading">
          Photos ({currentPhotos.length}/{MAX_PHOTOS})
        </h2>
        <div className="mt-(--space-3) flex flex-wrap gap-(--space-3)">
          {currentPhotos.map((photo) => (
            <div key={photo.id} className="relative h-24 w-24 border border-divider">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={reportPhotoUrl(photo.storage_path)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute right-1 top-1 bg-page/90 px-1 text-2xs uppercase text-critical"
              >
                ✕
              </button>
            </div>
          ))}
          {currentPhotos.length < MAX_PHOTOS ? (
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center border border-dashed border-divider text-2xs uppercase tracking-label text-muted hover:text-heading">
              {uploading ? "Envoi..." : "+ Ajouter"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </label>
          ) : null}
        </div>
        {uploadError ? <p className="mt-(--space-2) text-xs text-critical">{uploadError}</p> : null}
      </div>

      <div className="mt-(--space-7) flex items-center gap-(--space-4)">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer →"}
        </Button>
        {saved ? <span className="text-xs text-success">Enregistré.</span> : null}
        {saveError ? <span className="text-xs text-critical">{saveError}</span> : null}
      </div>
    </div>
  );
}
