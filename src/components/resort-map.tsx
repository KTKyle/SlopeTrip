"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { Bot, MapPin, Search, Send, SlidersHorizontal, Snowflake, Sparkles, X } from "lucide-react";
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
const quickPrompts = ["What gear should I bring?", "Estimate my trip cost", "Which resort fits me?"];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function ResortMap({ resorts }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const leafletMapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markerRefs = useRef<Map<string, Leaflet.Marker>>(new Map());
  const selectedIdRef = useRef<string | null>(null);
  const previousSelectedIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ability, setAbility] = useState<AbilityLevel>("intermediate");
  const [region, setRegion] = useState<ResortRegion | "all">("all");
  const [mapReady, setMapReady] = useState(false);
  const resortById = useMemo(() => new Map(resorts.map((resort) => [resort.id, resort])), [resorts]);
  const selected = selectedId ? resortById.get(selectedId) : undefined;
  const selectedResortId = selected?.id;

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

  const selectResort = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const closeSelectedResort = useCallback(() => {
    setSelectedId(null);
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

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
    markerRefs.current.clear();

    filtered.forEach((resort) => {
      const marker = L.marker([resort.latitude, resort.longitude], {
        icon: createResortIcon(L, resort.state, selectedIdRef.current === resort.id),
        title: resort.name,
      });

      marker.on("click", () => selectResort(resort.id));
      marker.bindPopup(
        `<strong>${escapeHtml(resort.name)}</strong><br>${escapeHtml(resort.state)} - ${resort.condition.snowfall7DayIn}&quot; 7-day snowfall`,
      );
      marker.addTo(markerLayer);
      markerRefs.current.set(resort.id, marker);
    });

    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.map((resort) => [resort.latitude, resort.longitude]));
      map.fitBounds(bounds, { padding: [42, 42], maxZoom: 6 });
    }
  }, [filtered, mapReady, selectResort]);

  useEffect(() => {
    const L = leafletRef.current;
    if (!mapReady || !L) return;

    const previousSelectedId = previousSelectedIdRef.current;
    if (previousSelectedId && previousSelectedId !== selectedId) {
      const previousResort = resortById.get(previousSelectedId);
      const previousMarker = markerRefs.current.get(previousSelectedId);
      if (previousResort && previousMarker) {
        previousMarker.setIcon(createResortIcon(L, previousResort.state, false));
      }
    }

    if (selectedId) {
      const nextResort = resortById.get(selectedId);
      const nextMarker = markerRefs.current.get(selectedId);
      if (nextResort && nextMarker) {
        nextMarker.setIcon(createResortIcon(L, nextResort.state, true));
      }
    }

    previousSelectedIdRef.current = selectedId;
  }, [mapReady, resortById, selectedId]);

  return (
    <section className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-3 px-3 py-3 lg:h-[calc(100vh-4rem)] lg:grid-cols-[300px_minmax(0,1fr)_340px] lg:overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      <FilterPanel
        ability={ability}
        onAbilityChange={setAbility}
        onQueryChange={setQuery}
        onRegionChange={setRegion}
        onSelect={selectResort}
        region={region}
        resorts={filtered}
        selectedId={selectedId}
      />

      <div className="slopetrip-map-frame relative min-h-[560px] overflow-hidden rounded-lg border border-white/70 bg-map lg:min-h-0">
        <div ref={mapRef} className="absolute inset-0" />
        <div className="absolute left-4 top-4 z-[500] rounded-md border border-white/70 bg-white/86 px-3 py-2 text-sm font-semibold text-[color:var(--pine)] shadow-sm backdrop-blur">
          Explore Resorts
        </div>
        <div className="pointer-events-none absolute bottom-7 left-4 z-[500] rounded-md bg-white/86 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
          Leaflet map with OpenStreetMap tiles
        </div>
        {selected && (
          <div className="slopetrip-panel absolute right-4 top-4 z-[500] max-h-[calc(100%-2rem)] w-[min(360px,calc(100%-2rem))] overflow-y-auto rounded-lg border shadow-xl">
            <div
              className="h-32 bg-cover bg-center"
              style={{ backgroundImage: `url(${selected.imageUrl})` }}
            />
            <button
              type="button"
              aria-label="Close resort details"
              onClick={closeSelectedResort}
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-md border border-border bg-background/90 text-muted-foreground shadow-sm transition hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <div className="flex flex-col gap-3 p-4">
              <div>
                <Badge variant="signal">{selected.region}</Badge>
                <h2 className="mt-2 text-xl font-semibold text-[color:var(--pine)]">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selected.state} - {selected.acres.toLocaleString()} skiable acres - {selected.trails} trails
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Snowfall" value={`${selected.condition.snowfall7DayIn}"`} />
                <Metric label="Ticket" value={`$${selected.ticketEstimateUsd}`} />
                <Metric label="Rentals" value={`$${selected.rentalEstimateUsd}`} />
              </div>
              <div className="space-y-2">
                {levels.map((level) => (
                  <div key={level} className="grid grid-cols-[82px_1fr_38px] items-center gap-2 text-xs">
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
                <Button className="w-full bg-[linear-gradient(135deg,var(--signal),#ff9b52)] text-signal-foreground hover:opacity-95">Plan a trip for me</Button>
              </a>
            </div>
          </div>
        )}
      </div>

      <TripAssistant
        ability={ability}
        query={query}
        region={region}
        selectedResortId={selectedResortId}
      />
    </section>
  );
}

const FilterPanel = memo(function FilterPanel({
  ability,
  onAbilityChange,
  onQueryChange,
  onRegionChange,
  onSelect,
  region,
  resorts,
  selectedId,
}: {
  ability: AbilityLevel;
  onAbilityChange: (ability: AbilityLevel) => void;
  onQueryChange: (query: string) => void;
  onRegionChange: (region: ResortRegion | "all") => void;
  onSelect: (id: string) => void;
  region: ResortRegion | "all";
  resorts: Resort[];
  selectedId: string | null;
}) {
  const [localQuery, setLocalQuery] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => onQueryChange(localQuery), 140);
    return () => window.clearTimeout(timeout);
  }, [localQuery, onQueryChange]);

  return (
    <aside className="slopetrip-panel flex min-h-0 flex-col gap-3 overflow-hidden rounded-lg border p-4">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Snowflake className="size-3.5 text-[color:var(--glacier)]" />
          Tell us your ski style
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-[color:var(--pine)]">Find the mountain that fits.</h1>
      </div>
      <label className="relative flex items-center gap-2 rounded-md border border-input bg-white/78 px-3 shadow-[inset_0_1px_0_rgb(255_255_255_/_70%)]">
        <Search className="size-4 text-muted-foreground" />
        <Input
          className="border-0 px-0 shadow-none focus-visible:ring-0"
          placeholder="Search resorts"
          value={localQuery}
          onChange={(event) => setLocalQuery(event.target.value)}
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
              className={ability === level ? "bg-[linear-gradient(135deg,var(--primary),#0a6c7f)]" : "bg-white/70"}
              onClick={() => onAbilityChange(level)}
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
                "rounded-md border px-2.5 py-1.5 text-xs font-medium capitalize shadow-sm transition",
                region === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white/66 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              onClick={() => onRegionChange(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <ResortList resorts={resorts} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </aside>
  );
});

const ResortList = memo(function ResortList({
  resorts,
  selectedId,
  onSelect,
}: {
  resorts: Resort[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {resorts.map((resort) => (
        <button
          key={resort.id}
          type="button"
          onClick={() => onSelect(resort.id)}
          className={cn(
            "slopetrip-resort-row slopetrip-ticket-edge rounded-md border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50",
            selectedId === resort.id
              ? "border-primary bg-primary/10 shadow-[0_12px_28px_rgb(7_63_75_/_13%)]"
              : "border-border bg-white/72",
          )}
        >
          <span className="block text-sm font-semibold text-[color:var(--pine)]">{resort.name}</span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Snowflake className="size-3.5 text-[color:var(--glacier)]" />
            {resort.state} - {resort.condition.snowfall7DayIn}&quot; 7-day snowfall
          </span>
        </button>
      ))}
    </div>
  );
});

const TripAssistant = memo(function TripAssistant({
  ability,
  query,
  region,
  selectedResortId,
}: {
  ability: AbilityLevel;
  query: string;
  region: ResortRegion | "all";
  selectedResortId?: string;
}) {
  const [localInput, setLocalInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me about gear, costs, travel timing, or which mountain best fits your ski style.",
    },
  ]);
  const [isChatPending, setIsChatPending] = useState(false);
  const [chatConfidence, setChatConfidence] = useState<"demo" | "model">("demo");

  async function submitMessage(message: string) {
    const content = message.trim();
    if (!content || isChatPending) return;

    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLocalInput("");
    setIsChatPending(true);

    try {
      const response = await fetch("/api/trips/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-8),
          selectedResortId,
          abilityLevel: ability,
          region,
          query,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = (await response.json()) as { answer: string; confidence: "demo" | "model" };
      setChatConfidence(data.confidence);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I could not reach the trip assistant right now. Try again in a moment, or use the planner for a deterministic resort recommendation.",
        },
      ]);
    } finally {
      setIsChatPending(false);
    }
  }

  return (
    <aside className="slopetrip-panel flex min-h-[520px] flex-col overflow-hidden rounded-lg border lg:min-h-0">
      <div className="border-b border-border/70 bg-[linear-gradient(135deg,rgb(7_63_75_/_6%),rgb(120_212_232_/_13%))] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[linear-gradient(135deg,var(--primary),#0a6c7f)] text-primary-foreground shadow-sm">
              <Bot className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[color:var(--pine)]">Gemini trip assistant</h2>
              <p className="text-xs text-muted-foreground">Gear, costs, travel, recommendations</p>
            </div>
          </div>
          <Badge variant={chatConfidence === "model" ? "signal" : "outline"}>
            {chatConfidence === "model" ? "Gemini" : "Demo"}
          </Badge>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              "slopetrip-chat-message rounded-md px-3 py-2 text-sm leading-6",
              message.role === "user"
                ? "ml-8 bg-[linear-gradient(135deg,var(--primary),#0a6375)] text-primary-foreground shadow-sm"
                : "mr-8 border border-border/80 bg-white/76 text-foreground shadow-sm",
            )}
          >
            {message.content}
          </div>
        ))}
        {isChatPending && (
          <div className="mr-8 flex items-center gap-2 rounded-md border border-border bg-white/76 px-3 py-2 text-sm text-muted-foreground shadow-sm">
            <Sparkles className="size-4 animate-pulse" />
            Thinking through the trip details...
          </div>
        )}
      </div>
      <div className="border-t border-border/70 bg-white/52 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
            key={prompt}
            type="button"
              onClick={() => submitMessage(prompt)}
              className="rounded-md border border-border bg-white/72 px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/50 hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitMessage(localInput);
          }}
        >
          <textarea
            value={localInput}
            onChange={(event) => setLocalInput(event.target.value)}
            placeholder="Ask about costs, gear, or timing"
            rows={2}
            className="min-h-11 flex-1 resize-none rounded-md border border-input bg-white/78 px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button className="bg-[linear-gradient(135deg,var(--signal),#ff9b52)] text-signal-foreground hover:opacity-95" type="submit" size="icon" disabled={isChatPending || !localInput.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </aside>
  );
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="slopetrip-snowcap rounded-md border border-border p-3 shadow-sm">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function createResortIcon(L: typeof Leaflet, state: string, isSelected: boolean) {
  return L.divIcon({
    className: "",
    html: `<span class="slopetrip-map-pin ${
      isSelected ? "slopetrip-map-pin-selected" : ""
    }">${escapeHtml(state)}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
