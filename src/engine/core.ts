/**
 * Sigil engine core — pure, deterministic, framework-free.
 *
 * Pipeline:
 *   1. Reduce intent → unique consonants (vowels & duplicates out)
 *   2. Seed FNV-1a from the lowercased intent (legacy contract)
 *   3. Bind survivors — FORGE (three-ring open path) or CHAOS (closed wheel + chords)
 *
 * Same intent + mode → same sigil. Forever.
 */

export type SigilMode = "forge" | "chaos";

export type ForgeStep = {
  label: string;
  detail: string;
};

export type ForgeResult = {
  intent: string;
  mode: SigilMode;
  letters: string[];
  seed: number;
  seedHex: string;
  steps: ForgeStep[];
  vowelCount: number;
  duplicateCount: number;
};

export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** xorshift32. Same seed → same sequence. */
export function rng(seed: number): () => number {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0xffffffff;
  };
}

/**
 * Classic chaos-magick reduction:
 * letters only → strip vowels → collapse duplicate consonants (first wins).
 */
export function reduce(intent: string): {
  letters: string[];
  vowelCount: number;
  duplicateCount: number;
} {
  const raw = intent.toUpperCase().replace(/[^A-Z]/g, "");
  const consonants = raw.replace(/[AEIOU]/g, "");
  const vowelCount = raw.length - consonants.length;

  const letters: string[] = [];
  let duplicateCount = 0;
  for (const c of consonants) {
    if (letters.includes(c)) duplicateCount += 1;
    else letters.push(c);
  }

  return { letters, vowelCount, duplicateCount };
}

export function forge(
  intent: string,
  mode: SigilMode = "forge",
): ForgeResult {
  const { letters, vowelCount, duplicateCount } = reduce(intent);
  const seedInput = intent.toLowerCase() || "void";
  // Mix mode into the seed stream so forge/chaos geometries diverge while
  // remaining deterministic — charge hex still reflects the intent alone.
  const seed = fnv1a(seedInput);
  const seedHex = seed.toString(16).padStart(8, "0");

  const steps: ForgeStep[] =
    mode === "chaos"
      ? [
          { label: "parsing intent", detail: "ok" },
          {
            label: "stripping vowels",
            detail: `${vowelCount} removed (cowards)`,
          },
          {
            label: "collapsing duplicates",
            detail: `${duplicateCount} removed (vanity)`,
          },
          {
            label: "survivors",
            detail: letters.length ? letters.join(" ") : "—",
          },
          {
            label: "scrambling the wheel",
            detail: "closed form + cross chords",
          },
          {
            label: `chaos 0x${seedHex.toUpperCase()} unbound`,
            detail: "forget it immediately.",
          },
        ]
      : [
          { label: "parsing intent", detail: "ok" },
          {
            label: "stripping vowels",
            detail: `${vowelCount} removed (cowards)`,
          },
          {
            label: "collapsing duplicates",
            detail: `${duplicateCount} removed (vanity)`,
          },
          {
            label: "survivors",
            detail: letters.length ? letters.join(" ") : "—",
          },
          {
            label: "closing radial form",
            detail: `${letters.length} letter node${letters.length === 1 ? "" : "s"}`,
          },
          {
            label: `sigil 0x${seedHex.toUpperCase()} charged`,
            detail: "do not explain it to anyone.",
          },
        ];

  return {
    intent,
    mode,
    letters,
    seed,
    seedHex,
    steps,
    vowelCount,
    duplicateCount,
  };
}

export type Point = { x: number; y: number; ch: string };

export type Chord = { from: number; to: number };

export type Layout = {
  mode: SigilMode;
  points: Point[];
  rings: number[];
  /** k factors for quadratic curves between consecutive points (and close). */
  controls: number[];
  /** Extra non-adjacent chords (chaos mode). */
  chords: Chord[];
  closed: boolean;
  cx: number;
  cy: number;
  R: number;
};

/** Deterministic geometry for forge (three-ring open) or chaos (closed wheel). */
export function layout(
  letters: string[],
  seed: number,
  cx: number,
  cy: number,
  R: number,
  mode: SigilMode = "forge",
): Layout {
  const rand = rng(mode === "chaos" ? seed ^ 0xc0ffee : seed);

  if (mode === "chaos") {
    return layoutChaos(letters, rand, cx, cy, R);
  }
  return layoutForge(letters, rand, cx, cy, R);
}

function layoutForge(
  letters: string[],
  rand: () => number,
  cx: number,
  cy: number,
  R: number,
): Layout {
  const rings = [R, R * 0.68, R * 0.36];
  const points = letters.map((ch, i) => {
    const ring = rings[(ch.charCodeAt(0) + i) % 3]!;
    const a = ((ch.charCodeAt(0) - 65) / 21) * Math.PI * 2 + rand() * 0.4 - 0.2;
    return { x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring, ch };
  });
  const controls = points.slice(1).map(() => 0.5 + rand() * 0.5);
  return {
    mode: "forge",
    points,
    rings,
    controls,
    chords: [],
    closed: false,
    cx,
    cy,
    R,
  };
}

function layoutChaos(
  letters: string[],
  rand: () => number,
  cx: number,
  cy: number,
  R: number,
): Layout {
  const n = letters.length;
  const rings = [R, R * 0.72, R * 0.44];
  const order = letters.map((_, i) => i);
  // Fisher–Yates with seeded rand — still deterministic.
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }

  const points = order.map((idx, i) => {
    const ch = letters[idx]!;
    const base = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
    const jitter = (rand() - 0.5) * 0.55;
    const a = base + jitter;
    const ring = rings[Math.floor(rand() * rings.length)]! * (0.82 + rand() * 0.18);
    return { x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring, ch };
  });

  const edgeCount = n > 0 ? n : 0; // closed: one control per edge including close
  const controls = Array.from({ length: edgeCount }, () => 0.35 + rand() * 0.55);

  const chords: Chord[] = [];
  if (n >= 4) {
    for (let i = 0; i < n; i++) {
      const span = 2 + Math.floor(rand() * Math.min(3, Math.floor(n / 2) - 1));
      const to = (i + span) % n;
      if (to !== i && (to + 1) % n !== i && (i + 1) % n !== to) {
        chords.push({ from: i, to });
      }
    }
  }

  return {
    mode: "chaos",
    points,
    rings,
    controls,
    chords,
    closed: true,
    cx,
    cy,
    R,
  };
}
