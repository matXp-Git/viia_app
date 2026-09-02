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

export type DumpFeatureProps = {
  reference: string;
  cityName: string;
  date: string;
  lat: number;
  lng: number;
};

export type DumpFeature = {
  properties: DumpFeatureProps;
  coordinate: [number, number];
};

type TrackLineFeature = {
  type: "Feature";
  properties: TrackFeatureProps;
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

type DumpPointFeature = {
  type: "Feature";
  properties: DumpFeatureProps;
  geometry: { type: "Point"; coordinates: [number, number] };
};

type FeatureCollectionOf<F> = { type: "FeatureCollection"; features: F[] };

// Default view when there's nothing to show yet — Lambersart, the spec's
// own example city, rather than an arbitrary world view.
const DEFAULT_CENTER: [number, number] = [3.0287, 50.6572];
const DEFAULT_ZOOM = 11;

function resolveToken(name: string): string {
  if (typeof window === "undefined") return "#000000";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function toTrackCollection(tracks: TrackFeature[]): FeatureCollectionOf<TrackLineFeature> {
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

function toDumpCollection(dumps: DumpFeature[]): FeatureCollectionOf<DumpPointFeature> {
  return {
    type: "FeatureCollection",
    features: dumps.map((d) => ({
      type: "Feature",
      properties: d.properties,
      geometry: { type: "Point", coordinates: d.coordinate },
    })),
  };
}

export function TrackMap({ tracks, dumps = [] }: { tracks: TrackFeature[]; dumps?: DumpFeature[] }) {
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
      map.addSource("tracks", { type: "geojson", data: toTrackCollection(tracks) });
      map.addSource("dumps", { type: "geojson", data: toDumpCollection(dumps) });

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

      map.addLayer({
        id: "dumps-point",
        type: "circle",
        source: "dumps",
        paint: {
          "circle-radius": 7,
          "circle-color": resolveToken("--color-warning"),
          "circle-stroke-width": 2,
          "circle-stroke-color": resolveToken("--color-trace-outline"),
        },
      });

      const clickableLayers = ["tracks-line", "dumps-point"];

      map.on("mouseenter", clickableLayers, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", clickableLayers, () => {
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
      map.on("click", "dumps-point", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const props = feature.properties as DumpFeatureProps;
        popup
          .setLngLat(event.lngLat)
          .setHTML(
            `<strong>Dépôt sauvage</strong><br/>${props.reference} · ${props.cityName} · ${props.date}<br/>${props.lat.toFixed(5)}, ${props.lng.toFixed(5)}`,
          )
          .addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is built once; data updates are pushed via the effects below
  }, []);

  function fitToData(map: MapLibreMap) {
    const trackSource = map.getSource("tracks") as GeoJSONSource | undefined;
    const dumpSource = map.getSource("dumps") as GeoJSONSource | undefined;
    if (!trackSource || !dumpSource) return;

    const trackCoords = toTrackCollection(tracks).features.flatMap((f) => f.geometry.coordinates);
    const dumpCoords = toDumpCollection(dumps).features.map((f) => f.geometry.coordinates);
    const allCoords = [...trackCoords, ...dumpCoords];
    if (allCoords.length === 0) return;

    const bounds = allCoords.reduce(
      (b: LngLatBounds, c: [number, number]) => b.extend(c),
      new LngLatBounds(allCoords[0], allCoords[0]),
    );
    map.fitBounds(bounds as LngLatBoundsLike, { padding: 48, maxZoom: 16, duration: 0 });
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const source = map.getSource("tracks") as GeoJSONSource | undefined;
      if (!source) return;
      const collection = toTrackCollection(tracks);
      source.setData(collection);
      fitToData(map);
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const source = map.getSource("dumps") as GeoJSONSource | undefined;
      if (!source) return;
      source.setData(toDumpCollection(dumps));
      fitToData(map);
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dumps]);

  return <div ref={containerRef} className="h-[520px] w-full border border-line" />;
}
