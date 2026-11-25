import type { Ymd } from "../dates.ts";

/*
 * Central-government gazetted holidays (Delhi), used as a proxy for "most guests are off work".
 * Source: DoPT O.M. No. 12/2/2023-JCA dated 16.07.2026, as published at
 * https://www.staffnews.in/2026/07/list-of-holidays-for-the-year-2027-gazetted.html
 * The published list has 17 gazetted holidays; this file holds the 16 that the source summary named. Maha Shivratri
 * and a few state-level holidays are not included, so treat holiday-based scoring as a lower bound.
 * `kind`: "festival" = a day families are busy with their own celebrations (people skip weddings),
 *         "national" = a day off with no festival obligations (good for travel).
 */
export interface Holiday {
  date: Ymd;
  name: string;
  kind: "festival" | "national";
}

export const HOLIDAYS: Holiday[] = [
  { date: "2026-12-25", name: "Christmas", kind: "festival" },
  { date: "2027-01-01", name: "New Year's Day", kind: "national" },
  { date: "2027-01-26", name: "Republic Day", kind: "national" },
  { date: "2027-03-10", name: "Eid ul-Fitr", kind: "festival" },
  { date: "2027-03-23", name: "Holi", kind: "festival" },
  { date: "2027-03-26", name: "Good Friday", kind: "festival" },
  { date: "2027-04-15", name: "Ram Navami", kind: "festival" },
  { date: "2027-04-19", name: "Mahavir Jayanti", kind: "festival" },
  { date: "2027-05-17", name: "Bakrid", kind: "festival" },
  { date: "2027-05-20", name: "Buddha Purnima", kind: "festival" },
  { date: "2027-06-16", name: "Muharram", kind: "festival" },
  { date: "2027-08-15", name: "Independence Day", kind: "national" },
  { date: "2027-08-25", name: "Janmashtami", kind: "festival" },
  { date: "2027-10-02", name: "Gandhi Jayanti", kind: "national" },
  { date: "2027-10-09", name: "Dussehra", kind: "festival" },
  { date: "2027-10-29", name: "Diwali", kind: "festival" },
  { date: "2027-11-14", name: "Guru Nanak Jayanti", kind: "festival" },
  { date: "2027-12-25", name: "Christmas", kind: "festival" },
];

const BY_DATE = new Map(HOLIDAYS.map((h) => [h.date, h]));

export const holidayOn = (d: Ymd): Holiday | undefined => BY_DATE.get(d);
