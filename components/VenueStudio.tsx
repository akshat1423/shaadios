"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import {
  Armchair,
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Droplets,
  Flame,
  Flower2,
  Gem,
  Lamp,
  Loader2,
  Maximize2,
  Mic,
  Minimize2,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  ADDABLE_IDS,
  applyEdits,
  BASE_IDS,
  COLOURS,
  ELEMENTS,
  lightness,
  resolveDecor,
  STYLES,
  VENUE_IDS,
  VENUES,
  type AddableId,
  type DecorOverrides,
  type Edit,
  type ElementId,
  type VenueId,
} from "@/lib/decor";
import type { ViewPreset } from "@/lib/venue3d";
import type { Wedding } from "@/lib/types";
import { useFlags } from "@/lib/useFlags";
import { siteById } from "@/lib/data/venueCatalog";
import { VenueCatalogue } from "./VenueCatalogue";
import { VenueScene } from "./VenueScene";

const VIEWS: [ViewPreset, string][] = [
  ["entrance", "Entrance"],
  ["stage", "Stage"],
  ["guest", "Guest seat"],
  ["aerial", "From above"],
];

const EXAMPLES = [
  "add a fountain and a flower swing",
  "dome canopy in ivory",
  "make the drapes a pink floral wall",
  "royal red and gold",
  "petal path on the aisle",
  "remove the garlands",
  "add diyas and lanterns",
  "round stage with fluted pillars",
];

const SWATCHES = [
  "ivory", "cream", "champagne", "gold", "haldi", "marigold", "saffron", "peach",
  "blush", "rose", "pink", "kumkum", "red", "maroon", "wine", "plum",
  "lavender", "sky", "royal blue", "navy", "peacock", "teal", "emerald", "mehendi",
  "sage", "mint", "brown", "charcoal",
] as const;

const ADDON_ICON: Record<AddableId, LucideIcon> = {
  arch: DoorOpen,
  jhula: Armchair,
  fountain: Droplets,
  rangoli: Flower2,
  diyas: Flame,
  lanterns: Lamp,
  chandeliers: Gem,
  photobooth: Camera,
  havan: Flame,
};

/**
 * Browsers record WebM/Opus (Chrome, Firefox) or MP4 (Safari), and Sarvam's file-type check rejects the codec-tagged
 * label. Decode the clip and re-encode it as 16 kHz mono 16-bit WAV, which every speech API accepts.
 */
async function toWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  void ctx.close();
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  pcm.forEach((v, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true));
  return new Blob([view], { type: "audio/wav" });
}

interface Reply {
  message: string;
  unresolved: string[];
  source: "claude" | "local";
  note?: string;
  /** What the family said, in their own language, when it wasn't English */
  heard?: string;
  /** The English the request was understood as, when it was translated */
  understoodAs?: string;
}

export function VenueStudio({ wedding, onPatch }: { wedding: Wedding; onPatch: (p: Partial<Wedding>) => void }) {
  const [open, setOpen] = useState(false);
  const venue = wedding.venue;

  if (!venue)
    return (
      <VenueCatalogue
        onOpen={(style, siteId) => {
          onPatch({ venue: style, venueSite: siteId, decor: {} });
          setOpen(true);
        }}
      />
    );

  const site = siteById(wedding.venueSite);
  const state = resolveDecor(venue, wedding.decor);
  const changed = Object.values(wedding.decor ?? {}).filter((v) => v && Object.keys(v).length).length;
  const added = ADDABLE_IDS.filter((id) => state[id].visible).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">(02) Venue studio</p>
        <h2 className="mt-2 text-[clamp(30px,4vw,48px)] font-bold leading-[0.98] tracking-[-0.05em]">
          {site?.name ?? VENUES[venue].name}, <span className="font-serif font-normal italic tracking-[-0.035em]">made yours.</span>
        </h2>
      </div>

      <div className="paper card-shadow max-w-3xl overflow-hidden rounded-[26px]">
        {site && (
          <div className="relative aspect-[16/7] bg-sand-deep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.image} alt={`${site.name}, ${site.city}`} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            <p className="absolute bottom-2 left-3 rounded bg-night/65 px-2 py-0.5 text-[10px] text-paper/80 backdrop-blur">
              {site.city} · Photo: {site.photo.artist || "Wikimedia Commons"}, {site.photo.licence}
            </p>
          </div>
        )}
        <div className="p-5">
        <div className="flex h-20 overflow-hidden rounded-2xl" aria-hidden>
          {(["walls", "canopy", "drapes", "flowers", "aisle", "floor"] as const).map((k) => (
            <span key={k} className="flex-1" style={{ background: state[k].color }} />
          ))}
        </div>
        <p className="mt-4 text-[14px] text-ink/65">
          {changed ? `${changed} part${changed > 1 ? "s" : ""} changed` : "Untouched so far"}
          {added ? ` · ${added} addition${added > 1 ? "s" : ""}` : ""}. Walk around it in 3D, restyle any part, add a fountain, a flower swing, a photo wall, and say what you want in your own words.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button onClick={() => setOpen(true)} className="keycap keycap-kumkum inline-flex items-center gap-2 px-6 py-4 text-[13px] font-medium">
            Open the studio <Maximize2 size={15} />
          </button>
          <button
            onClick={() => onPatch({ venue: undefined, venueSite: undefined, decor: {} })}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/50 underline-offset-4 hover:text-kumkum hover:underline"
          >
            Change venue
          </button>
        </div>
        </div>
      </div>

      {open && (
        <Studio
          key={venue}
          venue={venue}
          overrides={wedding.decor}
          onPatch={onPatch}
          onClose={() => setOpen(false)}
          identity={`wedding:${wedding.partnerA}-${wedding.partnerB}`.toLowerCase().replace(/\s+/g, "-")}
          traits={{ city: wedding.city, tradition: wedding.tradition }}
          title={site?.name}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ choose a venue */

function Picker({ onChoose }: { onChoose: (id: VenueId) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">(02) Venue studio</p>
        <h2 className="mt-2 text-[clamp(30px,4vw,48px)] font-bold leading-[0.98] tracking-[-0.05em]">
          Step inside the venue, <span className="font-serif font-normal italic tracking-[-0.035em]">then make it yours.</span>
        </h2>
        <p className="mt-3 max-w-xl text-[15px] text-ink/65">
          Pick a style to walk around in full-screen 3D. Change any part, pick a different design, add a fountain or a flower swing, or just say what you want.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {VENUE_IDS.map((id, i) => {
          const v = VENUES[id];
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26, delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              onClick={() => onChoose(id)}
              className="paper card-shadow flex flex-col rounded-[24px] p-5 text-left focus-visible:ring-2 focus-visible:ring-kumkum focus-visible:outline-none"
            >
              <div className="flex h-24 overflow-hidden rounded-2xl" aria-hidden>
                {(["walls", "canopy", "drapes", "flowers", "aisle", "floor"] as const).map((k) => (
                  <span key={k} className="flex-1" style={{ background: v.defaults[k] }} />
                ))}
              </div>
              <p className="mt-4 text-[22px] font-bold tracking-[-0.04em]">{v.name}</p>
              <p className="mt-1 text-[14px] text-ink/65">{v.tagline}</p>
              <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/45">Suits · {v.suits}</p>
              <span className="keycap keycap-kumkum mt-5 inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[12.5px] font-medium">
                Step inside <ArrowRight size={15} />
              </span>
            </motion.button>
          );
        })}
      </div>

      <p className="text-[12px] leading-relaxed text-ink/50">
        These are venue styles to design with, not specific halls. Real venues, shown on their real surroundings, come next.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ the full-screen studio */

function Studio({
  venue,
  overrides,
  onPatch,
  onClose,
  identity,
  traits,
  title,
}: {
  venue: VenueId;
  overrides?: DecorOverrides;
  onPatch: (p: Partial<Wedding>) => void;
  onClose: () => void;
  identity: string;
  traits: Record<string, string>;
  title?: string;
}) {
  const state = useMemo(() => resolveDecor(venue, overrides), [venue, overrides]);
  // Flagsmith: this wedding's flags, refreshed live (add-ons, voice, regional languages, parser, kill switch)
  const { flags, source: flagSource } = useFlags(identity, traits);

  const [selected, setSelected] = useState<ElementId | null>(null);
  const [view, setView] = useState<ViewPreset>("entrance");
  const [hover, setHover] = useState<{ el: ElementId; x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const [history, setHistory] = useState<(DecorOverrides | undefined)[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [example, setExample] = useState(0);
  const [panel, setPanel] = useState(typeof window !== "undefined" ? window.innerWidth >= 768 : true);
  const [tab, setTab] = useState<"customise" | "add">("customise");
  const [fullscreen, setFullscreen] = useState(false);
  const flash = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCustom = useRef({ el: "" as string, at: 0 });
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const voiceOn = flags.voice_input.enabled && !flags.ai_kill_switch.enabled;
  const activeTab = flags.studio_addons.enabled ? tab : "customise";

  // Speak in any Indian language: Sarvam turns the clip into text (and English), then it is applied like typed text.
  async function toggleMic() {
    if (listening) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setListening(false);
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 1500) {
          setReply({ message: "I didn't catch anything. Tap the mic, speak, then tap the square.", unresolved: [], source: "local" });
          return;
        }
        setTranscribing(true);
        setReply(null);
        try {
          const fd = new FormData();
          fd.append("file", await toWav(blob), "voice.wav");
          fd.append("identity", identity);
          const res = await fetch("/api/voice", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) {
            setReply({ message: data.error ?? "I couldn't process that recording.", unresolved: [], source: "local" });
            return;
          }
          setTranscribing(false);
          await send(data.english, { lang: data.language, heard: data.transcript });
        } catch {
          setReply({ message: "I couldn't reach the server. Try again, or type it.", unresolved: [], source: "local" });
        } finally {
          setTranscribing(false);
        }
      };
      recorder.current = mr;
      mr.start();
      setListening(true);
      setTimeout(() => mr.state === "recording" && mr.stop(), 25_000);
    } catch {
      setReply({ message: "I couldn't use the microphone. Allow microphone access in the browser and try again.", unresolved: [], source: "local" });
    }
  }

  // take over the page: no scrolling behind, Esc to leave
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) t.blur();
      else if (!document.fullscreenElement) onClose();
    };
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);

  useEffect(() => {
    const t = setInterval(() => setExample((n) => (n + 1) % EXAMPLES.length), 3500);
    return () => clearInterval(t);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // the browser refused (iframe, permissions): the studio is already full-window
    }
  };

  const commit = (next: DecorOverrides) => {
    setHistory((h) => [...h.slice(-19), overrides]);
    onPatch({ decor: next });
  };
  const applyAndCommit = (edits: Edit[]) => commit(applyEdits(overrides, edits));

  const highlight = (els: ElementId[]) => {
    if (!els.length) return;
    if (flash.current) clearTimeout(flash.current);
    const last = els[els.length - 1];
    setSelected(last);
    flash.current = setTimeout(() => setSelected((cur) => (cur === last ? null : cur)), 2400);
  };

  async function send(raw: string, opts: { lang?: string; heard?: string } = {}) {
    const q = raw.trim();
    if (!q || busy) return;
    setBusy(true);
    setReply(null);
    try {
      const res = await fetch("/api/customise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q, venue, overrides, identity, lang: opts.lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReply({ message: data.error ?? "That didn't work. Try again?", unresolved: [], source: "local" });
        return;
      }
      const edits: Edit[] = data.edits ?? [];
      if (edits.length) applyAndCommit(edits);
      setReply({
        message: data.message,
        unresolved: data.unresolved ?? [],
        source: data.source,
        note: data.note,
        heard: opts.heard,
        understoodAs: data.understoodAs ?? (opts.heard ? q : undefined),
      });
      highlight([...new Set(edits.map((e) => e.element))]);
      if (edits.length) setText("");
    } catch {
      setReply({ message: "I couldn't reach the server. Check your connection and try again.", unresolved: [], source: "local" });
    } finally {
      setBusy(false);
    }
  }

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    onPatch({ decor: prev ?? {} });
    setReply(null);
  };

  const changedCount = Object.values(overrides ?? {}).filter((v) => v && Object.keys(v).length).length;
  const sel = selected;
  const parts: ElementId[] = [...BASE_IDS, ...ADDABLE_IDS.filter((id) => state[id].visible)];
  const styleLabel = (id: ElementId) => STYLES[id]?.find((s) => s.id === state[id].style)?.label;

  const content = (
    <div className="fixed inset-0 z-50 overflow-hidden bg-night text-paper">
      {/* The venue, edge to edge */}
      <div className="absolute inset-0">
        {failed ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-paper/70">
            <div>
              <p className="text-[18px] font-semibold text-paper">3D isn't available in this browser.</p>
              <p className="mt-2 text-[13px]">WebGL is switched off or unsupported ({failed}). Try Chrome, Safari or Firefox with hardware acceleration on.</p>
            </div>
          </div>
        ) : (
          <VenueScene
            venue={venue}
            state={state}
            selected={sel}
            view={view}
            onPick={(el) => {
              setSelected(el);
              if (el) {
                setTab("customise");
                setPanel(true);
              }
            }}
            onHover={(el, x, y) => setHover(el ? { el, x, y } : null)}
            onFail={setFailed}
          />
        )}
      </div>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-2 p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-xl bg-night/70 px-3.5 py-2.5 text-[13px] font-medium backdrop-blur hover:bg-night/90">
            <ChevronLeft size={16} /> Back to plan
          </button>
          <span className="hidden rounded-xl bg-night/60 px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper/70 backdrop-blur sm:block">
            {title ?? VENUES[venue].name}
          </span>
          <span
            className="hidden items-center gap-1.5 rounded-xl bg-night/60 px-3 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-paper/60 backdrop-blur lg:flex"
            title="Feature flags from Flagsmith. Flip one in the Flagsmith dashboard and this studio changes within seconds."
          >
            <span className={clsx("h-1.5 w-1.5 rounded-full", flagSource === "flagsmith" ? "bg-mehendi" : "bg-paper/35")} />
            Flagsmith {flagSource === "flagsmith" ? "live" : "defaults"}
            {flags.ai_kill_switch.enabled ? " · AI off" : ` · ${String(flags.nl_parser.value ?? "claude")}`}
          </span>
        </div>

        <div className="pointer-events-auto flex rounded-xl bg-night/70 p-1 backdrop-blur" role="group" aria-label="Camera views">
          {VIEWS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={clsx("rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors", view === key ? "bg-paper text-ink" : "text-paper/70 hover:text-paper")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pointer-events-auto flex items-center gap-1 rounded-xl bg-night/70 p-1 backdrop-blur">
          <button onClick={undo} disabled={history.length === 0} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[12px] text-paper/80 hover:bg-paper/10 disabled:opacity-30" aria-label="Undo last change">
            <Undo2 size={14} /> Undo
          </button>
          <button
            onClick={() => {
              commit({});
              setSelected(null);
              setReply(null);
            }}
            disabled={changedCount === 0}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[12px] text-paper/80 hover:bg-paper/10 disabled:opacity-30"
            aria-label="Reset everything to the venue's defaults"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={toggleFullscreen} className="rounded-lg p-2 text-paper/80 hover:bg-paper/10" aria-label={fullscreen ? "Leave full screen" : "Go full screen"}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Left panel: parts, designs, additions */}
      <AnimatePresence initial={false}>
        {panel && (
          <motion.aside
            key="panel"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-[8.5rem] left-3 top-[4.5rem] z-10 flex w-[min(340px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-3xl border border-paper/10 bg-night/80 shadow-2xl backdrop-blur-xl sm:left-4"
          >
            <div className="flex gap-1 p-2">
              {(
                [
                  ["customise", "Customise"],
                  ["add", `Add${ADDABLE_IDS.some((id) => state[id].visible) ? ` · ${ADDABLE_IDS.filter((id) => state[id].visible).length}` : ""}`],
                ] as const
              )
                .filter(([k]) => k === "customise" || flags.studio_addons.enabled)
                .map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={clsx("flex-1 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors", activeTab === k ? "bg-paper text-ink" : "text-paper/70 hover:bg-paper/10")}
                >
                  {label}
                </button>
              ))}
              <button onClick={() => setPanel(false)} className="rounded-xl p-2 text-paper/60 hover:bg-paper/10" aria-label="Hide the panel">
                <ChevronLeft size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {activeTab === "add" ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {ADDABLE_IDS.map((id) => {
                    const Icon = ADDON_ICON[id];
                    const on = state[id].visible;
                    return (
                      <div key={id} className={clsx("flex flex-col rounded-2xl border p-3", on ? "border-marigold/60 bg-marigold/10" : "border-paper/10 bg-paper/5")}>
                        <Icon size={20} className={on ? "text-marigold" : "text-paper/60"} aria-hidden />
                        <p className="mt-2 text-[13.5px] font-semibold leading-tight">{ELEMENTS[id].label}</p>
                        <p className="mt-1 flex-1 text-[11.5px] leading-snug text-paper/50">{ELEMENTS[id].hint}</p>
                        <button
                          onClick={() => {
                            if (on) applyAndCommit([{ element: id, visible: false }]);
                            else {
                              applyAndCommit([{ element: id, visible: true }]);
                              setSelected(id);
                              setTab("customise");
                            }
                          }}
                          className={clsx(
                            "mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium",
                            on ? "bg-paper/10 text-paper/80 hover:bg-paper/20" : "bg-paper text-ink hover:bg-marigold",
                          )}
                        >
                          {on ? <><Check size={13} /> Added · remove</> : <><Plus size={13} /> Add</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {sel && (
                      <motion.div
                        key={sel}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mb-3 rounded-2xl border border-paper/10 bg-paper/5 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[14px] font-semibold">{ELEMENTS[sel].label}</p>
                              <p className="text-[11.5px] text-paper/50">{ELEMENTS[sel].hint}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="rounded-md p-1 text-paper/50 hover:bg-paper/10" aria-label="Close">
                              <X size={14} />
                            </button>
                          </div>

                          {STYLES[sel] && (
                            <>
                              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/45">Design</p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {STYLES[sel]!.map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() => applyAndCommit([{ element: sel, style: s.id }])}
                                    aria-pressed={state[sel].style === s.id}
                                    className={clsx(
                                      "rounded-full px-3 py-1.5 text-[12.5px] transition-colors",
                                      state[sel].style === s.id ? "bg-paper font-semibold text-ink" : "bg-paper/10 text-paper/80 hover:bg-paper/20",
                                    )}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}

                          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/45">Colour</p>
                          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                            {SWATCHES.map((name) => {
                              const hex = COLOURS[name];
                              const active = state[sel].color.toLowerCase() === hex.toLowerCase();
                              return (
                                <button
                                  key={name}
                                  title={name}
                                  aria-label={`Set ${ELEMENTS[sel].label} to ${name}`}
                                  onClick={() => applyAndCommit([{ element: sel, color: hex }])}
                                  className={clsx(
                                    "flex aspect-square items-center justify-center rounded-full ring-1 ring-paper/20 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-marigold focus-visible:outline-none",
                                    active && "scale-110 ring-2 ring-paper",
                                  )}
                                  style={{ background: hex }}
                                >
                                  {active && <Check size={11} className={lightness(hex) > 0.6 ? "text-ink" : "text-paper"} />}
                                </button>
                              );
                            })}
                          </div>
                          <label className="mt-2.5 flex items-center gap-2 text-[12px] text-paper/60">
                            Any colour
                            <input
                              type="color"
                              value={state[sel].color}
                              onChange={(e) => {
                                const now = Date.now();
                                const edit: Edit[] = [{ element: sel, color: e.target.value }];
                                // dragging the picker fires many changes; keep them as one undo step
                                if (lastCustom.current.el === sel && now - lastCustom.current.at < 1200) onPatch({ decor: applyEdits(overrides, edit) });
                                else applyAndCommit(edit);
                                lastCustom.current = { el: sel, at: now };
                              }}
                              className="h-7 w-10 cursor-pointer rounded border border-paper/20 bg-transparent"
                            />
                          </label>

                          {ELEMENTS[sel].hideable && (
                            <button
                              onClick={() => {
                                applyAndCommit([{ element: sel, visible: false }]);
                                setSelected(null);
                              }}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-paper/10 px-2.5 py-1.5 text-[12px] text-paper/80 hover:bg-kumkum/80 hover:text-paper"
                            >
                              <Trash2 size={13} /> Remove from the venue
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="px-1 pb-1.5 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/45">
                    Parts{changedCount ? ` · ${changedCount} changed` : ""} <span className="normal-case tracking-normal">· click one here or in the venue</span>
                  </p>
                  <ul className="space-y-0.5">
                    {parts.map((id) => {
                      const s = state[id];
                      const on = sel === id;
                      return (
                        <li key={id}>
                          <button
                            onClick={() => setSelected(on ? null : id)}
                            aria-pressed={on}
                            className={clsx("flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors", on ? "bg-paper/15" : "hover:bg-paper/8")}
                          >
                            <span className={clsx("h-6 w-6 shrink-0 rounded-full ring-1 ring-paper/25", !s.visible && "opacity-30")} style={{ background: s.color }} aria-hidden />
                            <span className={clsx("min-w-0 flex-1 truncate text-[13.5px]", on ? "font-semibold" : "text-paper/85", !s.visible && "line-through opacity-50")}>
                              {ELEMENTS[id].label}
                            </span>
                            {styleLabel(id) && <span className="shrink-0 rounded-full bg-paper/10 px-2 py-0.5 text-[10.5px] text-paper/60">{styleLabel(id)}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!panel && (
        <button
          onClick={() => setPanel(true)}
          className="absolute left-3 top-[4.5rem] z-10 inline-flex items-center gap-1.5 rounded-xl bg-night/75 px-3 py-2.5 text-[13px] font-medium backdrop-blur hover:bg-night sm:left-4"
        >
          <ChevronRight size={15} /> Parts and additions
        </button>
      )}

      {/* Hover label */}
      <AnimatePresence>
        {hover && (
          <motion.div
            key="tip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none fixed z-20 -translate-x-1/2 rounded-full bg-paper px-3 py-1 text-[12px] font-semibold text-ink shadow-lg"
            style={{ left: hover.x, top: hover.y - 36 }}
          >
            {ELEMENTS[hover.el].label}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="pointer-events-none absolute bottom-[7.2rem] right-4 z-10 hidden rounded-lg bg-night/55 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/55 backdrop-blur md:block">
        Drag to look · scroll to zoom · click a part
      </p>

      {/* Say what to change */}
      <div className="absolute inset-x-3 bottom-3 z-10 mx-auto max-w-3xl sm:inset-x-4">
        <AnimatePresence mode="wait">
          {(busy || reply || listening || transcribing) && (
            <motion.div
              key={listening ? "listening" : transcribing ? "transcribing" : busy ? "busy" : reply?.message}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="mb-2 rounded-2xl bg-night/85 px-4 py-3 backdrop-blur"
              role="status"
            >
              {listening || transcribing || busy ? (
                <p className="flex items-center gap-2 text-[13.5px] text-paper/80">
                  {listening ? <Mic size={15} className="animate-pulse text-kumkum" /> : <Loader2 size={15} className="animate-spin" />}
                  {listening ? "Listening… speak in any Indian language, tap the square when you are done." : transcribing ? "Listening to what you said…" : "Working out what to change…"}
                </p>
              ) : (
                reply && (
                  <>
                    {reply.heard && <p className="mb-1 text-[13px] text-paper/60">You said: <span className="text-paper/90">“{reply.heard}”</span></p>}
                    {!reply.heard && reply.understoodAs && <p className="mb-1 text-[12.5px] text-paper/50">Understood as: “{reply.understoodAs}”</p>}
                    <p className="text-[14px] font-medium">{reply.message}</p>
                    {reply.unresolved.map((u) => (
                      <p key={u} className="mt-1 text-[12.5px] text-marigold">{u}</p>
                    ))}
                    <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/45">
                      <span className={clsx("h-1.5 w-1.5 rounded-full", reply.source === "claude" ? "bg-mehendi" : "bg-paper/40")} />
                      {reply.source === "claude" ? "Understood by Claude" : "Basic parser"}
                      {reply.note && <span className="normal-case tracking-normal text-paper/45">· {reply.note}</span>}
                    </p>
                  </>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!busy && !reply && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {EXAMPLES.slice(0, 4).map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setText(ex);
                  send(ex);
                }}
                className="rounded-full bg-night/70 px-3 py-1.5 text-[12px] text-paper/80 backdrop-blur transition-colors hover:bg-night"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="night-card flex items-center gap-2 rounded-[22px] border border-paper/10 p-2 pl-4 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)] focus-within:border-marigold/60"
        >
          <Sparkles size={16} className="shrink-0 text-marigold" aria-hidden />
          {voiceOn && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={busy || transcribing}
              aria-label={listening ? "Stop recording" : "Speak your change in any Indian language"}
              title="Speak in Hindi, Tamil, Telugu, Bengali, Marathi… (Sarvam AI)"
              className={clsx(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                listening ? "animate-pulse bg-kumkum text-paper" : "bg-paper/10 text-paper/80 hover:bg-paper/20",
              )}
            >
              {listening ? <Square size={13} fill="currentColor" /> : <Mic size={16} />}
            </button>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={240}
            placeholder={`Say what to change… "${EXAMPLES[example]}"`}
            aria-label="Describe what you want changed in the venue"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[14.5px] text-paper outline-none placeholder:text-paper/35"
          />
          <button type="submit" disabled={busy || !text.trim()} className="keycap keycap-kumkum inline-flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />} Change
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
