import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ELEMENT_IDS, shade, VENUES, type DecorState, type ElementId, type VenueId } from "./decor.ts";

/*
 * A procedural 3D venue. Nothing is loaded: every pillar, flower and chair is built from primitives, so it works
 * offline, costs no assets, and every part is an object we can restyle.
 *
 * Each ElementId has a builder `build[el](style)` that fills that element's THREE.Group. Changing a part's design
 * clears and rebuilds only that group (geometry disposed, materials kept so colours keep tweening), so "dome canopy"
 * doesn't disturb the flowers. Parts that depend on another (everything that lines up with the stage) are rebuilt
 * together when it changes.
 *
 * Units are metres. The stage is at the back (negative z); the camera starts at the entrance (positive z).
 */

export type ViewPreset = "entrance" | "stage" | "guest" | "aerial";

export interface SceneCallbacks {
  onPick: (el: ElementId | null) => void;
  onHover: (el: ElementId | null, x: number, y: number) => void;
}

export interface VenueController {
  apply(state: Record<ElementId, DecorState>): void;
  setSelected(el: ElementId | null): void;
  setView(view: ViewPreset): void;
  dispose(): void;
}

const VIEWS: Record<ViewPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  entrance: { pos: [0, 2.5, 20.5], target: [0, 2.6, -10] },
  stage: { pos: [0.6, 1.9, -2.5], target: [0, 2.3, -11] },
  guest: { pos: [-4.4, 1.45, 3], target: [0, 2.4, -11] },
  aerial: { pos: [17, 19, 17], target: [0, 0, -3] },
};

const STAGE_TOP = 0.7;
const ROOF_Y = STAGE_TOP + 3.62;
const AISLE_END = 13.7;
const ARCH_Z = 13.9;
const FOUNTAIN_Z = 17.4;

/** Elements whose layout follows the stage, so they are rebuilt when its shape changes. */
const STAGE_DEPENDENTS: ElementId[] = ["aisle", "chairs", "flowers", "diyas"];

/** How much of its own colour an element emits. Lit parts glow; the rest only brighten when highlighted. */
const GLOW: Partial<Record<ElementId, number>> = { lights: 1, lanterns: 0.6, chandeliers: 1 };

/** Small deterministic random so every rebuild of a part looks the same. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Owned {
  geos: THREE.BufferGeometry[];
  insts: THREE.InstancedMesh[];
  extras: { dispose(): void }[];
}

export function createVenueScene(host: HTMLElement, venueId: VenueId, cb: SceneCallbacks): VenueController {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const backdrop = new THREE.Color(VENUES[venueId].backdrop);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;outline:none";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = backdrop;
  scene.fog = new THREE.Fog(backdrop, venueId === "banquet" ? 42 : 36, venueId === "banquet" ? 84 : 80);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 160);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 1.5;
  controls.maxDistance = 48;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.zoomSpeed = 0.8;

  /* ---------------------------------------------------------------- lighting */
  scene.add(new THREE.HemisphereLight(venueId === "banquet" ? 0xffe9c8 : 0xcfd9ff, 0x2a1d18, venueId === "banquet" ? 0.55 : 0.75));
  const key = new THREE.DirectionalLight(0xffe2b8, venueId === "banquet" ? 0.7 : 1.5);
  key.position.set(11, 22, 14);
  key.target.position.set(0, 0, -4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 75 });
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const glow: THREE.PointLight[] = [];
  for (const [x, y, z] of [[0, 3, -10], [-7, 4, 0], [7, 4, 0], [0, 4, 8]] as const) {
    const p = new THREE.PointLight(0xffd98a, 14, 20, 1.6);
    p.position.set(x, y, z);
    glow.push(p);
    scene.add(p);
  }

  /* ---------------------------------------------------------------- element bookkeeping */
  const groups = {} as Record<ElementId, THREE.Group>;
  const materials = {} as Record<ElementId, THREE.MeshStandardMaterial[]>;
  const owned = {} as Record<ElementId, Owned>;
  const animators = new Map<ElementId, (t: number) => void>();
  for (const id of ELEMENT_IDS) {
    groups[id] = new THREE.Group();
    groups[id].name = id;
    materials[id] = [];
    owned[id] = { geos: [], insts: [], extras: [] };
    scene.add(groups[id]);
  }
  let current: Record<ElementId, DecorState> | null = null;
  /** Where the stage ends, so the aisle, seating and flowers start the right distance from it. */
  const layout = { stageFront: -8.3 };

  /** One material per (element, shade offset): variation that still follows the element's colour. */
  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  function mat(el: ElementId, dl = 0, rough = 0.72, metal = 0): THREE.MeshStandardMaterial {
    const k = `${el}|${dl}|${rough}|${metal}`;
    let m = matCache.get(k);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ roughness: rough, metalness: metal });
      m.userData.dl = dl;
      const target = new THREE.Color(current ? shade(current[el].color, dl) : "#ffffff");
      m.userData.target = target;
      m.color.copy(target);
      const g = GLOW[el];
      if (g) {
        m.emissive.copy(target).multiplyScalar(g);
        m.emissiveIntensity = el === "lanterns" ? 1.2 : 2.2;
      }
      if (el === "rangoli") Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      matCache.set(k, m);
      materials[el].push(m);
    }
    return m;
  }

  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt: number, rb: number, h: number, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const sph = (r: number, ws = 16, hs = 12) => new THREE.SphereGeometry(r, ws, hs);

  interface Opts {
    rx?: number;
    ry?: number;
    rz?: number;
    shadow?: boolean;
    parent?: THREE.Object3D;
  }

  function add(el: ElementId, geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, o: Opts = {}) {
    owned[el].geos.push(geo);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    mesh.castShadow = o.shadow !== false;
    mesh.receiveShadow = true;
    mesh.userData.element = el;
    (o.parent ?? groups[el]).add(mesh);
    return mesh;
  }

  /** A fixed-colour prop belonging to an element (stands, chains): hides and rebuilds with it, never recoloured. */
  function prop(el: ElementId, geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, rough = 0.6, metal = 0, o: Opts = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    owned[el].extras.push(m);
    return add(el, geo, m, x, y, z, o);
  }

  function fixedMat(el: ElementId, params: THREE.MeshStandardMaterialParameters) {
    const m = new THREE.MeshStandardMaterial(params);
    owned[el].extras.push(m);
    return m;
  }

  function inst(el: ElementId, geo: THREE.BufferGeometry, m: THREE.Material, count: number, shadow = true, parent?: THREE.Object3D) {
    owned[el].geos.push(geo);
    const mesh = new THREE.InstancedMesh(geo, m, Math.max(1, count));
    mesh.count = count;
    mesh.userData.element = el;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    (parent ?? groups[el]).add(mesh);
    owned[el].insts.push(mesh);
    return mesh;
  }

  const tmp = new THREE.Object3D();
  const tintC = new THREE.Color();
  function place(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, s = 1, rx = 0, ry = 0, rz = 0, sy = s, sz = s) {
    tmp.position.set(x, y, z);
    tmp.rotation.set(rx, ry, rz);
    tmp.scale.set(s, sy, sz);
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
  }
  const tint = (mesh: THREE.InstancedMesh, i: number, v: number) => mesh.setColorAt(i, tintC.setScalar(v));

  /* ---------------------------------------------------------------- shared layout facts */
  // reseeded for every build, so a part looks the same each time it is rebuilt
  let rand = rng(13);
  const aisleStart = () => layout.stageFront + 0.05;
  const seatStart = () => layout.stageFront + 3.1;

  const tableSpots = (): [number, number][] =>
    venueId === "palace"
      ? [-4, 2, 8].flatMap((z) => [[-11.5, z], [11.5, z]] as [number, number][])
      : venueId === "garden"
        ? [-6, -1, 4, 9].flatMap((z) => [[-12, z], [12, z]] as [number, number][])
        : [-6, -1, 4, 9].flatMap((z) => [[-10, z], [10, z]] as [number, number][]);

  const PILLARS: [number, number][] = [
    [-2.5, -9.6],
    [2.5, -9.6],
    [-2.5, -12.6],
    [2.5, -12.6],
  ];

  /** Sample points along a curve, for hanging flowers on an arch. */
  const sample = (curve: THREE.Curve<THREE.Vector3>, n: number) => Array.from({ length: n }, (_, i) => curve.getPoint(i / (n - 1)));

  /* ================================================================ builders */
  const builders: Record<ElementId, (style: string) => void> = {
    /* ------------------------------------------------------------ floor */
    floor(style) {
      const size = venueId === "garden" ? 130 : 56;
      const m = mat("floor", 0, 0.9);
      m.map = null;
      if (style === "checker") {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const g = c.getContext("2d")!;
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, 128, 128);
        g.fillStyle = "#b4b4b4";
        g.fillRect(0, 0, 64, 64);
        g.fillRect(64, 64, 64, 64);
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        tex.repeat.set(size / 4, size / 4);
        owned.floor.extras.push(tex);
        m.map = tex;
      }
      m.needsUpdate = true;
      add("floor", new THREE.PlaneGeometry(size, size), m, 0, 0, 0, { rx: -Math.PI / 2, shadow: false });
    },

    /* ------------------------------------------------------------ stage */
    stage(style) {
      const sm = (dl = 0, r = 0.55) => mat("stage", dl, r);
      if (style === "round") {
        layout.stageFront = -6.1;
        add("stage", cyl(4.9, 4.9, 0.6, 56), sm(), 0, 0.3, -11);
        add("stage", cyl(5.0, 5.0, 0.12, 56), sm(0.08, 0.4), 0, 0.64, -11, { shadow: false });
        add("stage", box(3.6, 0.3, 0.8), sm(-0.06), 0, 0.15, -5.55);
        add("stage", box(3.2, 0.45, 0.5), sm(-0.1), 0, 0.225, -5.8);
      } else if (style === "tiered") {
        layout.stageFront = -8.1;
        add("stage", box(10.8, 0.3, 5.8), sm(-0.08), 0, 0.15, -11);
        add("stage", box(9, 0.4, 4.8), sm(), 0, 0.5, -11);
        add("stage", box(9.3, 0.1, 5.1), sm(0.08, 0.4), 0, 0.65, -11, { shadow: false });
        add("stage", box(3.6, 0.15, 0.7), sm(-0.12), 0, 0.075, -7.75);
        add("stage", box(3.2, 0.3, 0.45), sm(-0.12), 0, 0.15, -7.95);
      } else {
        layout.stageFront = -8.3;
        add("stage", box(10, 0.6, 5.2), sm(), 0, 0.3, -11);
        add("stage", box(10.3, 0.12, 5.5), sm(0.08, 0.4), 0, 0.64, -11, { shadow: false });
        add("stage", box(3.6, 0.3, 0.8), sm(-0.06), 0, 0.15, -7.95);
        add("stage", box(3.2, 0.45, 0.5), sm(-0.1), 0, 0.225, -8.2);
      }
    },

    /* ------------------------------------------------------------ pillars */
    pillars(style) {
      for (const [x, z] of PILLARS) {
        if (style === "square") {
          add("pillars", box(0.38, 3.6, 0.38), mat("pillars", 0, 0.5, 0.1), x, STAGE_TOP + 1.8, z);
        } else if (style === "fluted") {
          add("pillars", cyl(0.14, 0.16, 3.6, 20), mat("pillars", -0.05, 0.5, 0.1), x, STAGE_TOP + 1.8, z);
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            add("pillars", cyl(0.045, 0.05, 3.6, 8), mat("pillars", 0.03, 0.45, 0.1), x + Math.cos(a) * 0.17, STAGE_TOP + 1.8, z + Math.sin(a) * 0.17);
          }
        } else {
          add("pillars", cyl(0.17, 0.2, 3.6, 24), mat("pillars", 0, 0.45, 0.1), x, STAGE_TOP + 1.8, z);
        }
        add("pillars", box(0.54, 0.22, 0.54), mat("pillars", -0.1, 0.5, 0.1), x, STAGE_TOP + 0.11, z);
        add("pillars", box(0.5, 0.2, 0.5), mat("pillars", 0.08, 0.5, 0.1), x, STAGE_TOP + 3.5, z);
        add("pillars", sph(0.11, 12, 10), mat("pillars", 0.1, 0.35, 0.2), x, STAGE_TOP + 3.72, z);
      }
    },

    /* ------------------------------------------------------------ canopy */
    canopy(style) {
      const cm = (dl = 0, r = 0.7, m = 0) => mat("canopy", dl, r, m);
      const fringe = () => {
        for (const sz of [-1, 1]) add("canopy", box(6.2, 0.3, 0.05), cm(0.12), 0, ROOF_Y - 0.2, -11.1 + sz * 2.1);
        for (const sx of [-1, 1]) add("canopy", box(0.05, 0.3, 4.2), cm(0.12), sx * 3.1, ROOF_Y - 0.2, -11.1);
      };
      if (style === "dome") {
        add("canopy", box(6.2, 0.14, 4.2), cm(), 0, ROOF_Y, -11.1);
        const dome = add("canopy", new THREE.SphereGeometry(3.0, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), cm(-0.04), 0, ROOF_Y + 0.07, -11.1);
        dome.scale.set(1, 0.78, 0.7);
        add("canopy", sph(0.24, 16, 12), cm(0.12, 0.3, 0.3), 0, ROOF_Y + 0.07 + 3.0 * 0.78 + 0.2, -11.1);
        add("canopy", cyl(0.02, 0.1, 0.5, 10), cm(0.12, 0.3, 0.3), 0, ROOF_Y + 0.07 + 3.0 * 0.78 + 0.55, -11.1);
        fringe();
      } else if (style === "flat") {
        add("canopy", box(6.4, 0.34, 4.4), cm(), 0, ROOF_Y + 0.05, -11.1);
        add("canopy", box(6.6, 0.1, 4.6), cm(0.12), 0, ROOF_Y + 0.26, -11.1);
        fringe();
        const tassels = inst("canopy", sph(0.07, 8, 6), cm(0.15), 80);
        let i = 0;
        for (let x = -3.1; x <= 3.11; x += 0.31) {
          place(tassels, i++, x, ROOF_Y - 0.4, -9.0);
          place(tassels, i++, x, ROOF_Y - 0.4, -13.2);
        }
        for (let z = -12.9; z <= -9.3; z += 0.4) {
          place(tassels, i++, -3.2, ROOF_Y - 0.4, z);
          place(tassels, i++, 3.2, ROOF_Y - 0.4, z);
        }
        tassels.count = i;
      } else if (style === "frame") {
        const beam = (w: number, h: number, d: number, x: number, y: number, z: number) => add("canopy", box(w, h, d), cm(-0.04, 0.5, 0.15), x, y, z);
        for (const sz of [-1, 1]) beam(6.4, 0.12, 0.12, 0, ROOF_Y, -11.1 + sz * 2.1);
        for (const sx of [-1, 1]) beam(0.12, 0.12, 4.3, sx * 3.1, ROOF_Y, -11.1);
        for (const x of [-1.55, 0, 1.55]) beam(0.08, 0.08, 4.2, x, ROOF_Y + 0.02, -11.1);
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const len = 2.6;
          const t = add("canopy", cyl(0.04, 0.04, len, 8), cm(-0.04, 0.5, 0.15), dx * 1.55, ROOF_Y + 0.85, -11.1 + dz * 1.05);
          t.rotation.set(dz * 0.55, 0, -dx * 0.5);
        }
        add("canopy", new THREE.TorusGeometry(0.5, 0.05, 8, 24), cm(0.1, 0.4, 0.3), 0, ROOF_Y + 1.7, -11.1, { rx: Math.PI / 2 });
        add("canopy", sph(0.2, 12, 10), cm(0.12, 0.3, 0.3), 0, ROOF_Y + 1.95, -11.1);
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) add("canopy", sph(0.13, 10, 8), cm(0.15, 0.4, 0.3), dx * 3.1, ROOF_Y - 0.25, -11.1 + dz * 2.1);
      } else {
        add("canopy", box(6.2, 0.14, 4.2), cm(), 0, ROOF_Y, -11.1);
        add("canopy", new THREE.ConeGeometry(3.9, 1.5, 4), cm(-0.05), 0, ROOF_Y + 0.82, -11.1, { ry: Math.PI / 4 });
        add("canopy", new THREE.ConeGeometry(1.2, 0.7, 4), cm(0.1, 0.5, 0.2), 0, ROOF_Y + 1.9, -11.1, { ry: Math.PI / 4 });
        fringe();
      }
    },

    /* ------------------------------------------------------------ drapes */
    drapes(style) {
      const dm = (dl = 0, r = 0.9) => mat("drapes", dl, r);
      if (style === "plain") {
        add("drapes", box(13.4, 6.4, 0.1), dm(), 0, 3.7, -13.5, { shadow: false });
        for (const sx of [-1, 1]) add("drapes", box(0.1, 6.2, 4.2), dm(-0.04), sx * 6.5, 3.6, -11.3, { shadow: false });
      } else if (style === "floral") {
        add("drapes", box(13.4, 6.4, 0.2), dm(-0.28, 0.95), 0, 3.7, -13.6, { shadow: false });
        const cols = 50;
        const rows = 22;
        const wall = inst("drapes", new THREE.IcosahedronGeometry(0.15, 0), dm(0, 0.85), cols * rows, false);
        let i = 0;
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            const x = -6.5 + (c + (r % 2) * 0.5) * 0.27 + (rand() - 0.5) * 0.05;
            const y = 0.7 + r * 0.27 + (rand() - 0.5) * 0.05;
            place(wall, i, x, y, -13.38 + rand() * 0.1, 0.8 + rand() * 0.55, rand() * 3, rand() * 3, rand() * 3);
            tint(wall, i, 0.72 + rand() * 0.28);
            i++;
          }
        wall.count = i;
        for (const sx of [-1, 1]) add("drapes", box(0.1, 6.2, 4.2), dm(-0.04), sx * 6.7, 3.6, -11.3, { shadow: false });
      } else {
        for (let i = 0; i < 44; i++) {
          const x = -6.45 + i * 0.3;
          add("drapes", box(0.31, 6.4, 0.09), dm((i % 2) * -0.05), x, 3.7, -13.55 + Math.sin(i * 1.3) * 0.1, { shadow: false });
        }
        for (const sx of [-1, 1])
          for (let i = 0; i < 14; i++)
            add("drapes", box(0.09, 6.2, 0.31), dm((i % 2) * -0.05), sx * 6.5 + Math.sin(i * 1.2) * 0.08, 3.6, -13.4 + i * 0.3, { shadow: false });
      }
      // swags between the pillar tops, in every style
      const top = STAGE_TOP + 3.4;
      const swag = (a: THREE.Vector3, b: THREE.Vector3, sag: number) => {
        const mid = a.clone().lerp(b, 0.5);
        mid.y -= sag;
        add("drapes", new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.09, 8, false), dm(0.05, 0.85));
      };
      for (let s = 0; s < 3; s++) {
        const x0 = -2.5 + (s * 5) / 3;
        const x1 = -2.5 + ((s + 1) * 5) / 3;
        swag(new THREE.Vector3(x0, top, -9.6), new THREE.Vector3(x1, top, -9.6), 0.55);
        swag(new THREE.Vector3(x0, top, -12.6), new THREE.Vector3(x1, top, -12.6), 0.55);
      }
      for (const sx of [-1, 1]) for (let s = 0; s < 2; s++) swag(new THREE.Vector3(sx * 2.5, top, -9.6 - s * 1.5), new THREE.Vector3(sx * 2.5, top, -9.6 - (s + 1) * 1.5), 0.5);
    },

    /* ------------------------------------------------------------ flowers */
    flowers(style) {
      const d = style === "lush" ? 1.9 : style === "sparse" ? 0.4 : 1;
      const pts: THREE.Vector3[] = [];
      const push = (x: number, y: number, z: number) => pts.push(new THREE.Vector3(x, y, z));
      const front = layout.stageFront;
      if (front < -7) {
        for (let x = -4.7; x <= 4.7; x += 0.3 / d) {
          push(x + rand() * 0.08, 0.76, front + 0.0 + rand() * 0.12);
          if (d > 0.5) push(x + 0.15, 0.93, front + 0.03 + rand() * 0.1);
        }
      } else {
        for (let a = -1.3; a <= 1.3; a += 0.075 / d) {
          push(Math.sin(a) * 4.95, 0.76, -11 + Math.cos(a) * 4.95 + rand() * 0.1);
          if (d > 0.5) push(Math.sin(a) * 4.9, 0.93, -11 + Math.cos(a) * 4.9);
        }
      }
      for (let x = -5.6; x <= 5.6; x += 0.3 / d) push(x, 0.78 + rand() * 0.25, -13.2 + rand() * 0.2);
      for (const [px, pz] of PILLARS)
        for (let i = 0; i < 16 * d; i++) {
          const a = rand() * Math.PI * 2;
          push(px + Math.cos(a) * 0.42, 0.85 + rand() * 0.55, pz + Math.sin(a) * 0.42);
        }
      for (let z = seatStart() - 0.2; z <= 11.2; z += 2.75)
        for (const sx of [-1.45, 1.45]) {
          prop("flowers", cyl(0.035, 0.05, 1.1, 10), 0xd4a838, sx, 0.58, z, 0.35, 0.7);
          for (let i = 0; i < 12 * d; i++) {
            const a = rand() * Math.PI * 2;
            const r = rand() * 0.28;
            push(sx + Math.cos(a) * r, 1.28 + rand() * 0.3, z + Math.sin(a) * r);
          }
        }
      const mesh = inst("flowers", new THREE.IcosahedronGeometry(0.13, 1), mat("flowers", 0, 0.85), pts.length);
      pts.forEach((p, i) => {
        place(mesh, i, p.x, p.y, p.z, (0.75 + rand() * 0.7) * (d > 1 ? 1.2 : 1), rand() * 3, rand() * 3, rand() * 3);
        tint(mesh, i, 0.8 + rand() * 0.2);
      });
    },

    /* ------------------------------------------------------------ garlands */
    garlands(style) {
      const jhumar = style === "jhumar";
      interface Strand {
        x: number;
        z: number;
        phase: number;
        first: number;
        beads: number;
      }
      const strands: Strand[] = [];
      const base: { dy: number; depth: number; big: boolean }[] = [];
      const step = jhumar ? 0.24 : 0.2;
      const addStrand = (x: number, z: number) => {
        const len = jhumar ? 1.8 + rand() * 1.2 : 1.1 + rand() * 1.0;
        const beads = Math.floor(len / step);
        strands.push({ x, z, phase: rand() * 6.28, first: base.length, beads });
        for (let b = 0; b < beads; b++) base.push({ dy: -b * step, depth: (b + 1) / beads, big: jhumar && b % 5 === 4 });
      };
      const gap = jhumar ? 0.5 : 0.3;
      for (let x = -2.95; x <= 2.96; x += gap) addStrand(x, -9.1);
      for (const sx of [-3.1, 3.1]) for (let z = -12.95; z <= -9.3; z += gap) addStrand(sx, z);
      const beadsMesh = inst("garlands", new THREE.SphereGeometry(jhumar ? 0.085 : 0.068, 10, 8), mat("garlands", 0, 0.8), base.length);
      const sway = (t: number) => {
        for (const s of strands) {
          const sw = reduced ? 0 : Math.sin(t * 1.1 + s.phase) * 0.035;
          for (let b = 0; b < s.beads; b++) {
            const bd = base[s.first + b];
            place(beadsMesh, s.first + b, s.x + sw * bd.depth * bd.depth * 2, ROOF_Y - 0.1 + bd.dy, s.z, bd.big ? 1.7 : 1);
          }
        }
        beadsMesh.instanceMatrix.needsUpdate = true;
      };
      sway(0);
      animators.set("garlands", sway);
    },

    /* ------------------------------------------------------------ aisle */
    aisle(style) {
      const start = aisleStart();
      const len = AISLE_END - start;
      const mid = (start + AISLE_END) / 2;
      if (style === "petals") {
        const n = 1100;
        const petals = inst("aisle", new THREE.CircleGeometry(0.06, 6), mat("aisle", 0, 0.9), n, false);
        for (let i = 0; i < n; i++) {
          const edge = rand() < 0.55;
          const x = edge ? (rand() < 0.5 ? -1 : 1) * (0.55 + rand() * 0.55) : (rand() - 0.5) * 1.2;
          place(petals, i, x, 0.02 + rand() * 0.012, start + 0.2 + rand() * (len - 0.4), 0.8 + rand() * 0.7, -Math.PI / 2, 0, rand() * 6.28, undefined, undefined);
          tint(petals, i, 0.7 + rand() * 0.3);
        }
      } else {
        add("aisle", box(2.2, 0.045, len), mat("aisle", 0, 0.95), 0, 0.025, mid, { shadow: false });
      }
      for (const sx of [-1.1, 1.1]) prop("aisle", box(0.07, 0.05, len), 0xd4a838, sx, 0.03, mid, 0.35, 0.7);
    },

    /* ------------------------------------------------------------ chairs */
    chairs() {
      const chairsAt: { x: number; z: number; ry: number }[] = [];
      const rows = venueId === "garden" ? 9 : venueId === "banquet" ? 8 : 10;
      const perSide = venueId === "garden" ? 6 : 5;
      for (let r = 0; r < rows; r++)
        for (const side of [-1, 1])
          for (let i = 0; i < perSide; i++) chairsAt.push({ x: side * (1.75 + i * 0.62), z: seatStart() + r * 1.15, ry: 0 });
      for (const [tx, tz] of tableSpots())
        for (let c = 0; c < 6; c++) {
          const a = (c / 6) * Math.PI * 2;
          chairsAt.push({ x: tx + Math.sin(a) * 1.35, z: tz + Math.cos(a) * 1.35, ry: a + Math.PI });
        }
      const cm = mat("chairs", 0, 0.7);
      const seats = inst("chairs", box(0.46, 0.06, 0.46), cm, chairsAt.length);
      const backs = inst("chairs", box(0.46, 0.5, 0.05), cm, chairsAt.length);
      const legs = inst("chairs", box(0.04, 0.44, 0.04), mat("chairs", -0.1, 0.7), chairsAt.length * 4);
      const cM = new THREE.Matrix4();
      const pM = new THREE.Matrix4();
      const oM = new THREE.Matrix4();
      chairsAt.forEach((c, i) => {
        cM.makeRotationY(c.ry).setPosition(c.x, 0, c.z);
        seats.setMatrixAt(i, oM.multiplyMatrices(cM, pM.makeTranslation(0, 0.46, 0)));
        backs.setMatrixAt(i, oM.multiplyMatrices(cM, pM.makeTranslation(0, 0.74, -0.2)));
        [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([lx, lz], j) =>
          legs.setMatrixAt(i * 4 + j, oM.multiplyMatrices(cM, pM.makeTranslation(lx, 0.22, lz))),
        );
      });
      // the couple's seats on the stage, unless a flower swing takes their place
      if (!current?.jhula.visible)
        for (const sx of [-0.75, 0.75]) {
          add("chairs", box(0.9, 0.36, 0.8), mat("chairs", 0, 0.6), sx, STAGE_TOP + 0.5, -11.2);
          add("chairs", box(0.9, 1.1, 0.14), mat("chairs", -0.06, 0.6), sx, STAGE_TOP + 1.0, -11.62);
          for (const ax of [-0.5, 0.5]) add("chairs", box(0.1, 0.4, 0.7), mat("chairs", 0.08, 0.6), sx + ax, STAGE_TOP + 0.7, -11.2);
        }
    },

    /* ------------------------------------------------------------ tables */
    tables() {
      for (const [tx, tz] of tableSpots()) {
        add("tables", cyl(0.97, 1.0, 0.76, 28), mat("tables", 0, 0.95), tx, 0.38, tz);
        add("tables", cyl(1.0, 1.0, 0.03, 28), mat("tables", 0.05, 0.8), tx, 0.775, tz);
        add("tables", new THREE.IcosahedronGeometry(0.24, 1), mat("flowers", 0, 0.85), tx, 1.0, tz);
        prop("tables", cyl(0.02, 0.02, 0.3, 8), 0xd4a838, tx, 0.9, tz, 0.4, 0.6);
      }
    },

    /* ------------------------------------------------------------ fairy lights */
    lights(style) {
      const bulbs: THREE.Vector3[] = [];
      const h = venueId === "banquet" ? 8.6 : 5.6;
      const half = venueId === "banquet" ? 12 : 9;
      const lines = style === "curtain" ? [-4, 2, 8] : [-6, -2.5, 1, 4.5, 8, 11.5];
      for (const z of lines)
        for (let i = 0; i <= 44; i++) {
          const u = i / 44;
          bulbs.push(new THREE.Vector3(-half + u * 2 * half, h - Math.sin(u * Math.PI) * 0.9, z));
        }
      if (style === "curtain")
        for (let x = -6.2; x <= 6.21; x += 0.4)
          for (let i = 0; i < 12; i++) bulbs.push(new THREE.Vector3(x + Math.sin(i * 0.9 + x) * 0.03, 6.0 - i * 0.42, -13.0));
      const bm = mat("lights", 0, 0.35);
      const mesh = inst("lights", sph(0.055, 8, 6), bm, bulbs.length, false);
      bulbs.forEach((p, i) => place(mesh, i, p.x, p.y, p.z));
      if (venueId === "garden")
        for (const z of lines) for (const sx of [-half, half]) prop("lights", cyl(0.07, 0.09, h + 0.5, 8), 0x5a3d26, sx, (h + 0.5) / 2, z, 0.9);
    },

    /* ------------------------------------------------------------ walls (the venue itself) */
    walls() {
      const wm = mat("walls", 0, 0.88);
      const wd = mat("walls", -0.14, 0.9);
      const wl = mat("walls", 0.1, 0.8);
      if (venueId === "palace") {
        add("walls", box(40, 9, 0.8), wm, 0, 4.5, -16.4);
        for (const sx of [-1, 1]) add("walls", box(0.8, 7, 40), wm, sx * 16.4, 3.5, 3.5);
        for (let x = -18; x <= 18; x += 1.7) add("walls", box(0.9, 0.7, 0.9), wl, x, 9.35, -16.4);
        for (const sx of [-1, 1]) for (let z = -16; z <= 23; z += 1.7) add("walls", box(0.9, 0.7, 0.9), wl, sx * 16.4, 7.35, z);
        for (const sx of [-1, 1])
          for (let z = -12; z <= 20; z += 4) {
            add("walls", box(0.14, 3.8, 2.4), wd, sx * 15.95, 1.9, z);
            for (const dz of [-1.2, 1.2]) add("walls", cyl(0.22, 0.26, 4.2, 14), wl, sx * 15.5, 2.1, z + dz);
            add("walls", new THREE.TorusGeometry(1.2, 0.14, 8, 28, Math.PI), wl, sx * 15.5, 4.2, z, { ry: Math.PI / 2 });
          }
        for (const x of [-9, 9]) {
          add("walls", box(3.2, 5, 0.2), wd, x, 3.2, -15.9);
          add("walls", new THREE.CircleGeometry(1.6, 24, 0, Math.PI), wd, x, 5.7, -15.78);
        }
      } else if (venueId === "garden") {
        const foliage = [mat("walls", -0.1, 0.95), mat("walls", 0, 0.95), mat("walls", 0.09, 0.95)];
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * Math.PI * 2 + rand() * 0.2;
          const rad = 25 + rand() * 7;
          const x = Math.sin(a) * rad;
          const z = Math.cos(a) * rad * 0.9 - 2;
          if (z > 22) continue;
          const th = 4 + rand() * 3;
          prop("walls", cyl(0.3, 0.45, th * 0.55, 8), 0x5a3d26, x, th * 0.275, z, 0.95);
          add("walls", new THREE.ConeGeometry(2.2 + rand() * 0.9, th, 9), foliage[i % 3], x, th * 0.55 + th * 0.3, z);
          add("walls", new THREE.ConeGeometry(1.6 + rand() * 0.6, th * 0.7, 9), foliage[(i + 1) % 3], x, th * 0.55 + th * 0.8, z);
        }
        add("walls", box(36, 1.9, 1.3), wm, 0, 0.95, -16.5);
        for (const sx of [-1, 1]) add("walls", box(1.3, 1.9, 40), wm, sx * 17.5, 0.95, 3.5);
        for (let x = -15; x <= 15; x += 3) add("walls", sph(0.9, 12, 10), wl, x, 2.1, -16.5);
      } else {
        const ceil = mat("walls", -0.06, 0.95);
        // inward-facing planes, so the room is open when seen from above
        add("walls", new THREE.PlaneGeometry(34, 10), wm, 0, 5, -16.5, { shadow: false });
        add("walls", new THREE.PlaneGeometry(46, 10), wm, -16.5, 5, 3, { ry: Math.PI / 2, shadow: false });
        add("walls", new THREE.PlaneGeometry(46, 10), wm, 16.5, 5, 3, { ry: -Math.PI / 2, shadow: false });
        add("walls", new THREE.PlaneGeometry(34, 10), wm, 0, 5, 22, { ry: Math.PI, shadow: false });
        add("walls", new THREE.PlaneGeometry(34, 46), ceil, 0, 10, 3, { rx: Math.PI / 2, shadow: false });
        for (let z = -14; z <= 20; z += 3) for (const sx of [-1, 1]) add("walls", box(0.3, 6.6, 1.3), wl, sx * 16.3, 3.3, z);
        for (let x = -15; x <= 15; x += 3) add("walls", box(1.3, 6.6, 0.3), wl, x, 3.3, -16.3);
        for (const sx of [-1, 1]) for (let z = -12; z <= 18; z += 6) add("walls", cyl(0.5, 0.58, 10, 20), wl, sx * 14, 5, z);
        for (let x = -14; x <= 14; x += 4.7) add("walls", box(0.5, 0.5, 46), wd, x, 9.7, 3, { shadow: false });
      }
    },

    /* ================================================================ added parts */
    arch(style) {
      const am = mat("arch", -0.2, 0.7, 0.15);
      const pts: THREE.Vector3[] = [];
      for (const sx of [-2.15, 2.15]) add("arch", cyl(0.14, 0.17, 3.6, 16), am, sx, 1.8, ARCH_Z);
      const top = 3.6;
      if (style === "pointed") {
        for (const sx of [-1, 1]) {
          const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx * 2.15, top, ARCH_Z), new THREE.Vector3(sx * 2.15, top + 1.5, ARCH_Z), new THREE.Vector3(0, top + 2.1, ARCH_Z));
          add("arch", new THREE.TubeGeometry(c, 24, 0.1, 8, false), am);
          pts.push(...sample(c, 24));
        }
      } else if (style === "square") {
        add("arch", box(4.7, 0.22, 0.24), am, 0, top + 0.1, ARCH_Z);
        for (let x = -2.2; x <= 2.21; x += 0.12) pts.push(new THREE.Vector3(x, top + 0.1, ARCH_Z));
      } else {
        add("arch", new THREE.TorusGeometry(2.15, 0.1, 10, 44, Math.PI), am, 0, top, ARCH_Z);
        for (let i = 0; i < 48; i++) pts.push(new THREE.Vector3(Math.cos((i / 47) * Math.PI) * 2.15, top + Math.sin((i / 47) * Math.PI) * 2.15, ARCH_Z));
      }
      const fl = inst("arch", new THREE.IcosahedronGeometry(0.15, 1), mat("arch", 0, 0.85), pts.length * 2);
      let n = 0;
      for (const p of pts) {
        place(fl, n, p.x + (rand() - 0.5) * 0.1, p.y + (rand() - 0.5) * 0.12, p.z + (rand() - 0.5) * 0.14, 0.8 + rand() * 0.7, rand() * 3, rand() * 3, 0);
        tint(fl, n++, 0.8 + rand() * 0.2);
        if (rand() < 0.5) {
          place(fl, n, p.x + (rand() - 0.5) * 0.2, p.y - 0.12, p.z + 0.12, 0.7 + rand() * 0.5, rand() * 3, rand() * 3, 0);
          tint(fl, n++, 0.8 + rand() * 0.2);
        }
      }
      fl.count = n;
      // hanging strands
      const beads = inst("arch", sph(0.06, 8, 6), mat("arch", 0.08, 0.8), 160, false);
      let b = 0;
      for (let k = 0; k < 20 && b < 150; k++) {
        const p = pts[Math.floor(((k + 0.5) / 20) * pts.length)];
        const len = 3 + Math.floor(rand() * 5);
        for (let j = 1; j <= len; j++) place(beads, b++, p.x, p.y - j * 0.17, p.z + 0.1);
      }
      beads.count = b;
    },

    jhula() {
      const g = new THREE.Group();
      const pivotY = ROOF_Y - 0.1;
      g.position.set(0, pivotY, -11.1);
      g.userData.element = "jhula";
      groups.jhula.add(g);
      const L = 2.75;
      const jm = mat("jhula", 0, 0.7);
      add("jhula", box(1.9, 0.14, 0.8), jm, 0, -L, 0, { parent: g });
      add("jhula", box(1.9, 0.9, 0.1), mat("jhula", -0.08, 0.7), 0, -L + 0.55, -0.36, { parent: g });
      for (const sx of [-1, 1]) add("jhula", box(0.12, 0.5, 0.8), mat("jhula", -0.1, 0.7), sx * 0.95, -L + 0.3, 0, { parent: g });
      for (const sx of [-0.85, 0.85]) prop("jhula", cyl(0.03, 0.03, L, 8), 0xb08a2e, sx, -L / 2, 0, 0.4, 0.6, { parent: g });
      const fl = inst("jhula", new THREE.IcosahedronGeometry(0.09, 1), mat("jhula", 0.06, 0.85), 200, false, g);
      let n = 0;
      for (const sx of [-0.85, 0.85]) for (let y = 0; y > -L; y -= 0.11) { place(fl, n, sx + (rand() - 0.5) * 0.06, y, (rand() - 0.5) * 0.06, 0.8 + rand() * 0.5, rand() * 3, rand() * 3, 0); tint(fl, n++, 0.8 + rand() * 0.2); }
      for (let x = -0.95; x <= 0.96; x += 0.1) { place(fl, n, x, -L + 0.12, 0.42, 1.2, rand() * 3, rand() * 3, 0); tint(fl, n++, 0.8 + rand() * 0.2); }
      for (let x = -0.9; x <= 0.91; x += 0.12) for (let y = -L + 0.2; y < -L + 1.0; y += 0.14) { if (n < 199) { place(fl, n, x, y, -0.42, 1, rand() * 3, rand() * 3, 0); tint(fl, n++, 0.8 + rand() * 0.2); } }
      fl.count = n;
      animators.set("jhula", (t) => {
        g.rotation.x = reduced ? 0 : Math.sin(t * 1.15) * 0.07;
      });
    },

    fountain() {
      const stone = (dl = 0) => mat("fountain", dl, 0.8);
      add("fountain", cyl(1.8, 1.9, 0.5, 44), stone(), 0, 0.25, FOUNTAIN_Z);
      add("fountain", new THREE.TorusGeometry(1.8, 0.1, 8, 44), stone(0.08), 0, 0.5, FOUNTAIN_Z, { rx: Math.PI / 2 });
      const water = fixedMat("fountain", { color: 0x8fd3ee, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85, emissive: 0x1a4a66, emissiveIntensity: 0.4 });
      add("fountain", new THREE.CircleGeometry(1.72, 44), water, 0, 0.47, FOUNTAIN_Z, { rx: -Math.PI / 2, shadow: false });
      add("fountain", cyl(0.2, 0.3, 1.0, 20), stone(-0.08), 0, 0.75, FOUNTAIN_Z);
      add("fountain", new THREE.SphereGeometry(0.7, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), stone(0.04), 0, 1.35, FOUNTAIN_Z);
      add("fountain", cyl(0.1, 0.14, 0.5, 16), stone(-0.08), 0, 1.5, FOUNTAIN_Z);
      add("fountain", new THREE.SphereGeometry(0.4, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), stone(0.06), 0, 1.85, FOUNTAIN_Z);
      add("fountain", sph(0.12, 12, 10), stone(0.1), 0, 2.15, FOUNTAIN_Z);
      const dropMat = fixedMat("fountain", { color: 0xcfeefc, roughness: 0.1, emissive: 0x6ab8d8, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 });
      const drops = inst("fountain", sph(0.04, 6, 5), dropMat, 120, false);
      animators.set("fountain", (t) => {
        for (let i = 0; i < 80; i++) {
          const p = (t * 0.9 + i / 80) % 1;
          const a = i * 2.399963;
          const r = 0.1 + 1.15 * p;
          place(drops, i, Math.cos(a) * r, 2.1 + 1.3 * 4 * p * (1 - p) - 1.65 * p, FOUNTAIN_Z + Math.sin(a) * r);
        }
        for (let i = 0; i < 40; i++) {
          const p = (t * 0.8 + i / 40) % 1;
          const a = i * 2.399963 + 1;
          const r = 0.65 + 0.9 * p;
          place(drops, 80 + i, Math.cos(a) * r, 1.45 + 0.55 * 4 * p * (1 - p) - 0.95 * p, FOUNTAIN_Z + Math.sin(a) * r);
        }
        drops.instanceMatrix.needsUpdate = true;
      });
    },

    rangoli() {
      const spot = (cx: number, cz: number) => {
        const flat = { rx: -Math.PI / 2, shadow: false } as const;
        add("rangoli", new THREE.RingGeometry(1.55, 1.75, 48), mat("rangoli", -0.25, 0.9), cx, 0.014, cz, flat);
        add("rangoli", new THREE.RingGeometry(1.2, 1.35, 48), mat("rangoli", 0.12, 0.9), cx, 0.016, cz, flat);
        add("rangoli", new THREE.CircleGeometry(0.4, 32), mat("rangoli", 0.2, 0.9), cx, 0.018, cz, flat);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const petal = add("rangoli", new THREE.CircleGeometry(0.3, 20), mat("rangoli", i % 2 ? -0.1 : 0.05, 0.9), cx + Math.cos(a) * 0.82, 0.017, cz + Math.sin(a) * 0.82, flat);
          petal.rotation.z = -a;
          petal.scale.set(1, 0.42, 1);
        }
        for (let i = 0; i < 16; i++) {
          const a = ((i + 0.5) / 16) * Math.PI * 2;
          add("rangoli", new THREE.CircleGeometry(0.05, 8), mat("rangoli", -0.3, 0.9), cx + Math.cos(a) * 1.45, 0.02, cz + Math.sin(a) * 1.45, flat);
        }
      };
      spot(-3.9, 11.4);
      spot(3.9, 11.4);
    },

    diyas() {
      const zs: number[] = [];
      for (let z = aisleStart() + 0.7; z <= 13.2; z += 0.55) zs.push(z);
      const n = zs.length * 2;
      const bowl = inst("diyas", new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat("diyas", 0, 0.8), n);
      const flameMat = fixedMat("diyas", { color: 0xffb347, emissive: 0xff8a1f, emissiveIntensity: 2.6, roughness: 0.4 });
      const flame = inst("diyas", new THREE.ConeGeometry(0.035, 0.12, 8), flameMat, n, false);
      const spots: [number, number][] = zs.flatMap((z) => [[-1.22, z], [1.22, z]] as [number, number][]);
      spots.forEach(([x, z], i) => place(bowl, i, x, 0.06, z, 1, 0, 0, 0, 0.6, 1));
      animators.set("diyas", (t) => {
        spots.forEach(([x, z], i) => {
          const f = 1 + 0.25 * Math.sin(t * 9 + i * 1.7) + 0.1 * Math.sin(t * 17 + i);
          place(flame, i, x, 0.15, z, 1, 0, 0, 0, f, 1);
        });
        flame.instanceMatrix.needsUpdate = true;
      });
    },

    lanterns() {
      const n = 22;
      const yBase = venueId === "banquet" ? 5.6 : 3.6;
      const spots = Array.from({ length: n }, () => ({ x: (rand() - 0.5) * 16, z: -3 + rand() * 13, y: yBase + rand() * 1.6, ph: rand() * 6.28 }));
      const lanterns = inst("lanterns", sph(0.28, 14, 10), mat("lanterns", 0, 0.5), n, false);
      const cords = inst("lanterns", cyl(0.01, 0.01, 1, 4), fixedMat("lanterns", { color: 0x2a1a14, roughness: 0.9 }), n, false);
      animators.set("lanterns", (t) => {
        spots.forEach((s, i) => {
          const sw = reduced ? 0 : Math.sin(t * 0.8 + s.ph) * 0.06;
          place(lanterns, i, s.x + sw, s.y, s.z, 1, 0, 0, 0, 1.3, 1);
          place(cords, i, s.x + sw / 2, s.y + 2.6 / 2 + 0.2, s.z, 1, 0, 0, 0, 2.6, 1);
        });
        lanterns.instanceMatrix.needsUpdate = true;
        cords.instanceMatrix.needsUpdate = true;
      });
    },

    chandeliers() {
      const y0 = venueId === "banquet" ? 7.6 : 7.2;
      const zs = [-2, 4, 10];
      const bulbsAt: THREE.Vector3[] = [];
      const gold = 0xc9973a;
      for (const z of zs) {
        prop("chandeliers", cyl(0.02, 0.02, 3.2, 6), gold, 0, y0 + 1.7, z, 0.4, 0.7);
        add("chandeliers", sph(0.2, 14, 12), mat("chandeliers", 0, 0.3), 0, y0 - 0.05, z, { shadow: false });
        [[0.35, 10, 0], [0.65, 16, -0.28], [0.95, 22, -0.56]].forEach(([r, count, dy]) => {
          prop("chandeliers", new THREE.TorusGeometry(r, 0.02, 6, 36), gold, 0, y0 + dy, z, 0.4, 0.7, { rx: Math.PI / 2, shadow: false });
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            bulbsAt.push(new THREE.Vector3(Math.cos(a) * r, y0 + dy + 0.06, z + Math.sin(a) * r));
          }
        });
      }
      const bulbs = inst("chandeliers", sph(0.06, 8, 6), mat("chandeliers", 0, 0.3), bulbsAt.length, false);
      const drops = inst("chandeliers", new THREE.OctahedronGeometry(0.06, 0), mat("chandeliers", 0.12, 0.15, 0.4), bulbsAt.length, false);
      bulbsAt.forEach((p, i) => {
        place(bulbs, i, p.x, p.y, p.z);
        place(drops, i, p.x, p.y - 0.16, p.z, 1, 0, 0, 0, 2.2, 1);
      });
    },

    photobooth() {
      const g = new THREE.Group();
      g.position.set(-14.4, 0, -1);
      g.rotation.y = Math.PI / 2;
      g.userData.element = "photobooth";
      groups.photobooth.add(g);
      add("photobooth", box(3.4, 3.4, 0.12), mat("photobooth", -0.3, 0.9), 0, 1.7, 0, { parent: g });
      add("photobooth", box(3.9, 0.1, 1.8), mat("photobooth", -0.12, 0.8), 0, 0.05, 0.7, { parent: g });
      for (const [w, h, x, y] of [[3.6, 0.1, 0, 3.45], [3.6, 0.1, 0, -0.0], [0.1, 3.5, -1.75, 1.75], [0.1, 3.5, 1.75, 1.75]] as const)
        prop("photobooth", box(w, h, 0.16), 0xc9973a, x, y + (h === 0.1 && y === 0 ? 0.1 : 0), 0.04, 0.35, 0.7, { parent: g });
      const cols = 15;
      const rows = 15;
      const wall = inst("photobooth", new THREE.IcosahedronGeometry(0.14, 1), mat("photobooth", 0, 0.85), cols * rows, false, g);
      let i = 0;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          place(wall, i, -1.55 + c * 0.22 + (r % 2) * 0.08, 0.2 + r * 0.21, 0.12 + rand() * 0.06, 0.8 + rand() * 0.5, rand() * 3, rand() * 3, 0);
          tint(wall, i++, 0.74 + rand() * 0.26);
        }
    },

    havan() {
      const z = -10.2;
      const y = STAGE_TOP;
      add("havan", box(1.1, 0.3, 1.1), mat("havan", 0, 0.8), 0, y + 0.15, z);
      add("havan", box(1.2, 0.07, 1.2), mat("havan", 0.1, 0.8), 0, y + 0.32, z);
      prop("havan", box(0.8, 0.04, 0.8), 0x2a1a14, 0, y + 0.34, z, 0.95);
      for (let i = 0; i < 4; i++) prop("havan", box(0.7, 0.08, 0.09), 0x6b4a2f, 0, y + 0.4 + (i % 2) * 0.08, z, 0.9, 0, { ry: i * (Math.PI / 4) });
      const flameMat = fixedMat("havan", { color: 0xffa530, emissive: 0xff6a10, emissiveIntensity: 3, roughness: 0.4, transparent: true, opacity: 0.92 });
      const flames = [0, 1, 2].map((k) => add("havan", new THREE.ConeGeometry(0.2 - k * 0.04, 0.6 - k * 0.1, 10), flameMat, (k - 1) * 0.12, y + 0.7, z + (k % 2) * 0.08, { shadow: false }));
      animators.set("havan", (t) => {
        flames.forEach((f, k) => {
          f.scale.set(1 + 0.12 * Math.sin(t * 11 + k), 1 + 0.25 * Math.sin(t * 7 + k * 2), 1 + 0.12 * Math.cos(t * 9 + k));
          f.position.y = y + 0.62 + f.scale.y * 0.12;
        });
      });
    },
  };

  /* ---------------------------------------------------------------- (re)building */
  function clearElement(el: ElementId) {
    const o = owned[el];
    for (const m of o.insts) m.dispose();
    for (const g of o.geos) g.dispose();
    for (const e of o.extras) e.dispose();
    o.geos = [];
    o.insts = [];
    o.extras = [];
    groups[el].clear();
    animators.delete(el);
  }
  function build(el: ElementId, style: string) {
    clearElement(el);
    rand = rng(venueId.length * 7919 + ELEMENT_IDS.indexOf(el) * 131 + 13);
    builders[el](style);
  }

  /* ---------------------------------------------------------------- interaction */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const roots = ELEMENT_IDS.map((id) => groups[id]);
  function pick(clientX: number, clientY: number): ElementId | null {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    for (const h of raycaster.intersectObjects(roots, true)) {
      const el = (h.object.userData.element ?? h.object.parent?.userData.element) as ElementId | undefined;
      if (el && groups[el].visible) return el;
    }
    return null;
  }

  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) cb.onPick(pick(e.clientX, e.clientY));
    down = null;
  };
  let hoverEl: ElementId | null = null;
  let hoverQueued = false;
  const onMove = (e: PointerEvent) => {
    if (e.buttons || hoverQueued) return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      const el = pick(e.clientX, e.clientY);
      if (el !== hoverEl) {
        hoverEl = el;
        renderer.domElement.style.cursor = el ? "pointer" : "grab";
      }
      cb.onHover(el, e.clientX, e.clientY);
    });
  };
  const onLeave = () => {
    hoverEl = null;
    cb.onHover(null, 0, 0);
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerleave", onLeave);

  /* ---------------------------------------------------------------- camera moves */
  let move: { t: number; fromPos: THREE.Vector3; fromTarget: THREE.Vector3; toPos: THREE.Vector3; toTarget: THREE.Vector3; dur: number } | null = null;
  function setView(view: ViewPreset, instant = false) {
    const v = VIEWS[view];
    const toPos = new THREE.Vector3(...v.pos);
    const toTarget = new THREE.Vector3(...v.target);
    if (instant || reduced) {
      camera.position.copy(toPos);
      controls.target.copy(toTarget);
      move = null;
      return;
    }
    move = { t: 0, fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos, toTarget, dur: 1.4 };
  }
  camera.position.set(...VIEWS.aerial.pos);
  controls.target.set(...VIEWS.aerial.target);
  setView("entrance", reduced);

  /* ---------------------------------------------------------------- state */
  let first = true;
  let selected: ElementId | null = null;
  let lightsOn = true;
  function apply(state: Record<ElementId, DecorState>) {
    const prev = current;
    current = state;
    const needs = new Set<ElementId>();
    for (const id of ELEMENT_IDS) if (!prev || prev[id].style !== state[id].style) needs.add(id);
    if (needs.has("stage")) for (const d of STAGE_DEPENDENTS) needs.add(d);
    if (prev && prev.jhula.visible !== state.jhula.visible) needs.add("chairs");
    // ELEMENT_IDS lists the stage before the parts that depend on it
    for (const id of ELEMENT_IDS) if (needs.has(id)) build(id, state[id].style);

    for (const id of ELEMENT_IDS) {
      groups[id].visible = state[id].visible;
      for (const m of materials[id]) {
        (m.userData.target as THREE.Color).set(shade(state[id].color, m.userData.dl as number));
        if (first) {
          m.color.copy(m.userData.target as THREE.Color);
          const g = GLOW[id];
          if (g) m.emissive.copy(m.color).multiplyScalar(g);
        }
      }
    }
    const lc = new THREE.Color(state.lights.color);
    glow.forEach((p) => p.color.copy(lc));
    lightsOn = state.lights.visible;
    first = false;
  }

  /* ---------------------------------------------------------------- loop */
  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const t0 = performance.now();
  let lastTick = t0;
  let raf = 0;
  let disposed = false;
  const frame = () => {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTick) / 1000);
    lastTick = now;
    const t = (now - t0) / 1000;

    if (move) {
      move.t = Math.min(1, move.t + dt / move.dur);
      const e = move.t < 0.5 ? 4 * move.t ** 3 : 1 - (-2 * move.t + 2) ** 3 / 2;
      camera.position.lerpVectors(move.fromPos, move.toPos, e);
      controls.target.lerpVectors(move.fromTarget, move.toTarget, e);
      if (move.t >= 1) move = null;
    }
    controls.update();

    const k = 1 - Math.exp(-7 * dt);
    for (const id of ELEMENT_IDS) {
      const h = selected === id ? 0.3 + 0.12 * Math.sin(t * 4.2) : hoverEl === id ? 0.16 : 0;
      const g = GLOW[id];
      for (const m of materials[id]) {
        m.color.lerp(m.userData.target as THREE.Color, k);
        if (g) m.emissive.copy(m.color).multiplyScalar(g * (1 + h));
        else m.emissive.copy(m.color).multiplyScalar(h);
      }
    }
    for (const [id, fn] of animators) if (groups[id].visible) fn(t);
    glow.forEach((p) => (p.intensity += ((lightsOn ? 14 : 0) - p.intensity) * k));
    renderer.render(scene, camera);
  };
  frame();

  return {
    apply,
    setSelected(el) {
      selected = el;
    },
    setView: (v) => setView(v),
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      controls.dispose();
      for (const id of ELEMENT_IDS) clearElement(id);
      for (const m of matCache.values()) {
        m.map?.dispose();
        m.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
