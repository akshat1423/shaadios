"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { CardStage } from "./CardStage";
import { Toran } from "./Toran";
import type { CardData } from "./WeddingCard";

const DEMO: CardData = {
  a: "Aanya",
  b: "Kabir",
  city: "Jaipur",
  date: "2027-02-10",
  tradition: "Hindu · North India",
  hindu: true,
  guests: 326,
  budgetLakh: 40,
};

const SCRAPS = [
  { text: "The Pandit gave three dates. The family picked the Saturday.", tilt: -2.4, tape: "bg-marigold/70" },
  { text: "326 guests, six WhatsApp groups, one very tired cousin.", tilt: 1.8, tape: "bg-rose/60" },
  { text: "Veg? Jain? Which side invited whom? Who needs a room?", tilt: -1.2, tape: "bg-peacock/60" },
  { text: "The good Saturday is booked everywhere, and the price knows it.", tilt: 2.6, tape: "bg-marigold/70" },
];

const STEPS = [
  ["01", "Tell us the shaadi", "Names, city, how many guests, rough budget."],
  ["02", "Pick the right date", "Auspicious, affordable, easy for guests to reach."],
  ["03", "Invite and track", "Guest list, RSVPs and invitations in one place."],
];

export function Landing({ onStart }: { onStart: () => void }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-[47fr_53fr]">
      <section className="flex flex-col px-6 pb-10 pt-8 sm:px-10 lg:py-10">
        <header className="flex items-baseline justify-between">
          <p className="text-[27px] tracking-[-0.045em]">
            <span className="font-bold">shaadi</span> <span className="font-serif italic tracking-[-0.03em]">os</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50">Festive Hacks 2026</p>
        </header>

        <div className="my-auto py-10">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum"
          >
            (01) Indian weddings, planned
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
            className="mt-4 text-[44px] font-bold leading-[0.96] tracking-[-0.05em] sm:text-[58px] lg:text-[clamp(40px,min(5vw,8.4vh),74px)]"
          >
            Plan the shaadi.
            <br />
            <span className="font-serif font-normal italic tracking-[-0.035em] text-kumkum">Not the chaos.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.12 }}
            className="mt-5 max-w-[30rem] text-[16px] leading-relaxed text-ink/70"
          >
            Pick the date that is auspicious, affordable and easy for your guests to attend. Then run the guest list, RSVPs and
            invitations from one calm place.
          </motion.p>

          <ol className="mt-8 max-w-[30rem] space-y-4">
            {STEPS.map(([n, title, body], i) => (
              <motion.li
                key={n}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.25 + i * 0.07 }}
                className="flex gap-4"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-night font-mono text-[11px] text-paper">
                  {n}
                </span>
                <span>
                  <span className="block text-[15px] font-semibold tracking-[-0.02em]">{title}</span>
                  <span className="block text-[14px] text-ink/60">{body}</span>
                </span>
              </motion.li>
            ))}
          </ol>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              onClick={onStart}
              className="keycap keycap-kumkum inline-flex items-center gap-2 px-6 py-4 text-[13px] font-medium"
            >
              Start planning <ArrowRight size={16} />
            </button>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/45">No sign-up · stays in your browser</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:hidden">
          {SCRAPS.map((s) => (
            <Scrap key={s.text} {...s} />
          ))}
        </div>
      </section>

      <section className="stage-dark relative min-h-[560px] lg:sticky lg:top-0 lg:h-screen">
        <Toran className="pointer-events-none absolute inset-x-0 top-0 h-[88px] w-full" />
        <CardStage card={DEMO} flipped={flipped} onFlip={() => setFlipped((f) => !f)} label="A sample wedding card. Click to flip" />
        <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-paper/45">
          Tilt it · tap to flip
        </p>
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[230px] flex-col justify-center gap-5 pl-6 xl:flex">
          {SCRAPS.slice(0, 2).map((s, i) => (
            <motion.div
              key={s.text}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.15, duration: 0.5 }}
            >
              <Scrap {...s} />
            </motion.div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[230px] flex-col justify-center gap-5 pr-6 xl:flex">
          {SCRAPS.slice(2).map((s, i) => (
            <motion.div
              key={s.text}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 + i * 0.15, duration: 0.5 }}
            >
              <Scrap {...s} />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Scrap({ text, tilt, tape }: { text: string; tilt: number; tape: string }) {
  return (
    <div className="paper card-shadow relative rounded-[10px] px-4 pb-4 pt-5" style={{ transform: `rotate(${tilt}deg)` }}>
      <span className={`absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-3deg] ${tape}`} />
      <p className="font-serif text-[15px] italic leading-snug text-ink/85">{text}</p>
    </div>
  );
}
