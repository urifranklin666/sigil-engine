import { describe, expect, it } from "vitest";
import { fnv1a, forge, layout, reduce, rng } from "./core";
import { buildStencilSvg, stencilFromIntent } from "./stencil";

describe("reduce", () => {
  it("strips vowels and collapses duplicates", () => {
    const { letters, vowelCount, duplicateCount } = reduce(
      "NOTHING HERE WORKS ALONE",
    );
    expect(letters).toEqual(["N", "T", "H", "G", "R", "W", "K", "S", "L"]);
    expect(vowelCount).toBe(8);
    expect(duplicateCount).toBe(4);
  });

  it("ignores punctuation and case", () => {
    expect(reduce("ship it, on time!").letters).toEqual(
      reduce("SHIP IT ON TIME").letters,
    );
  });

  it("returns empty for vowel-only intent", () => {
    expect(reduce("AEIOU!!!").letters).toEqual([]);
  });
});

describe("fnv1a / seed contract", () => {
  it("matches the legacy deadplug charge for the reference intent", () => {
    // Ground truth from the extracted product media (sigil.webp).
    expect(fnv1a("nothing here works alone")).toBe(0x59cf7291);
  });

  it("is stable", () => {
    expect(fnv1a("void").toString(16)).toBe(fnv1a("void").toString(16));
  });
});

describe("forge", () => {
  it("is deterministic: same intent → same seed & survivors", () => {
    const a = forge("SHIP IT ON TIME");
    const b = forge("SHIP IT ON TIME");
    expect(a.seed).toBe(b.seed);
    expect(a.letters).toEqual(b.letters);
    expect(a.seedHex).toBe(b.seedHex);
  });

  it("seeds from lowercased intent, not survivors", () => {
    const forged = forge("NOTHING HERE WORKS ALONE");
    expect(forged.seed).toBe(0x59cf7291);
    expect(forged.seedHex).toBe("59cf7291");
    expect(forged.letters.join("")).toBe("NTHGRWKSL");
  });

  it("emits forge steps for the terminal UI", () => {
    const { steps } = forge("NOTHING HERE WORKS ALONE");
    expect(steps[0]?.label).toBe("parsing intent");
    expect(steps.some((s) => s.label.includes("59CF7291"))).toBe(true);
  });

  it("chaos mode keeps the same charge hex with different steps", () => {
    const f = forge("NOTHING HERE WORKS ALONE", "forge");
    const c = forge("NOTHING HERE WORKS ALONE", "chaos");
    expect(c.seed).toBe(f.seed);
    expect(c.mode).toBe("chaos");
    expect(c.steps.some((s) => s.label.includes("scrambling"))).toBe(true);
  });
});

describe("rng + layout", () => {
  it("xorshift repeats for a given seed", () => {
    const a = rng(0x59cf7291);
    const b = rng(0x59cf7291);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("forge layout is deterministic for fixed geometry inputs", () => {
    const letters = reduce("SHIP IT ON TIME").letters;
    const seed = fnv1a("ship it on time");
    const a = layout(letters, seed, 160, 160, 100, "forge");
    const b = layout(letters, seed, 160, 160, 100, "forge");
    expect(a.points).toEqual(b.points);
    expect(a.controls).toEqual(b.controls);
    expect(a.closed).toBe(false);
  });

  it("chaos layout is closed, deterministic, and distinct from forge", () => {
    const letters = reduce("SHIP IT ON TIME").letters;
    const seed = fnv1a("ship it on time");
    const a = layout(letters, seed, 160, 160, 100, "chaos");
    const b = layout(letters, seed, 160, 160, 100, "chaos");
    const forgeGeo = layout(letters, seed, 160, 160, 100, "forge");
    expect(a.points).toEqual(b.points);
    expect(a.closed).toBe(true);
    expect(a.chords.length).toBeGreaterThan(0);
    expect(a.points).not.toEqual(forgeGeo.points);
  });
});

describe("stencil svg", () => {
  it("emits a black stroke SVG for forge and chaos", () => {
    const { svg, forged } = stencilFromIntent("SHIP IT ON TIME", "forge");
    expect(forged.seedHex).toBe("ec33b16a");
    expect(svg).toContain("<svg");
    expect(svg).toContain('stroke="#000"');
    expect(svg).toContain("<path");
    expect(svg).not.toContain("fill=\"#");
  });

  it("is stable for a given intent/mode", () => {
    const forged = forge("NOTHING HERE WORKS ALONE", "chaos");
    expect(buildStencilSvg(forged)).toBe(buildStencilSvg(forged));
  });
});
