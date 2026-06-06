"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import type { AbilityLevel, Resort, ResortRegion } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  resorts: Resort[];
};

const levels: AbilityLevel[] = ["beginner", "intermediate", "expert"];
const regions: Array<ResortRegion | "all"> = ["all", "northeast", "midwest", "rockies", "west", "pacific"];

export function ResortMap({ resorts }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const leafletMapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [selectedId, setSelectedId] = useState(resorts[0]?.id);
  const [query, setQuery] = useState("");
  const [ability, setAbility] = useState<AbilityLevel>("intermediate");
  const [region, setRegion] = useState<ResortRegion | "all">("all");
  const [mapReady, setMapReady] = useState(false);
  const selected = resorts.find((resort) => resort.id === selectedId) ?? resorts[0];

  const filtered = useMemo(
    () =>
      resorts.filter((resort) => {
        const matchesQuery = `${resort.name} ${resort.state}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesRegion = region === "all" || resort.region === region;
        return matchesQuery && matchesRegion;
      }),
    [query, region, resorts],
  );

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    let isMounted = true;

    async function createMap() {
      const L = await import("leaflet");
      if (!isMounted || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [39.5, -98.35],
        zoom: 4,
        minZoom: 3,
        maxZoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      leafletRef.current = L;
      markerLayerRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
      setMapReady(true);
    }

    createMap();

    return () => {
      isMounted = false;
      setMapReady(false);
      leafletMapRef.current?.remove();
      leafletRef.current = null;
      leafletMapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = leafletMapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!mapReady || !L || !map || !markerLayer) return;

    markerLayer.clearLayers();

    filtered.forEach((resort) => {
      const marker = L.marker([resort.latitude, resort.longitude], {
        icon: L.divIcon({
          className: "",
          html: `<span class="slopetrip-map-pin ${
            selectedId === resort.id ? "slopetrip-map-pin-selected" : ""
          }">${resort.state}</span>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
        title: resort.name,
      });

      marker.on("click", () => setSelectedId(resort.id));
      marker.bindPopup(
        `<strong>${escapeHtml(resort.name)}</strong><br>${escapeHtml(resort.state)} - ${resort.condition.snowfall7DayIn}&quot; 7-day snowfall`,
      );
      marker.addTo(markerLayer);
    });

    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.map((resort) => [resort.latitude, resort.longitude]));
      map.fitBounds(bounds, { padding: [42, 42], maxZoom: 6 });
    }
  }, [filtered, selectedId, mapReady]);

  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)_340px] lg:px-6">
      <aside className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Tell us your ski style</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Find the mountain that fits the trip.</h1>
        </div>
        <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            className="border-0 px-0 shadow-none focus-visible:ring-0"
            placeholder="Search resorts"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Level</span>
          <div className="grid grid-cols-3 gap-2">
            {levels.map((level) => (
              <Button
                key={level}
                type="button"
                variant={ability === level ? "default" : "outline"}
                size="sm"
                onClick={() => setAbility(level)}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4" />
            Region
          </span>
          <div className="flex flex-wrap gap-2">
            {regions.map((item) => (
              <button
                key={item}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs font-medium capitalize transition",
                  region === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setRegion(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden">
          {filtered.map((resort) => (
            <button
              key={resort.id}
              type="button"
              onClick={() => setSelectedId(resort.id)}
              className={cn(
                "rounded-md border p-3 text-left transition",
                selected?.id === resort.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/50",
              )}
            >
              <span className="block text-sm font-semibold">{resort.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {resort.state} - {resort.condition.snowfall7DayIn}&quot; 7-day snowfall
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-border bg-map shadow-sm">
        <div ref={mapRef} className="absolute inset-0" />
        <div className="absolute left-4 top-4 rounded-md border border-border bg-background/90 px-3 py-2 text-sm shadow-sm backdrop-blur">
          Explore Resorts
        </div>
        <div className="pointer-events-none absolute bottom-7 left-4 rounded-md bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
          Leaflet map with OpenStreetMap tiles
        </div>
      </div>

      {selected && (
        <aside className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div
            className="h-44 bg-cover bg-center"
            style={{ backgroundImage: `url(${selected.imageUrl})` }}
          />
          <div className="flex flex-col gap-4 p-5">
            <div>
              <Badge variant="signal">{selected.region}</Badge>
              <h2 className="mt-3 text-2xl font-semibold">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selected.state} - {selected.acres.toLocaleString()} skiable acres - {selected.trails} trails
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Metric label="7-day snowfall" value={`${selected.condition.snowfall7DayIn}"`} />
              <Metric label="Ticket estimate" value={`$${selected.ticketEstimateUsd}`} />
              <Metric label="Drive time" value="Estimate" />
            </div>
            <div className="space-y-2">
              {levels.map((level) => (
                <div key={level} className="grid grid-cols-[92px_1fr_42px] items-center gap-2 text-xs">
                  <span className="capitalize text-muted-foreground">{level}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-secondary">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        level === ability ? "bg-primary" : "bg-muted-foreground/50",
                      )}
                      style={{ width: `${selected.difficulty[level]}%` }}
                    />
                  </span>
                  <span className="text-right font-medium">{selected.difficulty[level]}%</span>
                </div>
              ))}
            </div>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {selected.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  {highlight}
                </li>
              ))}
            </ul>
            <a href="/plan">
              <Button className="w-full">Plan a trip for me</Button>
            </a>
          </div>
        </aside>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
