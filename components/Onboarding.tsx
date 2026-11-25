"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import clsx from "clsx";
import { CITIES, CITY_IDS } from "@/lib/data/cities";
import { formatMonth } from "@/lib/dates";
import type { CityId, Tradition, Wedding } from "@/lib/types";

const MONTHS = [
  "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05",
  "2027-06", "2027-07", "2027-08", "2027-09", "2027-10", "2027-11", "2027-12",
];

const READING = [
  "Reading the Panchang",
  "Counting the muhurat days",
  "Checking holidays and weather",
  "Designing your wedding card",
];

type Phase = "names" | "where" | "scale" | "window" | "reading";
const ORDER: Phase[] = ["names", "where", "scale", "window"];

const field =
  "w-full border-0 border-b-2 border-ink/20 bg-transparent pb-2 text-[clamp(28px,3.6vw,46px)] font-bold tracking-[-0.04em] outline-none transition-colors placeholder:text-ink/20 focus:border-kumkum";

export function Onboarding({ onDone }: { onDone: (w: Wedding) => void }) {
  const [phase, setPhase] = useState<Phase>("names");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [city, setCity] = useState<CityId>("delhi");
  const [tradition, setTradition] = useState<Tradition>("hindu-north");
  const [guests, setGuests] = useState(300);
  const [budget, setBudget] = useState(40);
  const [from, setFrom] = useState("2027-01");
  const [to, setTo] = useState("2027-05");
  const [tick, setTick] = useState(0);

  const wedding = (): Wedding => ({
    partnerA: a.trim(),
    partnerB: b.trim(),
    city,
    tradition,
    guests,
    budgetLakh: budget,
    windowStart: from,
    windowEnd: to,
    priorities: { cost: 50, attendance: 30, weather: 20 },
  });

  const valid: Record<Phase, boolean> = {
    names: a.trim().length > 0 && b.trim().length > 0,
    where: true,
    scale: guests >= 10 && budget >= 1,
    window: from <= to,
    reading: false,
  };

  const next = () => {
    if (!valid[phase]) return;
    const i = ORDER.indexOf(phase);
    setPhase(i < ORDER.length - 1 ? ORDER[i + 1] : "reading");
  };

  // "Reading your shaadi": a short ticker so the pass feels worked out for them, never shorter than 2.8s.
  useEffect(() => {
    if (phase !== "reading") return;
    const t = setInterval(() => setTick((n) => n + 1), 750);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase === "reading" && tick >= READING.length) onDone(wedding());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, phase]);

  const step = ORDER.indexOf(phase) + 1;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8 sm:px-10">
      <header className="flex items-baseline justify-between">
        <p className="text-[27px] tracking-[-0.045em]">
          <span className="font-bold">shaadi</span> <span className="font-serif italic tracking-[-0.03em]">os</span>
        </p>
        {phase !== "reading" && (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50">Step {step} of {ORDER.length}</p>
        )}
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={phase}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="my-auto py-12"
          onKeyDown={(e) => e.key === "Enter" && next()}
        >
          {phase === "names" && (
            <>
              <Q label="(01) The couple" title={<>Who is getting <em className="font-serif font-normal italic tracking-[-0.035em] text-kumkum">married?</em></>} />
              <div className="mt-10 grid gap-8 sm:grid-cols-2">
                <input autoFocus aria-label="First partner's name" className={field} placeholder="Aanya" value={a} onChange={(e) => setA(e.target.value)} />
                <input aria-label="Second partner's name" className={field} placeholder="Kabir" value={b} onChange={(e) => setB(e.target.value)} />
              </div>
            </>
          )}

          {phase === "where" && (
            <>
              <Q label="(02) Place and calendar" title={<>Where, and by which <em className="font-serif font-normal italic tracking-[-0.035em] text-kumkum">calendar?</em></>} />
              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50">City of the wedding</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CITY_IDS.map((id) => (
                  <Chip key={id} on={city === id} onClick={() => setCity(id)}>{CITIES[id].name}</Chip>
                ))}
              </div>
              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50">Who decides the date?</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Choice
                  on={tradition === "hindu-north"}
                  onClick={() => setTradition("hindu-north")}
                  title="The Panchang"
                  body="Hindu, North India. Only muhurat days are offered."
                />
                <Choice
                  on={tradition === "any"}
                  onClick={() => setTradition("any")}
                  title="Any date works"
                  body="Sikh, civil, or a flexible family. Every day is a candidate."
                />
              </div>
              {tradition === "hindu-north" && (
                <p className="mt-3 text-[13px] text-ink/55">
                  South Indian, Marathi and Bengali Panchangs differ. Their dates are not in yet, so pick “Any date” and check with your Pandit.
                </p>
              )}
            </>
          )}

          {phase === "scale" && (
            <>
              <Q label="(03) Scale" title={<>How big is the <em className="font-serif font-normal italic tracking-[-0.035em] text-kumkum">shaadi?</em></>} />
              <div className="mt-10 grid gap-10 sm:grid-cols-2">
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50" htmlFor="guests">Guests, roughly</label>
                  <input id="guests" type="number" min={10} max={5000} className={clsx(field, "mt-2")} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
                  <p className="mt-2 text-[12.5px] text-ink/50">The average Indian wedding in 2023 had about 326.</p>
                </div>
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50" htmlFor="budget">Total budget, ₹ lakh</label>
                  <input id="budget" type="number" min={1} max={2000} className={clsx(field, "mt-2")} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
                  <p className="mt-2 text-[12.5px] text-ink/50">Used only to turn price pressure into rupees.</p>
                </div>
              </div>
            </>
          )}

          {phase === "window" && (
            <>
              <Q label="(04) Timing" title={<>When could it <em className="font-serif font-normal italic tracking-[-0.035em] text-kumkum">happen?</em></>} />
              <div className="mt-10 grid gap-8 sm:grid-cols-2">
                <MonthSelect label="Earliest month" value={from} onChange={setFrom} />
                <MonthSelect label="Latest month" value={to} onChange={setTo} />
              </div>
              {from > to && <p className="mt-4 text-[13px] text-kumkum">The earliest month has to come before the latest.</p>}
            </>
          )}

          {phase === "reading" && (
            <div>
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-mehendi text-paper"
              >
                <Check size={28} strokeWidth={3} />
              </motion.div>
              <h1 className="mt-6 text-[clamp(44px,8vw,96px)] font-bold leading-[0.94] tracking-[-0.05em]">
                Hi, <span className="font-serif font-normal italic tracking-[-0.035em] text-kumkum">{a.trim().split(/\s+/)[0]} &amp; {b.trim().split(/\s+/)[0]}.</span>
              </h1>
              <ul className="mt-10 space-y-3">
                {READING.map((r, i) => (
                  <li key={r} className={clsx("flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.14em] transition-opacity", i <= tick ? "opacity-100" : "opacity-25")}>
                    <span className={clsx("flex h-5 w-5 items-center justify-center rounded-full", i < tick ? "bg-mehendi text-paper" : "bg-ink/10")}>
                      {i < tick && <Check size={12} strokeWidth={3} />}
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      {phase !== "reading" && (
        <footer className="flex items-center justify-between">
          <button
            onClick={() => setPhase(ORDER[Math.max(0, ORDER.indexOf(phase) - 1)])}
            className={clsx("font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50 underline-offset-4 hover:underline", phase === "names" && "invisible")}
          >
            Back
          </button>
          <button onClick={next} disabled={!valid[phase]} className="keycap keycap-kumkum inline-flex items-center gap-2 px-6 py-4 text-[13px] font-medium">
            {phase === "window" ? "Work it out" : "Continue"} <ArrowRight size={16} />
          </button>
        </footer>
      )}
    </div>
  );
}

function Q({ label, title }: { label: string; title: React.ReactNode }) {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">{label}</p>
      <h1 className="mt-3 text-[clamp(40px,6.4vw,76px)] font-bold leading-[0.96] tracking-[-0.05em]">{title}</h1>
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={clsx(
        "rounded-full px-4 py-2 text-[13.5px] transition-colors focus-visible:ring-2 focus-visible:ring-kumkum focus-visible:outline-none",
        on ? "bg-night text-paper" : "bg-ink/6 text-ink/80 hover:bg-ink/10",
      )}
    >
      {children}
    </button>
  );
}

function Choice({ on, onClick, title, body }: { on: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={clsx(
        "rounded-2xl border-2 p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-kumkum focus-visible:outline-none",
        on ? "border-kumkum bg-paper card-shadow" : "border-ink/12 hover:border-ink/25",
      )}
    >
      <span className="block text-[16px] font-semibold tracking-[-0.02em]">{title}</span>
      <span className="mt-1 block text-[13px] text-ink/60">{body}</span>
    </button>
  );
}

function MonthSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border-2 border-ink/15 bg-paper px-4 py-3 text-[18px] font-semibold tracking-[-0.02em] outline-none focus:border-kumkum"
      >
        {MONTHS.map((m) => (
          <option key={m} value={m}>{formatMonth(m)}</option>
        ))}
      </select>
    </label>
  );
}
