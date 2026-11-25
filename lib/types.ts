import type { Ymd } from "./dates.ts";
import type { DecorOverrides, VenueId } from "./decor.ts";
import type { InviteSetup } from "./invite.ts";

export type Tradition = "hindu-north" | "any";

export type CityId =
  | "delhi"
  | "mumbai"
  | "bengaluru"
  | "hyderabad"
  | "chennai"
  | "kolkata"
  | "jaipur"
  | "udaipur"
  | "lucknow"
  | "pune"
  | "ahmedabad"
  | "chandigarh";

/** What matters to this family, 0–100 each. Weights are normalised when scoring. */
export interface Priorities {
  cost: number;
  attendance: number;
  weather: number;
}

export interface Wedding {
  partnerA: string;
  partnerB: string;
  city: CityId;
  tradition: Tradition;
  guests: number;
  /** Total wedding budget in ₹ lakh */
  budgetLakh: number;
  /** "YYYY-MM" */
  windowStart: string;
  windowEnd: string;
  priorities: Priorities;
  lockedDate?: Ymd;
  /** The venue style chosen in the Venue Studio, and what the family changed from its defaults */
  venue?: VenueId;
  /** The catalogue venue the family picked (see lib/data/venueCatalog.ts), if any */
  venueSite?: string;
  decor?: DecorOverrides;
  /** What the couple filled in on the Invites tab */
  invite?: InviteSetup;
}

export interface Reason {
  tone: "good" | "warn";
  text: string;
}

export interface DateScore {
  date: Ymd;
  /** 0–100, higher is better, after applying priorities */
  total: number;
  /** Relative cost pressure; 1.00 is a typical date in the window */
  priceIndex: number;
  /** price vs the typical date in the window, in percent (negative = cheaper) */
  pricePct: number;
  /** 0–100 */
  attendance: number;
  /** 0–100 risk, lower is better */
  weatherRisk: number;
  muhurat: { valid: boolean; nakshatra?: string; shortWindow: boolean };
  reasons: Reason[];
}
