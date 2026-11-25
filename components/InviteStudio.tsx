"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Copy, ExternalLink, Loader2, Send } from "lucide-react";
import { CITIES } from "@/lib/data/cities";
import { encodeInvite, LANGS, waLink, type InviteData, type InviteEvent, type InviteSetup } from "@/lib/invite";
import type { Wedding } from "@/lib/types";

const input = "w-full rounded-xl border-2 border-ink/12 bg-paper px-3.5 py-2.5 text-[14.5px] outline-none focus:border-kumkum";

function defaults(w: Wedding): InviteSetup {
  return {
    venue: "",
    address: "",
    rsvpPhone: "",
    events: [
      { name: "Sangeet", when: "", where: "", dress: "Festive, colourful" },
      { name: "Wedding", when: "", where: "", dress: "Traditional" },
      { name: "Reception", when: "", where: "", dress: "Formal" },
    ],
    notes: { parking: "", stay: "", food: "", gifts: "", contact: "" },
    guests: "",
    lang: "en-IN",
    baseUrl: "",
  };
}

export function InviteStudio({ wedding, onPatch }: { wedding: Wedding; onPatch: (p: Partial<Wedding>) => void }) {
  const setup = wedding.invite ?? defaults(wedding);
  const set = (p: Partial<InviteSetup>) => onPatch({ invite: { ...setup, ...p } });
  const [origin, setOrigin] = useState("");
  const [intro, setIntro] = useState("");
  const [translating, setTranslating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);
  const base = (setup.baseUrl || origin).replace(/\/$/, "");

  const data: InviteData = useMemo(
    () => ({
      a: wedding.partnerA,
      b: wedding.partnerB,
      date: wedding.lockedDate,
      city: CITIES[wedding.city].name,
      hindu: wedding.tradition === "hindu-north",
      venue: setup.venue || CITIES[wedding.city].name,
      address: setup.address || undefined,
      events: setup.events.filter((e) => e.name.trim()).map((e) => ({ ...e, where: e.where || undefined, dress: e.dress || undefined })),
      notes: Object.fromEntries(Object.entries(setup.notes).filter(([, v]) => v)),
      rsvpPhone: setup.rsvpPhone || undefined,
    }),
    [wedding, setup],
  );

  // The message that goes with each link, in the chosen language (Sarvam translates it).
  const english = `${wedding.partnerA} & ${wedding.partnerB} are getting married and would love you to celebrate with them. Here is your personal invitation, with every detail, an RSVP, and a helper who answers your questions:`;
  useEffect(() => {
    let on = true;
    if (setup.lang === "en-IN") {
      setIntro(english);
      return;
    }
    setTranslating(true);
    fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: english, target: setup.lang }) })
      .then((r) => r.json())
      .then((j) => on && setIntro(j.text ?? english))
      .catch(() => on && setIntro(english))
      .finally(() => on && setTranslating(false));
    return () => {
      on = false;
    };
  }, [setup.lang, english]);

  const guests = setup.guests
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, phone] = l.split(",").map((s) => s.trim());
      return { name, phone: phone?.replace(/[^\d+]/g, "") };
    });

  const linkFor = (name: string) => `${base}/i/${encodeInvite(data, name)}`;
  const messageFor = (name: string) => `Namaste ${name}! ${intro}\n${linkFor(name)}`;

  const setEvent = (i: number, p: Partial<InviteEvent>) => set({ events: setup.events.map((e, j) => (j === i ? { ...e, ...p } : e)) });

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">(05) Invitations</p>
        <h2 className="mt-2 text-[clamp(30px,4vw,48px)] font-bold leading-[0.98] tracking-[-0.05em]">
          One personal link <span className="font-serif font-normal italic tracking-[-0.035em]">for every guest.</span>
        </h2>
        <p className="mt-3 max-w-xl text-[15px] text-ink/65">
          Each guest gets their own page with the card, every event, an RSVP and a helper that answers their questions in their language. Send it on WhatsApp.
        </p>
      </div>

      <section className="paper card-shadow rounded-[24px] p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink/50">The details guests see</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder="Venue name" value={setup.venue} onChange={(e) => set({ venue: e.target.value })} aria-label="Venue name" />
          <input className={input} placeholder="Venue address" value={setup.address} onChange={(e) => set({ address: e.target.value })} aria-label="Venue address" />
          <input className={input} placeholder="Your WhatsApp number for replies, e.g. 919876543210" value={setup.rsvpPhone} onChange={(e) => set({ rsvpPhone: e.target.value })} aria-label="Your WhatsApp number" inputMode="tel" />
        </div>
        <div className="mt-4 space-y-2">
          {setup.events.map((e, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.3fr_1.3fr_1fr]">
              <input className={input} placeholder="Event" value={e.name} onChange={(ev) => setEvent(i, { name: ev.target.value })} aria-label={`Event ${i + 1} name`} />
              <input className={input} placeholder="When, e.g. Fri 19 Feb, 7 pm" value={e.when} onChange={(ev) => setEvent(i, { when: ev.target.value })} aria-label={`Event ${i + 1} time`} />
              <input className={input} placeholder="Where (if different)" value={e.where ?? ""} onChange={(ev) => setEvent(i, { where: ev.target.value })} aria-label={`Event ${i + 1} place`} />
              <input className={input} placeholder="Dress code" value={e.dress ?? ""} onChange={(ev) => setEvent(i, { dress: ev.target.value })} aria-label={`Event ${i + 1} dress code`} />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["parking", "stay", "food", "gifts", "contact"] as const).map((k) => (
            <input key={k} className={input} placeholder={{ parking: "Parking", stay: "Stay and travel", food: "Food", gifts: "Gifts", contact: "Phone to call on the day" }[k]} value={setup.notes[k] ?? ""} onChange={(e) => set({ notes: { ...setup.notes, [k]: e.target.value } })} aria-label={k} />
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink/50">The helper only knows what you write here. Anything it doesn't know, it tells the guest to ask you.</p>
      </section>

      <section className="paper card-shadow rounded-[24px] p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink/50">Your guests</p>
        <textarea
          className={clsx(input, "mt-3 min-h-[110px] font-mono text-[13px]")}
          placeholder={"One per line: name, phone (optional)\nAarav Sharma, 919812345678\nMeera Iyer"}
          value={setup.guests}
          onChange={(e) => set({ guests: e.target.value })}
          aria-label="Guest list"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink/60">Message language</span>
          {LANGS.map(([code, label]) => (
            <button key={code} onClick={() => set({ lang: code })} aria-pressed={setup.lang === code} className={clsx("rounded-full px-3 py-1.5 text-[13px]", setup.lang === code ? "bg-night text-paper" : "bg-ink/6 text-ink/75 hover:bg-ink/10")}>
              {label}
            </button>
          ))}
          {translating && <Loader2 size={14} className="animate-spin text-ink/50" />}
        </div>
        <p className="mt-2 text-[12px] text-ink/50">Translated by Sarvam AI. The page itself, and the helper, work in any language the guest writes.</p>

        <label className="mt-4 block text-[13px] text-ink/60">
          Public address of this site
          <input className={clsx(input, "mt-1")} value={setup.baseUrl || origin} onChange={(e) => set({ baseUrl: e.target.value })} aria-label="Public address of this site" />
        </label>
        {/localhost|127\.0\.0\.1/.test(base) && <p className="mt-1.5 text-[12px] text-marigold">Links to localhost only open on this computer. Deploy the site (for example on Vercel) and put its address here so guests anywhere can open them.</p>}

        <ul className="mt-5 divide-y divide-dashed divide-ink/15">
          {guests.length === 0 && <li className="py-3 text-[14px] text-ink/50">Add a guest above to get their personal link.</li>}
          {guests.map((g, i) => (
            <li key={`${g.name}-${i}`} className="flex flex-wrap items-center gap-2 py-3">
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{g.name}</span>
              <a href={linkFor(g.name)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-ink/6 px-3 py-2 text-[12.5px] hover:bg-ink/10"><ExternalLink size={13} /> Preview</a>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(linkFor(g.name)).catch(() => {});
                  setCopied(g.name);
                  setTimeout(() => setCopied((c) => (c === g.name ? null : c)), 1500);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink/6 px-3 py-2 text-[12.5px] hover:bg-ink/10"
              >
                <Copy size={13} /> {copied === g.name ? "Copied" : "Copy link"}
              </button>
              <a href={waLink(g.phone, messageFor(g.name))} target="_blank" rel="noreferrer" className="keycap keycap-kumkum inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium">
                <Send size={13} /> WhatsApp
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
