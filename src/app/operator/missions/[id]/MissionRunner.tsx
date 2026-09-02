"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { recordPoint, reportWildDump, startSegment, submitWeighing, type WeighingState } from "./actions";

// GPS points every 4s (spec: 3-5s), points with worse than 50m accuracy are
// dropped client-side before they ever reach the server (§4).
const RECORD_INTERVAL_MS = 4000;
const MAX_ACCURACY_M = 50;

type Props = {
  missionId: string;
  reference: string;
  cityName: string;
  clientName: string | null;
  date: string;
};

const weighingInitial: WeighingState = {};

const geolocationSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

function LivePulse() {
  return (
    <span className="relative flex h-6 w-6">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
      <span className="relative inline-flex h-6 w-6 rounded-full bg-accent" />
    </span>
  );
}

export function MissionRunner({ missionId, reference, cityName, clientName, date }: Props) {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [tracking, setTracking] = useState(true);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [pending, startTransition] = useTransition();

  const [wildDumpPending, setWildDumpPending] = useState(false);
  const [wildDumpError, setWildDumpError] = useState<string | null>(null);
  const [wildDumpSuccess, setWildDumpSuccess] = useState(false);

  const [weighingState, weighingAction, weighingPending] = useActionState(
    submitWeighing.bind(null, missionId),
    weighingInitial,
  );

  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!activeSegmentId || !tracking || !geolocationSupported) return;

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
  }, [activeSegmentId, tracking]);

  function handleStart(source: "vehicle" | "manual") {
    setStartError(null);
    startTransition(async () => {
      const result = await startSegment(missionId, source);
      if (result.error) {
        setStartError(result.error);
        return;
      }
      if (result.segmentId) {
        setActiveSegmentId(result.segmentId);
        setTracking(true);
      }
    });
  }

  function handleWildDump() {
    setWildDumpError(null);
    if (!geolocationSupported) {
      setWildDumpError("Géolocalisation indisponible sur cet appareil.");
      return;
    }
    setWildDumpPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        startTransition(async () => {
          const result = await reportWildDump(missionId, latitude, longitude);
          setWildDumpPending(false);
          if (result.error) {
            setWildDumpError(result.error);
            return;
          }
          setWildDumpSuccess(true);
          setTimeout(() => setWildDumpSuccess(false), 4000);
        });
      },
      (err) => {
        setWildDumpPending(false);
        setWildDumpError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleEndSession() {
    setActiveSegmentId(null);
    setTracking(true);
    setConfirmingEnd(false);
  }

  const missionMeta = `${cityName}${clientName ? ` · ${clientName}` : ""} · ${date}`;

  if (!activeSegmentId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center px-(--gutter) text-center">
        <p className="text-xs tracking-eyebrow text-charcoal/60">{missionMeta}</p>
        <h1 className="mt-(--space-2) text-display-lg">{reference}</h1>
        <Button variant="accent" onClick={() => handleStart("vehicle")} disabled={pending} className="mt-(--space-7)">
          {pending ? "Démarrage..." : "Démarrer la mission →"}
        </Button>
        <p className="mt-(--space-3) text-xs text-charcoal/60">
          Reprenez ici à tout moment — même un autre jour — s&apos;il reste du travail sur cette mission.
        </p>
        {startError ? <p className="mt-(--space-2) text-xs text-critical">{startError}</p> : null}
      </main>
    );
  }

  // ---- Mission en cours — écran sobre, plein écran ----
  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col px-(--gutter) py-(--space-9)">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-(--space-3)">
          {tracking ? <LivePulse /> : <span className="h-6 w-6 rounded-full border-2 border-line" />}
          <span className="text-xs uppercase tracking-eyebrow text-charcoal/60">
            {tracking ? "Mission en cours" : "Suivi en pause"}
          </span>
        </div>
        <h1 className="mt-(--space-4) text-display-lg">{reference}</h1>
        <p className="mt-(--space-2) text-sm text-charcoal/60">{missionMeta}</p>
      </div>

      {tracking ? (
        <>
          <div className="mt-(--space-7) border border-line p-(--space-4) text-center">
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

          <div className="mt-(--space-6) flex flex-wrap justify-center gap-(--space-4)">
            <Button variant="ghost" onClick={() => handleStart("manual")} disabled={pending}>
              Segment manuel
            </Button>
            <Button
              variant="ghost"
              onClick={handleWildDump}
              disabled={wildDumpPending}
              className="!border-warning !text-warning"
            >
              {wildDumpPending ? "Localisation..." : "Dépôt sauvage"}
            </Button>
          </div>
          {wildDumpSuccess ? <p className="mt-(--space-2) text-center text-xs text-success">Point enregistré ✓</p> : null}
          {wildDumpError ? <p className="mt-(--space-2) text-center text-xs text-critical">{wildDumpError}</p> : null}

          <div className="mt-(--space-7) flex flex-col items-center border-t border-line pt-(--space-6)">
            <Button variant="accent" onClick={() => setTracking(false)}>
              Mettre en pause →
            </Button>
            <p className="mt-(--space-2) text-xs text-charcoal/60">
              Pour le retour au dépôt — le trajet ne sera pas enregistré.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="mt-(--space-7) border-t border-line pt-(--space-6)">
            <div className="text-center text-2xs uppercase tracking-label text-charcoal/60">Pesée</div>
            <form action={weighingAction} className="mt-(--space-3) flex flex-wrap items-end justify-center gap-(--space-4)">
              <TextField label="Poids total (kg)" name="kilos_total" type="number" step="0.1" min="0" required />
              <TextField label="Dont recyclé (kg)" name="kilos_recycled" type="number" step="0.1" min="0" required />
              {weighingState.error ? <p className="w-full text-center text-xs text-critical">{weighingState.error}</p> : null}
              {weighingState.success ? <p className="w-full text-center text-xs text-success">Pesée enregistrée ✓</p> : null}
              <Button type="submit" variant="ghost" disabled={weighingPending}>
                {weighingPending ? "Enregistrement..." : "Enregistrer la pesée"}
              </Button>
            </form>
          </div>

          <div className="mt-(--space-7) flex flex-col items-center border-t border-line pt-(--space-6) text-center">
            {!confirmingEnd ? (
              <>
                <Button variant="accent" onClick={() => setConfirmingEnd(true)}>
                  Terminer ma session →
                </Button>
                <button
                  type="button"
                  onClick={() => setTracking(true)}
                  className="mt-(--space-3) text-xs uppercase tracking-label text-charcoal/60 focus-ring hover:text-black"
                >
                  Reprendre le suivi
                </button>
              </>
            ) : (
              <div className="w-full border border-warning p-(--space-4)">
                <p className="text-sm text-black">Terminer votre session sur cette mission ?</p>
                <p className="mt-(--space-1) text-xs text-charcoal/60">
                  Vous pourrez reprendre à tout moment, même un autre jour — seul le manager termine la mission.
                </p>
                <div className="mt-(--space-4) flex justify-center gap-(--space-4)">
                  <Button variant="ghost" onClick={() => setConfirmingEnd(false)}>
                    Annuler
                  </Button>
                  <Button variant="accent" onClick={handleEndSession}>
                    Oui, terminer →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
