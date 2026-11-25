/*
 * The guest invitation. Everything a guest needs is carried inside their personal link (base64url JSON), so the page
 * works for anyone who opens it, with no account and no database. The RSVP goes back to the couple as a pre-filled
 * WhatsApp message, which is how families already reply.
 */

export interface InviteEvent {
  name: string;
  /** "Fri 19 Feb, 7 pm" */
  when: string;
  where?: string;
  dress?: string;
}

export interface InviteData {
  a: string;
  b: string;
  /** "YYYY-MM-DD" */
  date?: string;
  city: string;
  hindu: boolean;
  venue: string;
  address?: string;
  events: InviteEvent[];
  notes: { parking?: string; stay?: string; food?: string; gifts?: string; contact?: string };
  /** The couple's WhatsApp number, for RSVPs */
  rsvpPhone?: string;
}

/** What the couple fills in on the Invites tab, saved with the wedding. */
export interface InviteSetup {
  venue: string;
  address: string;
  rsvpPhone: string;
  events: InviteEvent[];
  notes: InviteData["notes"];
  /** One guest per line: "Name, phone (optional)" */
  guests: string;
  /** BCP-47 code the invite message is sent in, e.g. "hi-IN" */
  lang: string;
  /** Public address of this site, so links work for guests */
  baseUrl: string;
}

export const LANGS: [string, string][] = [
  ["en-IN", "English"],
  ["hi-IN", "हिन्दी"],
  ["ta-IN", "தமிழ்"],
  ["te-IN", "తెలుగు"],
  ["bn-IN", "বাংলা"],
  ["mr-IN", "मराठी"],
  ["gu-IN", "ગુજરાતી"],
  ["kn-IN", "ಕನ್ನಡ"],
  ["ml-IN", "മലയാളം"],
  ["pa-IN", "ਪੰਜਾਬੀ"],
];

function toB64url(s: string): string {
  let bin = "";
  new TextEncoder().encode(s).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): string {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export const encodeInvite = (data: InviteData, guest: string) => toB64url(JSON.stringify({ d: data, g: guest }));

export function decodeInvite(payload: string): { d: InviteData; g: string } | null {
  try {
    const j = JSON.parse(fromB64url(decodeURIComponent(payload)));
    if (!j?.d?.a || !j?.d?.b || !Array.isArray(j.d.events)) return null;
    return { d: j.d as InviteData, g: String(j.g ?? "") };
  } catch {
    return null;
  }
}

/** The facts the guest-help assistant is allowed to answer from. */
export function factSheet(d: InviteData): string {
  const lines = [
    `Couple: ${d.a} and ${d.b}`,
    d.date && `Wedding date: ${d.date}`,
    `City: ${d.city}`,
    `Main venue: ${d.venue}${d.address ? `, ${d.address}` : ""}`,
    ...d.events.map((e) => `Event: ${e.name}. When: ${e.when}.${e.where ? ` Where: ${e.where}.` : ""}${e.dress ? ` Dress code: ${e.dress}.` : ""}`),
    d.notes.parking && `Parking: ${d.notes.parking}`,
    d.notes.stay && `Stay and travel: ${d.notes.stay}`,
    d.notes.food && `Food: ${d.notes.food}`,
    d.notes.gifts && `Gifts: ${d.notes.gifts}`,
    d.notes.contact && `Contact on the day: ${d.notes.contact}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export const waLink = (phone: string | undefined, text: string) => `https://wa.me/${(phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

export function icsFor(d: InviteData): string | null {
  if (!d.date) return null;
  const day = d.date.replace(/-/g, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shaadi OS//EN",
    "BEGIN:VEVENT",
    `UID:${day}-${d.a}-${d.b}@shaadi-os`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${day}`,
    `SUMMARY:${d.a} & ${d.b}'s wedding`,
    `LOCATION:${d.venue}${d.address ? `, ${d.address}` : ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
