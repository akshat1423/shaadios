import assert from "node:assert/strict";
import test from "node:test";
import { addDays, weekday } from "./dates.ts";
import { MUHURATS, muhuratOn } from "./data/muhurat.ts";
import { attendanceScore, bestMove, candidateDates, priceIndex, rankDates, weatherRisk, windowCovered } from "./dateScore.ts";
import type { Wedding } from "./types.ts";

const base: Wedding = {
  partnerA: "Aanya",
  partnerB: "Kabir",
  city: "delhi",
  tradition: "hindu-north",
  guests: 300,
  budgetLakh: 40,
  windowStart: "2027-02",
  windowEnd: "2027-02",
  priorities: { cost: 50, attendance: 30, weather: 20 },
};

test("muhurat ranges expand to every listed day", () => {
  assert.ok(muhuratOn("2027-02-02") && muhuratOn("2027-02-03"), "2-3 Feb");
  assert.ok(muhuratOn("2027-05-15") && muhuratOn("2027-05-16") && muhuratOn("2027-05-17"), "15-17 May");
  assert.equal(muhuratOn("2027-02-04"), undefined);
  assert.equal(muhuratOn("2027-09-15"), undefined, "no muhurat in Chaturmas");
});

test("hindu-north only offers muhurat dates; other traditions offer every day", () => {
  const hindu = candidateDates(base);
  assert.equal(hindu.length, 12);
  assert.ok(hindu.every((d) => muhuratOn(d)));
  assert.equal(candidateDates({ ...base, tradition: "any" }).length, 28);
});

test("weekends cost more than weekdays, all else equal", () => {
  const sat = "2027-02-27";
  const tue = "2027-03-02";
  assert.equal(weekday(sat), 6);
  assert.equal(weekday(tue), 2);
  assert.ok(priceIndex(sat, "any") > priceIndex(tue, "any"));
});

test("festival clash lowers attendance, a long break raises it", () => {
  assert.ok(attendanceScore("2027-03-23").score < attendanceScore("2027-03-24").score, "Holi vs next day");
  // Sat 14 Aug 2027 + Sun 15 Aug (Independence Day) is only 2 days; Sat 27 Mar 2027 follows Good Friday 26 Mar: 3-day break
  assert.ok(attendanceScore("2027-03-27").reasons.some((r) => r.text.includes("3-day break")));
});

test("climate: monsoon Mumbai is riskier than dry-season Mumbai", () => {
  assert.ok(weatherRisk("2027-07-10", "mumbai") > weatherRisk("2027-02-10", "mumbai") + 40);
});

test("ranking is deterministic, sorted and bounded", () => {
  const a = rankDates(base);
  const b = rankDates(base);
  assert.deepEqual(a, b);
  for (let i = 1; i < a.scores.length; i++) assert.ok(a.scores[i - 1].total >= a.scores[i].total);
  assert.ok(a.scores.every((s) => s.total >= 0 && s.total <= 100));
});

test("cost-first priorities favour cheaper dates than attendance-first", () => {
  const cost = rankDates({ ...base, priorities: { cost: 100, attendance: 0, weather: 0 } }).scores[0];
  const att = rankDates({ ...base, priorities: { cost: 0, attendance: 100, weather: 0 } }).scores[0];
  assert.ok(cost.priceIndex <= att.priceIndex);
  assert.ok(att.attendance >= cost.attendance);
});

test("bestMove: leaving a peak Saturday for a nearby weekday saves money", () => {
  const move = bestMove(base, "2027-02-27");
  assert.ok(move);
  assert.ok(move.to.date !== "2027-02-27");
  assert.ok(move.savingLakh > 0, `expected a saving, got ${move.savingLakh}`);
});

test("coverage: window inside the dataset is covered, one outside is not", () => {
  assert.equal(windowCovered(base), true);
  assert.equal(windowCovered({ windowStart: "2026-01", windowEnd: "2026-03" }), false);
});

test("dataset sanity: sorted, no duplicates, nothing in the known no-muhurat months", () => {
  const dates = MUHURATS.map((m) => m.date);
  assert.deepEqual(dates, [...dates].sort());
  assert.equal(new Set(dates).size, dates.length);
  assert.ok(!dates.some((d) => /^2027-(08|09|10)/.test(d)));
  assert.ok(!dates.some((d) => d >= "2026-12-16" && d <= "2027-01-14"), "Kharmas");
  assert.equal(addDays("2027-02-28", 1), "2027-03-01");
});
