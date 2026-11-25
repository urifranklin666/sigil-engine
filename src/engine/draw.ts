import { forge, layout, type ForgeResult, type Layout } from "./core";

export const COLORS = {
  ring: "#2a2d35",
  stroke: "#e8202a",
  node: "#e8e6e1",
  meta: "#5f5e5a",
  bg: "#0a0a0b",
} as const;

export type DrawOptions = {
  width: number;
  height: number;
  dpr?: number;
  showMeta?: boolean;
  clear?: boolean;
};

export function drawSigil(
  ctx: CanvasRenderingContext2D,
  forged: ForgeResult,
  opts: DrawOptions,
): Layout {
  const { width: w, height: h, showMeta = true, clear = true } = opts;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.42;
  const geo = layout(forged.letters, forged.seed, cx, cy, R);

  if (clear) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.strokeStyle = COLORS.ring;
  ctx.lineWidth = 1;
  for (const rr of geo.rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }

  const { points, controls } = geo;
  ctx.strokeStyle = COLORS.stroke;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "miter";
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x, p.y);
      return;
    }
    const m = points[i - 1]!;
    const k = controls[i - 1]!;
    ctx.quadraticCurveTo(cx + (m.x - cx) * k, cy + (m.y - cy) * k, p.x, p.y);
  });
  ctx.stroke();

  ctx.fillStyle = COLORS.node;
  for (const p of points) {
    ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
  }

  if (points.length) {
    const p0 = points[0]!;
    const pn = points[points.length - 1]!;
    ctx.strokeStyle = COLORS.node;
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pn.x - 8, pn.y - 8);
    ctx.lineTo(pn.x + 8, pn.y + 8);
    ctx.moveTo(pn.x + 8, pn.y - 8);
    ctx.lineTo(pn.x - 8, pn.y + 8);
    ctx.stroke();
  }

  if (showMeta) {
    ctx.fillStyle = COLORS.meta;
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `${forged.letters.join("") || "—"} · ${forged.seedHex}`,
      cx,
      h - 10,
    );
  }

  return geo;
}

/** Paint a forged intent onto a canvas, handling DPR sizing. */
export function paintCanvas(
  canvas: HTMLCanvasElement,
  intent: string,
  opts: { showMeta?: boolean } = {},
): ForgeResult {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, rect.width || canvas.clientWidth || 320);
  const cssH = Math.max(1, rect.height || canvas.clientHeight || 320);
  const dpr = Math.min(2, typeof devicePixelRatio === "number" ? devicePixelRatio : 1);

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const forged = forge(intent);
  drawSigil(ctx, forged, { width: cssW, height: cssH, showMeta: opts.showMeta });
  return forged;
}

/** Export current canvas content as a PNG download. */
export function downloadPng(canvas: HTMLCanvasElement, filename: string): void {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
