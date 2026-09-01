"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import type { MissionStatus, TrackSegment, Weighing } from "@/lib/types";
import { completeAssignment, recordPoint, startSegment, submitWeighing, type WeighingState } from "./actions";

// GPS points every 4s (spec: 3-5s), points with worse than 50m accuracy are
// dropped client-side before they ever reach the server (§4).
const RECORD_INTERVAL_MS = 4000;
const MAX_ACCURACY_M = 50;

type Props = {
  missionId: string;
  missionStatus: MissionStatus;
  completedAt: string | null;
  latestSegment: TrackSegment | null;
  weighing: Weighing | null;
};

const weighingInitial: WeighingState = {};

const geolocationSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

export function MissionRunner({ missionId, completedAt, latestSegment, weighing }: Props) {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(latestSegment?.id ?? null);
  const [completed, setCompleted] = useState(Boolean(completedAt));
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [weighingState, weighingAction, weighingPending] = useActionState(
    submitWeighing.bind(null, missionId),
    weighingInitial,
  );
  const hasWeighing = Boolean(weighing) || Boolean(weighingState.success);

  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!activeSegmentId || completed || !geolocationSupported) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        lastPositionRef.current = position;
        setAccuracy(position.coords.accuracy);
        setGeoError(null);
      },
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    const interval = setInterval(() => {
      const position = lastPositionRef.current;
      if (!position || position.coords.accuracy > MAX_ACCURACY_M) return;
      void recordPoint(
        activeSegmentId,
        position.coords.latitude,
        position.coords.longitude,
        new Date(position.timestamp).toISOString(),
      );
    }, RECORD_INTERVAL_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(interval);
    };
  }, [activeSegmentId, completed]);

  function handleStart(source: "vehicle" | "manual") {
    setStartError(null);
    startTransition(async () => {
      const result = await startSegment(missionId, source);
      if (result.error) {
        setStartError(result.error);
        return;
      }
      if (result.segmentId) setActiveSegmentId(result.segmentId);
    });
  }

  function handleComplete() {
    setCompleteError(null);
    startTransition(async () => {
      const result = await completeAssignment(missionId);
      if (result.error) {
        setCompleteError(result.error);
        return;
      }
      setCompleted(true);
    });
  }

  if (completed) {
    return <p className="text-sm text-charcoal/85">Votre part de cette mission est terminée.</p>;
  }

  if (!activeSegmentId) {
    return (
      <div>
        <Button variant="accent" onClick={() => handleStart("vehicle")} disabled={pending}>
          {pending ? "Démarrage..." : "Démarrer la mission →"}
        </Button>
        {startError ? <p className="mt-(--space-2) text-xs text-critical">{startError}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-(--space-7)">
      <div className="border border-line p-(--space-4)">
        <div className="text-2xs uppercase tracking-label text-charcoal/60">Suivi GPS</div>
        <p className="mt-(--space-2) text-sm text-black">
          {!geolocationSupported
            ? "Géolocalisation indisponible sur cet appareil."
            : geoError
              ? geoError
              : accuracy !== null
                ? `Précision actuelle : ${Math.round(accuracy)} m`
                : "En attente de signal GPS..."}
        </p>
      </div>

      <div className="flex flex-wrap gap-(--space-4)">
        <Button variant="ghost" onClick={() => handleStart("manual")} disabled={pending}>
          Segment manuel
        </Button>
      </div>

      <div className="border-t border-line pt-(--space-6)">
        <div className="text-2xs uppercase tracking-label text-charcoal/60">Pesée</div>
        <form action={weighingAction} className="mt-(--space-3) flex flex-wrap items-end gap-(--space-4)">
          <TextField
            label="Poids total (kg)"
            name="kilos_total"
            type="number"
            step="0.1"
            min="0"
            defaultValue={weighing?.kilos_total}
            required
          />
          <TextField
            label="Dont recyclé (kg)"
            name="kilos_recycled"
            type="number"
            step="0.1"
            min="0"
            defaultValue={weighing?.kilos_recycled}
            required
          />
          {weighingState.error ? <p className="w-full text-xs text-critical">{weighingState.error}</p> : null}
          <Button type="submit" variant="ghost" disabled={weighingPending}>
            {weighingPending ? "Enregistrement..." : hasWeighing ? "Mettre à jour la pesée" : "Enregistrer la pesée"}
          </Button>
        </form>
      </div>

      <div>
        <Button variant="accent" onClick={handleComplete} disabled={pending || !hasWeighing}>
          {pending ? "..." : "Terminer ma part →"}
        </Button>
        {!hasWeighing ? <p className="mt-(--space-2) text-xs text-charcoal/60">Enregistrez la pesée avant de terminer.</p> : null}
        {completeError ? <p className="mt-(--space-2) text-xs text-critical">{completeError}</p> : null}
      </div>
    </div>
  );
}
