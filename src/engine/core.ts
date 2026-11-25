/**
 * Sigil engine core — pure, deterministic, framework-free.
 *
 * Pipeline:
 *   1. Reduce intent → unique consonants (vowels & duplicates out)
 *   2. Seed FNV-1a from the lowercased intent (legacy contract)
 *   3. Bind survivors across a three-ring wheel via xorshift RNG
 *
 * Same intent → same sigil. Forever.
 */

export type ForgeStep = {
  label: string;
  detail: string;
};

export type ForgeResult = {
  intent: string;
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

export function forge(intent: string): ForgeResult {
  const { letters, vowelCount, duplicateCount } = reduce(intent);
  const seedInput = intent.toLowerCase() || "void";
  const seed = fnv1a(seedInput);
  const seedHex = seed.toString(16).padStart(8, "0");

  const steps: ForgeStep[] = [
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
    letters,
    seed,
    seedHex,
    steps,
    vowelCount,
    duplicateCount,
  };
}

export type Point = { x: number; y: number; ch: string };

export type Layout = {
  points: Point[];
  rings: number[];
  controls: number[]; // k factors for quadratic curves between points
};

/** Deterministic geometry for the three-ring live renderer. */
export function layout(
  letters: string[],
  seed: number,
  cx: number,
  cy: number,
  R: number,
): Layout {
  const rand = rng(seed);
  const rings = [R, R * 0.68, R * 0.36];
  const points = letters.map((ch, i) => {
    const ring = rings[(ch.charCodeAt(0) + i) % 3]!;
    const a = ((ch.charCodeAt(0) - 65) / 21) * Math.PI * 2 + rand() * 0.4 - 0.2;
    return { x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring, ch };
  });
  const controls = points.slice(1).map(() => 0.5 + rand() * 0.5);
  return { points, rings, controls };
}
