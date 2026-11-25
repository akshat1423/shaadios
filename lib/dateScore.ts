import { addDays, eachDay, formatDay, monthBounds, monthOf, weekday, type Ymd } from "./dates.ts";
import { CITIES } from "./data/cities.ts";
import { holidayOn } from "./data/holidays.ts";
import { MUHURAT_COVERAGE, muhuratOn, muhuratsNear } from "./data/muhurat.ts";
import type { CityId, DateScore, Priorities, Reason, Tradition, Wedding } from "./types.ts";

/*
 * The date optimiser. Everything here is deterministic: the same wedding profile always gives the same ranking.
 * The LLM never touches it. Each factor is a plain, explainable heuristic and every one of them is surfaced to the
 * user as a "reason", so nobody has to trust a black box.
 *
 * Price is a RELATIVE pressure index, never a quote: venue prices are not public, so we model how crowded a date is
 * (weekday, how few muhurat days are nearby, season) and compare dates against the typical one in the window.
 */

/** Mon … Sun demand multipliers, indexed by getUTCDay() (0 = Sunday). */
const WEEKDAY_PRICE = [1.25, 0.85, 0.85, 0.9, 1.0, 1.15, 1.3];
/** How easy it is for guests to travel, by weekday (0 = Sunday). */
const WEEKDAY_ATTENDANCE = [80, 45, 45, 50, 55, 75, 85];
/** Wedding-season demand by month (Jan … Dec): winter and pre-summer peak, monsoon trough. */
const SEASON_PRICE = [1.05, 1.1, 1.0, 1.0, 1.05, 0.95, 0.85, 0.85, 0.85, 0.95, 1.1, 1.1];

/** Roughly the CBSE/state board-exam stretch: families with school-age children skip weddings. */
const inBoardExams = (d: Ymd) => d >= `${d.slice(0, 4)}-02-15` && d <= `${d.slice(0, 4)}-04-05`;
/** School summer break: families travel, outstation and NRI guests can come. */
const inSummerBreak = (d: Ymd) => d >= `${d.slice(0, 4)}-05-15` && d <= `${d.slice(0, 4)}-06-30`;

/** Share of the total budget that moves with date demand (venue, catering, decor). */
export const DATE_SENSITIVE_SHARE = 0.5;

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

const isOff = (d: Ymd) => {
  const w = weekday(d);
  return w === 0 || w === 6 || holidayOn(d) !== undefined;
};

/** Length of the run of non-working days (weekend + holidays) that contains `d`, 0 if `d` is a working day. */
function offRun(d: Ymd): number {
  if (!isOff(d)) return 0;
  let n = 1;
  for (let x = addDays(d, -1); isOff(x); x = addDays(x, -1)) n++;
  for (let x = addDays(d, 1); isOff(x); x = addDays(x, 1)) n++;
  return n;
}

export function candidateDates(w: Pick<Wedding, "tradition" | "windowStart" | "windowEnd">): Ymd[] {
  const all = eachDay(monthBounds(w.windowStart).first, monthBounds(w.windowEnd).last);
  if (w.tradition === "any") return all;
  return all.filter((d) => muhuratOn(d));
}

/** A date's crowding from how scarce muhurat days are around it (Hindu-North only). */
function scarcity(date: Ymd, tradition: Tradition): number {
  if (tradition === "any") return 1;
  const n = muhuratsNear(date, 7);
  return 1 + 0.35 * (1 - Math.min(n, 10) / 10);
}

export function priceIndex(date: Ymd, tradition: Tradition): number {
  return WEEKDAY_PRICE[weekday(date)] * scarcity(date, tradition) * SEASON_PRICE[monthOf(date) - 1];
}

export function weatherRisk(date: Ymd, city: CityId): number {
  const c = CITIES[city].climate;
  const m = monthOf(date) - 1;
  return clamp((0.45 * c.rain[m] + 0.3 * c.heat[m] + 0.25 * c.air[m]) * 10);
}

export function attendanceScore(date: Ymd): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  let score = WEEKDAY_ATTENDANCE[weekday(date)];
  const holiday = holidayOn(date);
  if (holiday?.kind === "festival") {
    score -= 25;
    reasons.push({ tone: "warn", text: `Clashes with ${holiday.name}: many families are busy at home` });
  } else if (holiday) {
    score += 10;
    reasons.push({ tone: "good", text: `${holiday.name} is a day off for most guests` });
  }
  const run = offRun(date);
  if (run >= 3) {
    score += 15;
    reasons.push({ tone: "good", text: `Falls in a ${run}-day break: outstation guests can travel` });
  }
  if (inBoardExams(date)) {
    score -= 8;
    reasons.push({ tone: "warn", text: "Board-exam season: families with school-age kids may skip" });
  }
  if (inSummerBreak(date)) {
    score += 10;
    reasons.push({ tone: "good", text: "School summer break: families (and NRI relatives) travel" });
  }
  return { score: clamp(score), reasons };
}

export function normalisePriorities(p: Priorities): Priorities {
  const sum = p.cost + p.attendance + p.weather || 1;
  return { cost: p.cost / sum, attendance: p.attendance / sum, weather: p.weather / sum };
}

export interface Ranking {
  /** Best first */
  scores: DateScore[];
  /** The typical price index in the window (median), the baseline for "cheaper than usual" */
  benchmark: number;
}

export function rankDates(w: Wedding): Ranking {
  const dates = candidateDates(w);
  if (dates.length === 0) return { scores: [], benchmark: 1 };

  const pis = dates.map((d) => priceIndex(d, w.tradition)).sort((a, b) => a - b);
  const benchmark = pis[Math.floor(pis.length / 2)];
  const weights = normalisePriorities(w.priorities);

  const scores = dates.map((date): DateScore => {
    const pi = priceIndex(date, w.tradition);
    const pricePct = Math.round((pi / benchmark - 1) * 100);
    const att = attendanceScore(date);
    const risk = weatherRisk(date, w.city);
    const m = muhuratOn(date);
    const short = m?.win !== undefined && m.win < 6;

    const reasons: Reason[] = [];
    if (w.tradition === "hindu-north") {
      reasons.push(
        short
          ? { tone: "warn", text: `Muhurat window is short (about ${m!.win! < 1 ? "under an hour" : `${m!.win!.toFixed(0)}h`}): little flexibility` }
          : { tone: "good", text: `Muhurat day${m?.nakshatra ? ` (${m.nakshatra})` : ""}` },
      );
    }
    const dayName = formatDay(date);
    if (pricePct <= -8) reasons.push({ tone: "good", text: `${dayName} is a lower-demand day: venues and vendors are easier to book` });
    else if (pricePct >= 12) reasons.push({ tone: "warn", text: `High demand (${dayName}, crowded week): expect premium pricing and tight availability` });
    reasons.push(...att.reasons);
    if (risk >= 55) reasons.push({ tone: "warn", text: "Typically a difficult month for weather or air quality here" });
    else if (risk <= 15) reasons.push({ tone: "good", text: "Typically comfortable weather here" });

    const value = clamp(50 + ((benchmark - pi) / benchmark) * 150);
    const comfort = 100 - risk;
    const muhuratQuality = short ? 70 : 100;
    const raw = weights.cost * value + weights.attendance * att.score + weights.weather * comfort;
    // The muhurat window quality nudges the total a little but never overrides what the family said matters.
    const total = Math.round(raw * 0.9 + muhuratQuality * 0.1);

    return {
      date,
      total,
      priceIndex: pi,
      pricePct,
      attendance: att.score,
      weatherRisk: risk,
      muhurat: { valid: w.tradition === "any" || m !== undefined, nakshatra: m?.nakshatra, shortWindow: short },
      reasons,
    };
  });

  scores.sort((a, b) => b.total - a.total || (a.date < b.date ? -1 : 1));
  return { scores, benchmark };
}

export interface Arbitrage {
  from: DateScore;
  to: DateScore;
  /** Estimated saving in ₹ lakh on the date-sensitive share of the budget (can be negative) */
  savingLakh: number;
  attendanceDelta: number;
}

/**
 * The headline feature: "move from the date you were leaning towards to this one".
 * `anchor` is scored on the same terms as the candidates, even if it is not a muhurat day.
 */
export function bestMove(w: Wedding, anchor: Ymd, within = 21): Arbitrage | null {
  const { scores } = rankDates(w);
  const from = scores.find((s) => s.date === anchor) ?? scoreSingle(w, anchor, scores);
  if (!from) return null;
  const near = scores.filter((s) => s.date !== anchor && Math.abs(daysApart(s.date, anchor)) <= within);
  const to = near.reduce<DateScore | null>((best, s) => (!best || s.total > best.total ? s : best), null);
  if (!to) return null;
  const share = w.budgetLakh * DATE_SENSITIVE_SHARE;
  const savingLakh = share * (1 - to.priceIndex / from.priceIndex);
  return { from, to, savingLakh, attendanceDelta: to.attendance - from.attendance };
}

function daysApart(a: Ymd, b: Ymd): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

/** Score a date that is not among the candidates (a non-muhurat date the family likes). */
function scoreSingle(w: Wedding, date: Ymd, ranked: DateScore[]): DateScore | null {
  if (ranked.length === 0) return null;
  const pis = ranked.map((r) => r.priceIndex).sort((a, b) => a - b);
  const benchmark = pis[Math.floor(pis.length / 2)];
  const pi = priceIndex(date, w.tradition);
  const att = attendanceScore(date);
  const risk = weatherRisk(date, w.city);
  return {
    date,
    total: 0,
    priceIndex: pi,
    pricePct: Math.round((pi / benchmark - 1) * 100),
    attendance: att.score,
    weatherRisk: risk,
    muhurat: { valid: muhuratOn(date) !== undefined, nakshatra: muhuratOn(date)?.nakshatra, shortWindow: false },
    reasons: att.reasons,
  };
}

/** True if the muhurat dataset covers the whole requested window, so "no dates" means none rather than unknown. */
export function windowCovered(w: Pick<Wedding, "windowStart" | "windowEnd">): boolean {
  return monthBounds(w.windowStart).first >= MUHURAT_COVERAGE.from && monthBounds(w.windowEnd).last <= MUHURAT_COVERAGE.to;
}
