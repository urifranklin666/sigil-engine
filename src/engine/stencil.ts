import { forge, layout, type ForgeResult, type Layout, type SigilMode } from "./core";

export type StencilOptions = {
  size?: number;
  strokeWidth?: number;
  /** Include the outer guide ring (helpful for alignment, still cuttable). */
  guideRing?: boolean;
};

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function pathFromLayout(geo: Layout): string {
  const { points, controls, cx, cy, closed } = geo;
  if (!points.length) return "";

  const parts: string[] = [`M ${fmt(points[0]!.x)} ${fmt(points[0]!.y)}`];
  for (let i = 1; i < points.length; i++) {
    const m = points[i - 1]!;
    const p = points[i]!;
    const k = controls[i - 1] ?? 0.5;
    parts.push(
      `Q ${fmt(cx + (m.x - cx) * k)} ${fmt(cy + (m.y - cy) * k)} ${fmt(p.x)} ${fmt(p.y)}`,
    );
  }
  if (closed && points.length > 2) {
    const last = points[points.length - 1]!;
    const first = points[0]!;
    const k = controls[points.length - 1] ?? 0.5;
    parts.push(
      `Q ${fmt(cx + (last.x - cx) * k)} ${fmt(cy + (last.y - cy) * k)} ${fmt(first.x)} ${fmt(first.y)}`,
    );
    parts.push("Z");
  }
  return parts.join(" ");
}

function chordsPath(geo: Layout): string {
  return geo.chords
    .map(({ from, to }) => {
      const a = geo.points[from];
      const b = geo.points[to];
      if (!a || !b) return "";
      return `M ${fmt(a.x)} ${fmt(a.y)} L ${fmt(b.x)} ${fmt(b.y)}`;
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Build a cutter-friendly SVG stencil: black strokes on transparent,
 * no fills / markers / labels. Suitable for vinyl / laser / plotter.
 */
export function buildStencilSvg(
  forged: ForgeResult,
  opts: StencilOptions = {},
): string {
  const size = opts.size ?? 512;
  const strokeWidth = opts.strokeWidth ?? 2.4;
  const guideRing = opts.guideRing ?? true;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.42;
  const geo = layout(forged.letters, forged.seed, cx, cy, R, forged.mode);
  const main = pathFromLayout(geo);
  const chords = chordsPath(geo);

  const layers: string[] = [];
  if (guideRing) {
    layers.push(
      `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(R)}" fill="none" stroke="#000" stroke-width="${fmt(strokeWidth * 0.55)}"/>`,
    );
  }
  if (chords) {
    layers.push(
      `<path d="${chords}" fill="none" stroke="#000" stroke-width="${fmt(strokeWidth * 0.7)}" stroke-linecap="round"/>`,
    );
  }
  if (main) {
    layers.push(
      `<path d="${main}" fill="none" stroke="#000" stroke-width="${fmt(strokeWidth)}" stroke-linejoin="miter" stroke-linecap="round"/>`,
    );
  }

  const title = forged.letters.join("") || "VOID";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Stencil sigil ${title}">
  <title>sigil-${title.toLowerCase()}-${forged.mode}-stencil</title>
  <desc>Deterministic ${forged.mode} stencil · seed 0x${forged.seedHex} · survivors ${title}</desc>
  ${layers.join("\n  ")}
</svg>
`;
}

export function stencilFromIntent(
  intent: string,
  mode: SigilMode = "forge",
  opts?: StencilOptions,
): { svg: string; forged: ForgeResult } {
  const forged = forge(intent, mode);
  return { svg: buildStencilSvg(forged, opts), forged };
}
