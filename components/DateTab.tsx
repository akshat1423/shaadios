"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Lock, Unlock } from "lucide-react";
import clsx from "clsx";
import { bestMove, DATE_SENSITIVE_SHARE, rankDates, windowCovered } from "@/lib/dateScore";
import { eachDay, formatDate, formatMonth, formatShort, monthBounds, weekday, type Ymd } from "@/lib/dates";
import { MUHURAT_COVERAGE } from "@/lib/data/muhurat";
import type { DateScore, Priorities, Wedding } from "@/lib/types";

const MONTH_KEYS = (from: string, to: string) => {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) (m = 1), y++;
  }
  return out;
};

const heat = (total: number) => `color-mix(in srgb, #6b7a3a ${Math.round(total)}%, #e3d8c3)`;

export function DateTab({ wedding, onPatch }: { wedding: Wedding; onPatch: (p: Partial<Wedding>) => void }) {
  const ranking = useMemo(() => rankDates(wedding), [wedding]);
  const byDate = useMemo(() => new Map(ranking.scores.map((s) => [s.date, s])), [ranking]);
  const top = ranking.scores.slice(0, 5);

  const [picked, setPicked] = useState<Ymd | null>(null);
  const [fav, setFav] = useState("");
  const selectedKey = picked ?? wedding.lockedDate ?? top[0]?.date ?? null;
  const selected = selectedKey ? byDate.get(selectedKey) ?? null : null;

  const move = useMemo(() => (fav ? bestMove(wedding, fav) : null), [wedding, fav]);
  const months = MONTH_KEYS(wedding.windowStart, wedding.windowEnd);
  const covered = windowCovered(wedding);
  const locked = wedding.lockedDate;

  const setPriority = (k: keyof Priorities, v: number) => onPatch({ priorities: { ...wedding.priorities, [k]: v } });

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">(01) Date</p>
        <h2 className="mt-2 text-[clamp(30px,4vw,48px)] font-bold leading-[0.98] tracking-[-0.05em]">
          The right date is{" "}
          <span className="font-serif font-normal italic tracking-[-0.035em]">auspicious, affordable, attended.</span>
        </h2>
      </div>

      {!covered && (
        <p className="rounded-xl border border-marigold/50 bg-marigold/10 px-4 py-3 text-[13px] text-ink/80">
          Muhurat data covers {formatShort(MUHURAT_COVERAGE.from)} 2026 to {formatShort(MUHURAT_COVERAGE.to)} 2027. Months outside that
          have no data here, which is not the same as having no muhurat. Check with your Pandit.
        </p>
      )}

      {/* What matters to this family */}
      <section className="night-card rounded-[22px] p-5 text-paper">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-paper/50">What matters most</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {(
            [
              ["cost", "Lower cost", "Cheaper weekday, less crowded week"],
              ["attendance", "Guests can come", "Weekends, long breaks, no festival clash"],
              ["weather", "Good weather", "Typical rain, heat and smog for your city"],
            ] as const
          ).map(([k, label, hint]) => (
            <label key={k} className="block">
              <span className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold tracking-[-0.01em]">{label}</span>
                <span className="font-mono text-[11px] text-marigold">{wedding.priorities[k]}</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={wedding.priorities[k]}
                onChange={(e) => setPriority(k, Number(e.target.value))}
                className="mt-2 w-full accent-[#e0962b]"
                aria-label={label}
              />
              <span className="mt-1 block text-[11.5px] text-paper/45">{hint}</span>
            </label>
          ))}
        </div>
      </section>

      {ranking.scores.length === 0 ? (
        <div className="paper card-shadow rounded-[22px] p-8 text-center">
          <p className="text-[22px] font-bold tracking-[-0.03em]">No muhurat days in this window.</p>
          <p className="mt-2 text-[14px] text-ink/60">Try widening the months, or pick “Any date works” in your plan.</p>
        </div>
      ) : (
        <>
          {/* Top picks */}
          <section>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">Best {top.length} for you</p>
            <ol className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {top.map((s, i) => (
                <motion.li
                  key={s.date}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26, delay: i * 0.025 }}
                >
                  <button
                    onClick={() => setPicked(s.date)}
                    className={clsx(
                      "paper card-shadow flex w-full items-center gap-4 rounded-[18px] p-4 text-left transition-shadow focus-visible:ring-2 focus-visible:ring-kumkum focus-visible:outline-none",
                      selectedKey === s.date && "ring-2 ring-kumkum",
                    )}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-night font-mono text-[12px] text-paper">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-bold tracking-[-0.03em]">{formatDate(s.date)}</span>
                      <span className="block truncate text-[12.5px] text-ink/55">{s.reasons[0]?.text}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[22px] font-bold leading-none tracking-[-0.04em]">{s.total}</span>
                      <span className="block font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink/40">score</span>
                    </span>
                  </button>
                </motion.li>
              ))}
            </ol>
          </section>

          {/* Calendar heat map */}
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
                {wedding.tradition === "hindu-north" ? "Muhurat days, shaded by score" : "Every day, shaded by score"}
              </p>
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
                weaker
                <span className="h-2 w-16 rounded-full" style={{ background: `linear-gradient(90deg, ${heat(10)}, ${heat(95)})` }} />
                stronger
              </p>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {months.map((m) => (
                <Month key={m} month={m} byDate={byDate} selected={selectedKey} locked={locked} onPick={setPicked} />
              ))}
            </div>
          </section>

          {/* Selected date */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.section
                key={selected.date}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="paper card-shadow relative overflow-hidden rounded-[26px] p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-kumkum">
                      {selected.muhurat.nakshatra ? `Nakshatra · ${selected.muhurat.nakshatra}` : "Selected date"}
                    </p>
                    <h3 className="mt-1 text-[clamp(28px,3.4vw,40px)] font-bold leading-none tracking-[-0.045em]">{formatDate(selected.date)}</h3>
                  </div>
                  <button
                    onClick={() => onPatch({ lockedDate: locked === selected.date ? undefined : selected.date })}
                    className={clsx(
                      "keycap inline-flex items-center gap-2 px-5 py-3.5 text-[12.5px] font-medium",
                      locked !== selected.date && "keycap-kumkum",
                    )}
                  >
                    {locked === selected.date ? <Unlock size={15} /> : <Lock size={15} />}
                    {locked === selected.date ? "Unlock date" : "Lock this date"}
                  </button>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-3">
                  <Meter
                    label="Price pressure"
                    value={Math.max(0, Math.min(100, 50 + selected.pricePct * 1.6))}
                    caption={
                      selected.pricePct === 0
                        ? "About typical for your window"
                        : `${Math.abs(selected.pricePct)}% ${selected.pricePct < 0 ? "below" : "above"} a typical date`
                    }
                    bad
                  />
                  <Meter label="Guests can come" value={selected.attendance} caption={`${selected.attendance} / 100`} />
                  <Meter label="Weather risk" value={selected.weatherRisk} caption="Typical conditions, not a forecast" bad />
                </div>

                <ul className="mt-6 space-y-2">
                  {selected.reasons.map((r) => (
                    <li key={r.text} className="flex items-start gap-2.5 text-[14px] text-ink/80">
                      <span
                        className={clsx(
                          "mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-paper",
                          r.tone === "good" ? "bg-mehendi" : "bg-marigold",
                        )}
                      >
                        {r.tone === "good" ? <Check size={10} strokeWidth={3.5} /> : "!"}
                      </span>
                      {r.text}
                    </li>
                  ))}
                </ul>

                {locked === selected.date && (
                  <div
                    className="stamp-in pointer-events-none absolute bottom-5 right-6 flex h-24 w-24 -rotate-[9deg] items-center justify-center rounded-full border-[3px] border-kumkum text-center font-mono text-[10px] font-medium uppercase leading-tight tracking-[0.14em] text-kumkum mix-blend-multiply"
                    aria-hidden
                  >
                    Date
                    <br />
                    locked
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* The headline: what moving the date is worth */}
          <section className="night-card rounded-[26px] p-6 text-paper">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-marigold">Already leaning towards a date?</p>
            <h3 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.04em]">
              See what moving it <span className="font-serif font-normal italic tracking-[-0.03em]">by a few days</span> is worth.
            </h3>
            <input
              type="date"
              value={fav}
              onChange={(e) => setFav(e.target.value)}
              min={MUHURAT_COVERAGE.from}
              max={MUHURAT_COVERAGE.to}
              aria-label="A date your family is leaning towards"
              className="mt-4 rounded-xl border border-paper/20 bg-paper/10 px-4 py-2.5 text-[15px] text-paper outline-none focus:border-marigold [color-scheme:dark]"
            />
            <AnimatePresence mode="wait">
              {fav && !move && (
                <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 text-[14px] text-paper/60">
                  No better option within three weeks of that date inside your window.
                </motion.p>
              )}
              {move && (
                <motion.div
                  key={`${move.from.date}-${move.to.date}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="mt-5"
                >
                  <div className="flex flex-wrap items-center gap-3 text-[16px]">
                    <span className="rounded-full bg-paper/10 px-3.5 py-1.5">{formatDate(move.from.date)}</span>
                    <ArrowRight size={16} className="text-marigold" />
                    <span className="rounded-full bg-marigold px-3.5 py-1.5 font-semibold text-night">{formatDate(move.to.date)}</span>
                  </div>
                  <p className="mt-4 text-[clamp(26px,3vw,36px)] font-bold leading-tight tracking-[-0.04em]">
                    {Math.abs(move.savingLakh) < 0.1
                      ? "About the same cost"
                      : move.savingLakh > 0
                        ? `≈ ₹${move.savingLakh.toFixed(1)} lakh less`
                        : `≈ ₹${Math.abs(move.savingLakh).toFixed(1)} lakh more`}
                    <span className="font-serif font-normal italic text-paper/70">
                      {" "}
                      and {move.attendanceDelta >= 0 ? `${move.attendanceDelta} points easier` : `${Math.abs(move.attendanceDelta)} points harder`} for guests
                    </span>
                  </p>
                  <p className="mt-2 text-[12px] text-paper/45">
                    Indicative only. Applies the change in demand to the {Math.round(DATE_SENSITIVE_SHARE * 100)}% of your ₹{wedding.budgetLakh} lakh
                    budget that moves with date (venue, catering, decor). Real quotes will differ.
                    {!move.from.muhurat.valid && " Your date is not a muhurat day."}
                  </p>
                  <button onClick={() => setPicked(move.to.date)} className="keycap mt-4 px-4 py-3 text-[12px]">
                    Look at {formatShort(move.to.date)}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </>
      )}

      <p className="text-[12px] leading-relaxed text-ink/50">
        Muhurat days: North India Panchang as published by{" "}
        <a className="underline underline-offset-2" href="https://www.ganeshaspeaks.com/muhurat/2027/marriage-muhurat/" target="_blank" rel="noreferrer">
          GaneshaSpeaks
        </a>
        . Sources disagree on a few dates and timings vary by city and chart, so confirm with your Pandit. Prices are a relative demand
        index, not quotes. Holidays: central-government list. Weather is typical conditions, not a forecast.
      </p>
    </div>
  );
}

function Month({
  month,
  byDate,
  selected,
  locked,
  onPick,
}: {
  month: string;
  byDate: Map<Ymd, DateScore>;
  selected: Ymd | null;
  locked?: Ymd;
  onPick: (d: Ymd) => void;
}) {
  const { first, last } = monthBounds(month);
  const days = eachDay(first, last);
  const lead = weekday(first);
  const any = days.some((d) => byDate.has(d));
  return (
    <div className="paper card-shadow rounded-[20px] p-4">
      <p className="text-[15px] font-bold tracking-[-0.03em]">{formatMonth(month)}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center font-mono text-[9.5px] uppercase text-ink/35">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((d) => {
          const s = byDate.get(d);
          const n = Number(d.slice(8));
          if (!s)
            return (
              <span key={d} className="flex aspect-square items-center justify-center text-[11px] text-ink/25">
                {n}
              </span>
            );
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              aria-label={`${formatDate(d)}, score ${s.total}${locked === d ? ", locked" : ""}`}
              aria-pressed={selected === d}
              className={clsx(
                "relative flex aspect-square items-center justify-center rounded-lg text-[12px] font-semibold transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-kumkum focus-visible:outline-none",
                s.total >= 55 ? "text-paper" : "text-ink",
                selected === d && "ring-2 ring-ink",
              )}
              style={{ background: heat(s.total) }}
            >
              {n}
              {locked === d && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-kumkum ring-2 ring-paper" />}
            </button>
          );
        })}
      </div>
      {!any && <p className="mt-3 text-[12px] text-ink/45">No muhurat days this month.</p>}
    </div>
  );
}

function Meter({ label, value, caption, bad }: { label: string; value: number; caption: string; bad?: boolean }) {
  // "bad" meters fill red as the number rises (price, weather); the others fill green.
  const color = bad ? (value > 66 ? "#b8321f" : value > 33 ? "#e0962b" : "#6b7a3a") : value < 40 ? "#b8321f" : value < 65 ? "#e0962b" : "#6b7a3a";
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/50">{label}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, value)}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }}
        />
      </div>
      <p className="mt-1.5 text-[12.5px] text-ink/65">{caption}</p>
    </div>
  );
}
