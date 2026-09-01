"use client";

import { useEffect, useRef } from "react";
import {
  MapLibreMap,
  NavigationControl,
  Popup,
  LngLatBounds,
  setWorkerUrl,
  type LngLatBoundsLike,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Turbopack doesn't resolve maplibre-gl's built-in
// `new Worker(new URL(..., import.meta.url))` loading correctly (the
// request resolves to the page's HTML instead of the script, so the map
// silently never renders any tiles). Point it at a static copy instead —
// see scripts/copy-maplibre-worker.mjs.
setWorkerUrl("/maplibre-gl-worker.mjs");

export type TrackFeatureProps = {
  missionId: string;
  reference: string;
  cityName: string;
  date: string;
  source: "vehicle" | "manual";
};

export type TrackFeature = {
  properties: TrackFeatureProps;
  coordinates: [number, number][];
};

type TrackLineFeature = {
  type: "Feature";
  properties: TrackFeatureProps;
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

type TrackFeatureCollection = {
  type: "FeatureCollection";
  features: TrackLineFeature[];
};

// Default view when there's nothing to show yet — Lambersart, the spec's
// own example city, rather than an arbitrary world view.
const DEFAULT_CENTER: [number, number] = [3.0287, 50.6572];
const DEFAULT_ZOOM = 11;

function resolveToken(name: string): string {
  if (typeof window === "undefined") return "#000000";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function toFeatureCollection(tracks: TrackFeature[]): TrackFeatureCollection {
  return {
    type: "FeatureCollection",
    features: tracks
      .filter((t) => t.coordinates.length >= 2)
      .map((t) => ({
        type: "Feature",
        properties: t.properties,
        geometry: { type: "LineString", coordinates: t.coordinates },
      })),
  };
}

export function TrackMap({ tracks }: { tracks: TrackFeature[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const popup = new Popup({ closeButton: false, offset: 12 });

    map.on("load", () => {
      map.addSource("tracks", { type: "geojson", data: toFeatureCollection(tracks) });

      map.addLayer({
        id: "tracks-outline",
        type: "line",
        source: "tracks",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": resolveToken("--color-trace-outline"),
          "line-width": 5,
        },
      });

      map.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": resolveToken("--color-trace"),
          "line-width": 3,
        },
      });

      map.on("mouseenter", "tracks-line", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "tracks-line", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
      map.on("click", "tracks-line", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const props = feature.properties as TrackFeatureProps;
        popup
          .setLngLat(event.lngLat)
          .setHTML(
            `<strong>${props.reference}</strong><br/>${props.cityName} · ${props.date}${props.source === "manual" ? " · segment manuel" : ""}`,
          )
          .addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is built once; data updates are pushed via the effect below
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const source = map.getSource("tracks") as GeoJSONSource | undefined;
      if (!source) return;
      const collection = toFeatureCollection(tracks);
      source.setData(collection);

      const coords = collection.features.flatMap((f: TrackLineFeature) => f.geometry.coordinates);
      if (coords.length > 0) {
        const bounds = coords.reduce(
          (b: LngLatBounds, c: [number, number]) => b.extend(c),
          new LngLatBounds(coords[0], coords[0]),
        );
        map.fitBounds(bounds as LngLatBoundsLike, { padding: 48, maxZoom: 16, duration: 0 });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [tracks]);

  return <div ref={containerRef} className="h-[520px] w-full border border-line" />;
}
