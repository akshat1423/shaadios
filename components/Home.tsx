"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import { CITIES } from "@/lib/data/cities";
import { daysBetween } from "@/lib/dates";
import type { Wedding } from "@/lib/types";
import { DateTab } from "./DateTab";
import { CardStage } from "./CardStage";
import { Toran } from "./Toran";
import { InviteStudio } from "./InviteStudio";
import { VenueStudio } from "./VenueStudio";

const TABS = [
  ["date", "Date"],
  ["venue", "Venue"],
  ["budget", "Budget"],
  ["guests", "Guests"],
  ["invites", "Invites"],
] as const;
type Tab = (typeof TABS)[number][0];

const NEXT: Record<Exclude<Tab, "date" | "venue" | "invites">, { n: string; title: string; body: string }> = {
  budget: { n: "03", title: "Budget", body: "A city-sized template, live spend against plan, and who is paying for what." },
  guests: { n: "04", title: "Guests", body: "Add a household in one line. Sides, diet, rooms and pickups, with a live headcount per event." },
};

export function Home({ wedding, onPatch, onReset }: { wedding: Wedding; onPatch: (p: Partial<Wedding>) => void; onReset: () => void }) {
  const [tab, setTab] = useState<Tab>("date");
  const [flipped, setFlipped] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const countdown = wedding.lockedDate ? daysBetween(today, wedding.lockedDate) : null;

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <p className="text-[27px] tracking-[-0.045em]">
            <span className="font-bold">shaadi</span> <span className="font-serif italic tracking-[-0.03em]">os</span>
          </p>
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50 sm:block">[{wedding.guests}] guests</p>
        </div>

        <nav className="flex rounded-xl bg-black/10 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]" aria-label="Sections">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-current={tab === key}
              className={clsx(
                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors sm:px-4",
                tab === key ? "bg-night text-paper shadow-[0_2px_6px_rgba(0,0,0,0.35)]" : "text-ink/60 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => (confirmReset ? onReset() : setConfirmReset(true))}
          onBlur={() => setConfirmReset(false)}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/45 hover:text-kumkum"
        >
          <RotateCcw size={12} /> {confirmReset ? "Really start over?" : "Start over"}
        </button>
      </header>

      <div className={clsx("mt-6 grid gap-6", tab !== "venue" && "lg:grid-cols-[minmax(340px,420px)_1fr]")}>
        {/* On the Venue tab the 3D view needs the width, so the card steps aside (it stays mounted, so it keeps swinging). */}
        <aside
          className={clsx(
            "stage-dark relative h-[520px] overflow-hidden rounded-[28px] lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)] lg:min-h-[560px]",
            tab === "venue" && "hidden",
          )}
        >
          <Toran className="pointer-events-none absolute inset-x-0 top-0 h-[88px] w-full" />
          <CardStage
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            label={`${wedding.partnerA} and ${wedding.partnerB}'s wedding card. Click to flip`}
            card={{
                a: wedding.partnerA,
                b: wedding.partnerB,
                city: CITIES[wedding.city].name,
                date: wedding.lockedDate,
                tradition: wedding.tradition === "hindu-north" ? "Hindu · North India" : "Any date",
                hindu: wedding.tradition === "hindu-north",
                guests: wedding.guests,
                budgetLakh: wedding.budgetLakh,
              countdown,
            }}
          />
          <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-paper/45">
            Tilt it · tap to flip
          </p>
        </aside>

        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {tab === "date" ? (
                <DateTab wedding={wedding} onPatch={onPatch} />
              ) : tab === "venue" ? (
                <VenueStudio wedding={wedding} onPatch={onPatch} />
              ) : tab === "invites" ? (
                <InviteStudio wedding={wedding} onPatch={onPatch} />
              ) : (
                <NextUp {...NEXT[tab]} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function NextUp({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">({n}) {title}</p>
      <h2 className="mt-2 text-[clamp(30px,4vw,48px)] font-bold leading-[0.98] tracking-[-0.05em]">
        Coming <span className="font-serif font-normal italic tracking-[-0.035em]">next.</span>
      </h2>
      <p className="mt-3 max-w-xl text-[15px] text-ink/65">{body}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="paper card-shadow rounded-[20px] p-5" style={{ animation: `rise .5s ${i * 70}ms both` }}>
            <div className="bone sweep h-4 w-1/3 rounded-full" />
            <div className="bone sweep mt-4 h-8 w-4/5 rounded-lg" />
            <div className="bone sweep mt-3 h-3 w-2/3 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
