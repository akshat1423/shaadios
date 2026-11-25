// Calendar dates are plain "YYYY-MM-DD" strings, handled in UTC so a date never shifts with the viewer's timezone.

export type Ymd = string;

const DAY = 86_400_000;

export function toMs(d: Ymd): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function fromMs(ms: number): Ymd {
  const t = new Date(ms);
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${t.getUTCFullYear()}-${m}-${d}`;
}

export function addDays(d: Ymd, n: number): Ymd {
  return fromMs(toMs(d) + n * DAY);
}

export function daysBetween(a: Ymd, b: Ymd): number {
  return Math.round((toMs(b) - toMs(a)) / DAY);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(d: Ymd): number {
  return new Date(toMs(d)).getUTCDay();
}

export function monthOf(d: Ymd): number {
  return Number(d.slice(5, 7));
}

export function isWeekend(d: Ymd): boolean {
  const w = weekday(d);
  return w === 0 || w === 6;
}

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: Ymd, to: Ymd): Ymd[] {
  const out: Ymd[] = [];
  for (let ms = toMs(from); ms <= toMs(to); ms += DAY) out.push(fromMs(ms));
  return out;
}

/** First and last day of a "YYYY-MM" month. */
export function monthBounds(month: string): { first: Ymd; last: Ymd } {
  const [y, m] = month.split("-").map(Number);
  return { first: `${month}-01`, last: fromMs(Date.UTC(y, m, 0)) };
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", ...opts });
const long = fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
const short = fmt({ day: "numeric", month: "short" });
const monthLabel = fmt({ month: "long", year: "numeric" });
const dayName = fmt({ weekday: "short" });

export const formatDate = (d: Ymd) => long.format(toMs(d));
export const formatShort = (d: Ymd) => short.format(toMs(d));
export const formatMonth = (month: string) => monthLabel.format(toMs(`${month}-01`));
export const formatDay = (d: Ymd) => dayName.format(toMs(d));
