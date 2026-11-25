import assert from "node:assert/strict";
import test from "node:test";
import {
  ADDABLE_IDS,
  applyEdits,
  BASE_IDS,
  COLOURS,
  describeOptions,
  ELEMENT_IDS,
  HEX,
  isStyleOf,
  lightness,
  parseLocal,
  resolveDecor,
  STYLES,
  VENUES,
  VENUE_IDS,
  type Edit,
} from "./decor.ts";

const base = resolveDecor("palace", undefined);
const colour = (edits: Edit[], el: string) => edits.find((e) => e.element === el && e.color !== undefined)?.color;

test("every venue defines a valid colour for every element", () => {
  for (const v of VENUE_IDS) for (const id of ELEMENT_IDS) assert.match(VENUES[v].defaults[id], HEX, `${v}.${id}`);
  for (const [name, hex] of Object.entries(COLOURS)) assert.match(hex, HEX, name);
});

test("changing one element's colour", () => {
  const r = parseLocal("make the flowers marigold", base);
  assert.equal(r.edits.length, 1);
  assert.equal(colour(r.edits, "flowers"), COLOURS.marigold);
});

test("two parts, one colour: 'pillars and flowers in ivory'", () => {
  const r = parseLocal("pillars and flowers in ivory", base);
  assert.equal(colour(r.edits, "pillars"), COLOURS.ivory);
  assert.equal(colour(r.edits, "flowers"), COLOURS.ivory);
});

test("two parts, two colours", () => {
  const r = parseLocal("stage deep red and drapes gold", base);
  assert.ok(lightness(colour(r.edits, "stage")!) < lightness(COLOURS.red), "deep red is darker than red");
  assert.equal(colour(r.edits, "drapes"), COLOURS.gold);
});

test("a modifier on a multi-word colour name", () => {
  const r = parseLocal("canopy light royal blue", base);
  assert.ok(lightness(colour(r.edits, "canopy")!) > lightness(COLOURS["royal blue"]));
});

test("'light blue pillars' is a colour, not the lights element", () => {
  const r = parseLocal("light blue pillars", base);
  assert.equal(r.edits.length, 1);
  assert.equal(r.edits[0].element, "pillars");
});

test("removing and restoring", () => {
  assert.deepEqual(parseLocal("remove the garlands", base).edits, [{ element: "garlands", visible: false }]);
  assert.deepEqual(parseLocal("bring back the garlands", base).edits, [{ element: "garlands", visible: true }]);
  const stage = parseLocal("remove the stage", base);
  assert.equal(stage.edits.length, 0);
  assert.ok(stage.unresolved[0].includes("can't be removed"));
});

test("relative change: darker is darker, lighter is lighter", () => {
  // the stage is a mid-tone, so it can move both ways (the ivory drapes are already near the lightest a colour gets)
  const dark = parseLocal("make the stage darker", base);
  const light = parseLocal("make the stage lighter", base);
  assert.ok(lightness(colour(dark.edits, "stage")!) < lightness(base.stage.color));
  assert.ok(lightness(colour(light.edits, "stage")!) > lightness(base.stage.color));
});

test("a bare palette sets a main and an accent colour", () => {
  const r = parseLocal("make it royal red and gold", base);
  assert.equal(colour(r.edits, "drapes"), COLOURS["royal red"]);
  assert.equal(colour(r.edits, "pillars"), COLOURS.gold);
  assert.ok(!r.edits.some((e) => e.element === "floor" || e.element === "walls"), "the venue itself is untouched");
});

test("'everything' recolours decor but not the venue", () => {
  const r = parseLocal("make everything ivory", base);
  assert.ok(r.edits.length >= 8);
  assert.ok(!r.edits.some((e) => e.element === "walls" || e.element === "floor"));
});

test("gibberish changes nothing and says so", () => {
  const r = parseLocal("sing me a song", base);
  assert.equal(r.edits.length, 0);
  assert.ok(r.unresolved.length > 0);
});

test("a hex colour is accepted", () => {
  assert.equal(colour(parseLocal("aisle #123abc", base).edits, "aisle"), "#123abc");
});

test("edits layer onto overrides without losing earlier ones", () => {
  const a = applyEdits(undefined, [{ element: "flowers", color: "#112233" }]);
  const b = applyEdits(a, [{ element: "flowers", visible: false }, { element: "aisle", color: "#445566" }]);
  const state = resolveDecor("palace", b);
  assert.equal(state.flowers.color, "#112233");
  assert.equal(state.flowers.visible, false);
  assert.equal(state.aisle.color, "#445566");
  assert.equal(state.stage.color, VENUES.palace.defaults.stage);
});

/* ---------------------------------------------------------------- styles and added parts */

const edit = (edits: Edit[], el: string) => edits.find((e) => e.element === el);

test("parts that can be added start hidden unless the venue ships with them", () => {
  const palace = resolveDecor("palace", undefined);
  assert.equal(palace.fountain.visible, false);
  assert.equal(palace.rangoli.visible, true, "palace ships with a rangoli");
  assert.equal(resolveDecor("banquet", undefined).chandeliers.visible, true);
  assert.equal(resolveDecor("garden", undefined).chandeliers.visible, false);
  for (const id of BASE_IDS) assert.equal(palace[id].visible, true);
});

test("every part with styles starts on its first style, every style is reachable by an alias", () => {
  const base = resolveDecor("palace", undefined);
  assert.equal(base.canopy.style, "pyramid");
  assert.equal(base.fountain.style, "");
  for (const [el, options] of Object.entries(STYLES)) {
    for (const opt of options!) {
      assert.ok(opt.aliases.length > 0 || opt.id === options![0].id, `${el}.${opt.id} has an alias`);
      assert.ok(isStyleOf(el as never, opt.id));
    }
  }
  assert.equal(isStyleOf("canopy", "hexagon"), false);
});

test("style phrases choose a design for the right part", () => {
  assert.equal(edit(parseLocal("dome canopy", base).edits, "canopy")?.style, "dome");
  assert.equal(edit(parseLocal("make the pillars fluted", base).edits, "pillars")?.style, "fluted");
  assert.equal(edit(parseLocal("lush flowers", base).edits, "flowers")?.style, "lush");
  assert.equal(edit(parseLocal("petal path", base).edits, "aisle")?.style, "petals");
  assert.equal(edit(parseLocal("curtain lights", base).edits, "lights")?.style, "curtain");
  assert.equal(edit(parseLocal("checkerboard floor", base).edits, "floor")?.style, "checker");
});

test("'floral wall' is a drapes style, not the walls or the flowers", () => {
  const r = parseLocal("I want a floral wall", base);
  assert.equal(edit(r.edits, "drapes")?.style, "floral");
  assert.equal(edit(r.edits, "walls"), undefined);
  assert.equal(edit(r.edits, "flowers"), undefined);
});

test("a style and a colour in one request", () => {
  const r = parseLocal("round stage in ivory", base);
  assert.equal(edit(r.edits, "stage")?.style, "round");
  assert.equal(edit(r.edits, "stage")?.color, COLOURS.ivory);
});

test("two style changes in one request", () => {
  const r = parseLocal("dome canopy and square pillars", base);
  assert.equal(edit(r.edits, "canopy")?.style, "dome");
  assert.equal(edit(r.edits, "pillars")?.style, "square");
});

test("adding parts brings them into the venue", () => {
  assert.equal(edit(parseLocal("add a fountain", base).edits, "fountain")?.visible, true);
  assert.equal(edit(parseLocal("I want a photo wall", base).edits, "photobooth")?.visible, true);
  assert.equal(edit(parseLocal("add diyas along the aisle", base).edits, "diyas")?.visible, true);
  const swing = parseLocal("add a flower swing in rose", base);
  assert.equal(edit(swing.edits, "jhula")?.visible, true);
  assert.equal(edit(swing.edits, "jhula")?.color, COLOURS.rose);
});

test("colouring or styling a part that isn't in the venue yet brings it in", () => {
  const blue = parseLocal("make the fountain blue", base);
  assert.equal(edit(blue.edits, "fountain")?.visible, true);
  assert.equal(edit(blue.edits, "fountain")?.color, COLOURS.blue);
  assert.equal(edit(parseLocal("pointed arch", base).edits, "arch")?.visible, true);
  assert.equal(edit(parseLocal("pointed arch", base).edits, "arch")?.style, "pointed");
});

test("'arch' is the entrance arch and 'chandelier' is its own part", () => {
  const arch = parseLocal("add an arch", base);
  assert.equal(edit(arch.edits, "arch")?.visible, true);
  assert.equal(edit(arch.edits, "walls"), undefined);
  assert.equal(edit(parseLocal("add a chandelier", base).edits, "chandeliers")?.visible, true);
  assert.equal(edit(parseLocal("add a chandelier", base).edits, "lights"), undefined);
});

test("removing an added part", () => {
  const withFountain = applyEdits(undefined, [{ element: "fountain", visible: true }]);
  const state = resolveDecor("palace", withFountain);
  assert.deepEqual(parseLocal("remove the fountain", state).edits, [{ element: "fountain", visible: false }]);
});

test("styles layer onto overrides with colours and visibility", () => {
  const o = applyEdits(undefined, [{ element: "canopy", style: "dome" }, { element: "canopy", color: "#112233" }, { element: "fountain", visible: true }]);
  const s = resolveDecor("palace", o);
  assert.equal(s.canopy.style, "dome");
  assert.equal(s.canopy.color, "#112233");
  assert.equal(s.fountain.visible, true);
});

test("the model's menu names every part and every style", () => {
  const menu = describeOptions();
  for (const id of ELEMENT_IDS) assert.ok(menu.includes(`- ${id}:`), id);
  for (const options of Object.values(STYLES)) for (const o of options!) assert.ok(menu.includes(o.id), o.id);
  assert.equal(ADDABLE_IDS.length + BASE_IDS.length, ELEMENT_IDS.length);
});
