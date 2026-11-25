"use client";

import { useState } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import { ArrowRight, MapPin } from "lucide-react";
import { VENUE_SITES } from "@/lib/data/venueCatalog";
import { VENUE_IDS, VENUES, type VenueId } from "@/lib/decor";

const STYLE_LABEL: Record<VenueId, string> = { palace: "Palace courtyard", garden: "Garden lawn", banquet: "Grand hall" };

/** Real venues as a photo catalogue. "Open studio" opens the 3D studio in the matching style. */
export function VenueCatalogue({ onOpen }: { onOpen: (style: VenueId, siteId?: string) => void }) {
  const [filter, setFilter] = useState<VenueId | "all">("all");
  const sites = VENUE_SITES.filter((s) => filter === "all" || s.style === filter);

  return (
    <div className="space-y-7">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">(02) Venues</p>
        <h2 className="mt-2 text-[clamp(30px,4vw,48px)] font-bold leading-[0.98] tracking-[-0.05em]">
          Pick a place, <span className="font-serif font-normal italic tracking-[-0.035em]">then design it.</span>
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] text-ink/65">
          Palaces and heritage hotels across India. Choose one and open the studio to restyle the decor in 3D: colours, designs, a fountain, a flower swing, or just say what you want.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by kind of venue">
        {(["all", ...VENUE_IDS] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={clsx("rounded-full px-4 py-2 text-[13.5px] transition-colors", filter === k ? "bg-night text-paper" : "bg-ink/6 text-ink/75 hover:bg-ink/10")}
          >
            {k === "all" ? "All venues" : STYLE_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {sites.map((s, i) => (
          <motion.article
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 250, damping: 26, delay: Math.min(i, 8) * 0.04 }}
            className="paper card-shadow flex flex-col overflow-hidden rounded-[24px]"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-sand-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={`${s.name}, ${s.city}`} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
              <span className="absolute left-3 top-3 rounded-full bg-night/75 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-paper backdrop-blur">{STYLE_LABEL[s.style]}</span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-[22px] font-bold leading-tight tracking-[-0.04em]">{s.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-ink/60"><MapPin size={13} /> {s.city}</p>
              <p className="mt-3 flex-1 text-[14px] leading-snug text-ink/70">{s.blurb}</p>
              <button onClick={() => onOpen(s.style, s.id)} className="keycap keycap-kumkum mt-4 inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[12.5px] font-medium">
                Open studio <ArrowRight size={15} />
              </button>
              <p className="mt-3 text-[10.5px] leading-snug text-ink/40">
                Photo: {s.photo.artist || "Wikimedia Commons"}, {s.photo.licence},{" "}
                <a href={s.photo.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">Wikimedia Commons</a> ·{" "}
                <a href={s.page} target="_blank" rel="noreferrer" className="underline underline-offset-2">Wikipedia</a>
              </p>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-ink/20 p-4">
        <p className="text-[13.5px] text-ink/60">
          The 3D studio is a stylised venue of the same kind, not a scan of the building. Prefer to begin from scratch?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {VENUE_IDS.map((id) => (
            <button key={id} onClick={() => onOpen(id)} className="rounded-full bg-ink/6 px-4 py-2 text-[13px] text-ink/80 hover:bg-ink/10">
              Blank {VENUES[id].name.toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
