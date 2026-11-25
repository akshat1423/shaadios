"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { CalendarPlus, Loader2, MapPin, MessageCircle, Send, X } from "lucide-react";
import { decodeInvite, factSheet, icsFor, waLink, type InviteData } from "@/lib/invite";
import { formatDate } from "@/lib/dates";
import { CARD_H, CARD_W, CardFaces } from "./WeddingCard";
import { Toran } from "./Toran";

const DIETS = ["Vegetarian", "Jain", "Vegan", "Non-veg"] as const;
const SUGGESTIONS = ["Where is the venue?", "What should I wear?", "Where can I park?", "कौन से कार्यक्रम हैं?"];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function GuestInvite({ payload }: { payload: string }) {
  const parsed = useMemo(() => decodeInvite(payload), [payload]);
  if (!parsed)
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-6 text-center">
        <div>
          <p className="text-[28px] font-bold tracking-[-0.04em]">This invitation link looks incomplete.</p>
          <p className="mt-2 text-[15px] text-ink/60">Ask the couple to send it again.</p>
        </div>
      </main>
    );
  return <Page d={parsed.d} guest={parsed.g} />;
}

function Page({ d, guest }: { d: InviteData; guest: string }) {
  const first = guest.trim().split(/\s+/)[0] || "";
  const mapsQuery = encodeURIComponent(`${d.venue} ${d.address ?? ""} ${d.city}`.trim());
  const ics = icsFor(d);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-28 pt-6 sm:px-8">
      <p className="text-center text-[22px] tracking-[-0.045em]">
        <span className="font-bold">shaadi</span> <span className="font-serif italic tracking-[-0.03em]">os</span>
      </p>

      {/* The card */}
      <section className="stage-dark relative mt-5 overflow-hidden rounded-[30px] px-4 pb-10 pt-24">
        <Toran className="pointer-events-none absolute inset-x-0 top-0 h-[88px] w-full" />
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.1 }}
          className="relative mx-auto"
          style={{ width: CARD_W, height: CARD_H, maxWidth: "100%" }}
        >
          <CardFaces card={{ a: d.a, b: d.b, date: d.date, city: d.city, hindu: d.hindu }} />
        </motion.div>
      </section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="mt-10 text-center">
        {first && <p className="font-serif text-[22px] italic text-kumkum">Namaste, {first}</p>}
        <h1 className="mt-2 text-[clamp(32px,6vw,52px)] font-bold leading-[1] tracking-[-0.05em]">
          {d.a} &amp; {d.b} <span className="font-serif font-normal italic tracking-[-0.035em]">invite you to celebrate.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[16px] text-ink/65">
          {d.date ? formatDate(d.date) : "Date to be announced"} · {d.venue}, {d.city}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="#rsvp" className="keycap keycap-kumkum inline-flex items-center gap-2 px-6 py-3.5 text-[12.5px] font-medium">Reply to the invitation</a>
          <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noreferrer" className="keycap inline-flex items-center gap-2 px-5 py-3.5 text-[12.5px] font-medium">
            <MapPin size={14} /> Directions
          </a>
          {ics && (
            <a href={ics} download="wedding.ics" className="keycap inline-flex items-center gap-2 px-5 py-3.5 text-[12.5px] font-medium">
              <CalendarPlus size={14} /> Add to calendar
            </a>
          )}
        </div>
      </motion.section>

      {/* Events */}
      <section className="mt-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">(01) The celebrations</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {d.events.map((e, i) => (
            <motion.div
              key={`${e.name}-${i}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 240, damping: 24, delay: i * 0.05 }}
              className="paper card-shadow rounded-[22px] p-5"
            >
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink/45">0{i + 1}</p>
              <p className="mt-1 text-[22px] font-bold tracking-[-0.04em]">{e.name}</p>
              <p className="mt-1 text-[14.5px] text-ink/75">{e.when}</p>
              {e.where && <p className="mt-0.5 text-[13.5px] text-ink/55">{e.where}</p>}
              {e.dress && <p className="mt-3 inline-block rounded-full bg-marigold/20 px-3 py-1 text-[12.5px] text-ink/80">Dress: {e.dress}</p>}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Good to know */}
      {Object.values(d.notes).some(Boolean) && (
        <section className="mt-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">(02) Good to know</p>
          <dl className="paper card-shadow mt-4 divide-y divide-dashed divide-ink/15 rounded-[22px] px-5">
            {(
              [
                ["Parking", d.notes.parking],
                ["Stay and travel", d.notes.stay],
                ["Food", d.notes.food],
                ["Gifts", d.notes.gifts],
                ["On the day, call", d.notes.contact],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:gap-6">
                  <dt className="w-40 shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/50">{k}</dt>
                  <dd className="text-[15px] text-ink/85">{v}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      <Rsvp d={d} guest={guest} />
      <Chat d={d} guest={guest} />
    </main>
  );
}

function Rsvp({ d, guest }: { d: InviteData; guest: string }) {
  const [coming, setComing] = useState<boolean | null>(null);
  const [count, setCount] = useState(1);
  const [diet, setDiet] = useState<string>("Vegetarian");
  const [note, setNote] = useState("");

  const text =
    coming === false
      ? `Hello! This is ${guest || "a guest"}. Thank you for the invitation to ${d.a} & ${d.b}'s wedding. I'm sorry, I won't be able to make it.${note ? ` ${note}` : ""}`
      : `Hello! This is ${guest || "a guest"}. Thank you for the invitation to ${d.a} & ${d.b}'s wedding. I'll be there! ${count} ${count === 1 ? "person" : "people"}, food: ${diet}.${note ? ` ${note}` : ""}`;

  return (
    <section id="rsvp" className="mt-14 scroll-mt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kumkum">(03) Will you join us?</p>
      <div className="paper card-shadow mt-4 rounded-[26px] p-6">
        <div className="grid grid-cols-2 gap-3">
          {[
            [true, "Joyfully accept"],
            [false, "Regretfully decline"],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              onClick={() => setComing(v as boolean)}
              aria-pressed={coming === v}
              className={clsx(
                "rounded-2xl border-2 px-4 py-4 text-[15px] font-semibold transition-colors",
                coming === v ? (v ? "border-mehendi bg-mehendi/10" : "border-kumkum bg-kumkum/10") : "border-ink/12 hover:border-ink/25",
              )}
            >
              {label as string}
            </button>
          ))}
        </div>

        {coming === true && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium">How many of you?</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setCount((c) => Math.max(1, c - 1))} className="h-9 w-9 rounded-full bg-ink/8 text-[18px]" aria-label="One fewer">–</button>
                <span className="w-6 text-center text-[18px] font-bold">{count}</span>
                <button onClick={() => setCount((c) => Math.min(12, c + 1))} className="h-9 w-9 rounded-full bg-ink/8 text-[18px]" aria-label="One more">+</button>
              </div>
            </div>
            <div>
              <p className="text-[15px] font-medium">Food preference</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIETS.map((x) => (
                  <button key={x} onClick={() => setDiet(x)} aria-pressed={diet === x} className={clsx("rounded-full px-4 py-2 text-[13.5px]", diet === x ? "bg-night text-paper" : "bg-ink/6 text-ink/80 hover:bg-ink/10")}>
                    {x}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {coming !== null && (
          <>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="A note for the couple (optional)" className="mt-5 w-full rounded-xl border-2 border-ink/12 bg-transparent px-4 py-3 text-[15px] outline-none focus:border-kumkum" />
            <a href={waLink(d.rsvpPhone, text)} target="_blank" rel="noreferrer" className="keycap keycap-kumkum mt-5 flex items-center justify-center gap-2 px-6 py-4 text-[13px] font-medium">
              <Send size={15} /> Send my reply on WhatsApp
            </a>
            <p className="mt-2 text-center text-[12px] text-ink/50">Opens WhatsApp with your reply ready to send to {d.a} &amp; {d.b}.</p>
          </>
        )}
      </div>
    </section>
  );
}

function Chat({ d, guest }: { d: InviteData; guest: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const facts = useMemo(() => factSheet(d), [d]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: question }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/guest-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, couple: `${d.a} and ${d.b}`, messages: next.slice(-8), identity: `wedding:${d.a}-${d.b}`.toLowerCase().replace(/\s+/g, "-") }),
      });
      const data = await res.json();
      setMsgs([...next, { role: "assistant", content: data.reply ?? "Sorry, I couldn't answer that." }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "I couldn't connect. Please check your internet and try again." }]);
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={clsx("keycap keycap-kumkum fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 px-5 py-3.5 text-[12.5px] font-medium", open && "hidden")}>
        <MessageCircle size={16} /> Ask about the wedding
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="paper card-shadow fixed inset-x-3 bottom-3 z-40 flex max-h-[78vh] flex-col overflow-hidden rounded-[26px] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[390px]"
          >
            <div className="flex items-center justify-between bg-night px-5 py-3.5 text-paper">
              <div>
                <p className="text-[15px] font-semibold">Wedding helper</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/50">Ask in any Indian language</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-paper/10" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="min-h-[160px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {msgs.length === 0 && (
                <>
                  <p className="text-[14.5px] text-ink/75">Namaste{guest ? `, ${guest.split(/\s+/)[0]}` : ""}! I know the schedule, venue, dress codes and more. What would you like to know?</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => ask(s)} className="rounded-full bg-ink/6 px-3 py-1.5 text-[13px] text-ink/80 hover:bg-ink/10">{s}</button>
                    ))}
                  </div>
                </>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={clsx("max-w-[88%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-snug", m.role === "user" ? "ml-auto bg-night text-paper" : "bg-ink/6 text-ink/90")}>{m.content}</div>
              ))}
              {busy && <div className="flex w-fit items-center gap-2 rounded-2xl bg-ink/6 px-4 py-2.5 text-[13.5px] text-ink/60"><Loader2 size={14} className="animate-spin" /> Typing…</div>}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex items-center gap-2 border-t border-ink/10 p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Type your question…" aria-label="Your question" className="min-w-0 flex-1 rounded-xl bg-ink/6 px-4 py-3 text-[15px] outline-none focus:bg-ink/10" />
              <button type="submit" disabled={busy || !text.trim()} className="keycap keycap-kumkum px-4 py-3 text-[12px]" aria-label="Send"><Send size={14} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
