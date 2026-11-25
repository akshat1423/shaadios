import { addDays, type Ymd } from "../dates.ts";

/*
 * Hindu vivah muhurat dates, North India Panchang.
 *
 * SOURCES (single-source per period so the list never mixes calendars):
 *  - Dec 2026 – Dec 2027: GaneshaSpeaks, "Marriage Muhurat Dates for 2027"
 *    https://www.ganeshaspeaks.com/muhurat/2027/marriage-muhurat/
 *  - Nov – Dec 2026: Panchang tables aggregated by SmartPuja / TheWeddingFocus / others (North India)
 *
 * IMPORTANT: published muhurat lists disagree on a handful of dates, and the exact lagna varies by city and by the
 * couple's charts. This is a planning aid, not a ruling: the UI must tell people to confirm with their Pandit.
 * Ranges such as "2–3 Feb" mean both days carry the muhurat (the nakshatra spans midnight).
 * `win` is the length in hours of the window when the source gives clock times; omitted when the source gives only
 * the day. Windows under 6 hours are flagged "short window".
 */

export interface Muhurat {
  date: Ymd;
  nakshatra?: string;
  /** hours, when known */
  win?: number;
}

type Row = [dates: string, nakshatra?: string, win?: number];

/** "2027-02": rows of [days, nakshatra, windowHours] where days is "9-10", "21" or "7,8,9". */
const RAW: Record<string, Row[]> = {
  "2026-11": [
    ["21", "Revati", 17],
    ["24", "Rohini", 7.5],
    ["25", "Rohini, Mrigashira", 24],
    ["26", "Mrigashira", 12],
  ],
  "2026-12": [
    ["2", "Uttara Phalguni", 20.5],
    ["3", "Uttara Phalguni, Hasta", 4],
    ["4", "Hasta", 3.5],
    ["5", "Swati", 19],
    ["6", "Swati", 0.7],
    ["11", "Uttara Ashadha", 4],
  ],
  "2027-01": [
    ["15", "Revati", 6.75],
    ["18", "Rohini, Krittika", 0.03],
    ["19", "Rohini, Mrigashira", 23.5],
    ["20", "Mrigashira", 8.8],
    ["26", "Uttara Phalguni, Hasta", 10.9],
    ["27", "Hasta", 16.5],
    ["30", "Anuradha", 3.3],
    ["31", "Anuradha", 12.2],
  ],
  "2027-02": [
    ["2,3", "Mula"],
    ["9,10", "Uttara Bhadrapada"],
    ["14,15", "Rohini"],
    ["21", "Magha", 2.3],
    ["22", "Uttara Phalguni"],
    ["25,26", "Swati"],
    ["27,28", "Anuradha"],
  ],
  "2027-03": [
    ["1,2", "Mula"],
    ["3,4", "Uttara Ashadha"],
    ["9,10", "Uttara Bhadrapada"],
    ["14", "Rohini", 13.6],
  ],
  "2027-04": [
    ["18", "Uttara Phalguni", 15.6],
    ["19,20", "Hasta"],
    ["21,22", "Swati"],
    ["23,24", "Anuradha"],
    ["25,26", "Mula"],
    ["27,28", "Uttara Ashadha"],
  ],
  "2027-05": [
    ["4", "Revati", 3.2],
    ["7,8,9", "Rohini, Mrigashira"],
    ["13,14", "Magha"],
    ["15,16,17", "Uttara Phalguni, Hasta"],
    ["18,19", "Swati"],
    ["20,21", "Anuradha"],
    ["22,23", "Mula"],
    ["24,25", "Uttara Ashadha"],
    ["30,31", "Uttara Bhadrapada"],
  ],
  "2027-06": [
    ["1", "Revati", 0.8],
    ["5", "Mrigashira", 0.5],
    ["9,10", "Magha"],
    ["11,12", "Uttara Phalguni"],
    ["13", "Hasta", 7.8],
    ["15", "Swati", 11.5],
    ["16,17", "Anuradha"],
    ["19,20,21", "Mula, Uttara Ashadha"],
    ["26,27,28", "Uttara Bhadrapada, Revati"],
  ],
  "2027-07": [
    ["7", "Magha", 5.2],
    ["8,9", "Uttara Phalguni"],
    ["11,12", "Swati"],
  ],
  // Aug – Oct 2027: no muhurat (Chaturmas) per the source.
  "2027-11": [
    ["10", "Uttara Bhadrapada", 14.4],
    ["11", "Revati", 2.7],
    ["15,16", "Rohini, Mrigashira"],
    ["20,21", "Magha"],
    ["23,24", "Uttara Phalguni, Hasta"],
    ["25,26", "Swati"],
    ["29", "Mula", 0.2],
  ],
  "2027-12": [
    ["2", "Uttara Ashadha", 12.7],
    ["7,8", "Uttara Bhadrapada, Revati"],
    ["9", "Revati", 3.9],
    ["12", "Rohini", 7.1],
    ["13,14", "Rohini, Mrigashira"],
  ],
};

function expand(): Muhurat[] {
  const out: Muhurat[] = [];
  for (const [month, rows] of Object.entries(RAW)) {
    for (const [days, nakshatra, win] of rows) {
      const parts = days.includes(",") ? days.split(",") : days.includes("-") ? range(days) : [days];
      for (const p of parts) out.push({ date: `${month}-${p.trim().padStart(2, "0")}`, nakshatra, win });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

function range(s: string): string[] {
  const [a, b] = s.split("-").map(Number);
  return Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
}

export const MUHURATS: Muhurat[] = expand();
const BY_DATE = new Map(MUHURATS.map((m) => [m.date, m]));

export function muhuratOn(date: Ymd): Muhurat | undefined {
  return BY_DATE.get(date);
}

/** Coverage of the dataset: dates outside it are unknown, not "no muhurat". */
export const MUHURAT_COVERAGE = { from: "2026-11-21", to: "2027-12-31" } as const;

/** How many muhurat dates fall within ±`radius` days of `date` (including itself if it is one). */
export function muhuratsNear(date: Ymd, radius: number): number {
  let n = 0;
  for (let i = -radius; i <= radius; i++) if (BY_DATE.has(addDays(date, i))) n++;
  return n;
}
