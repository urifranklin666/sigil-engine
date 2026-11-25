import {
  forge,
  layout,
  type ForgeResult,
  type Layout,
  type SigilMode,
} from "./core";

export const COLORS = {
  ring: "#2a2d35",
  stroke: "#e8202a",
  chaosStroke: "#ff4a3a",
  chord: "#8a1c22",
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
  mode?: SigilMode;
};

function strokePath(
  ctx: CanvasRenderingContext2D,
  geo: Layout,
  close: boolean,
): void {
  const { points, controls, cx, cy } = geo;
  if (!points.length) return;

  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x, p.y);
      return;
    }
    const m = points[i - 1]!;
    const k = controls[i - 1] ?? 0.5;
    ctx.quadraticCurveTo(cx + (m.x - cx) * k, cy + (m.y - cy) * k, p.x, p.y);
  });

  if (close && points.length > 2) {
    const last = points[points.length - 1]!;
    const first = points[0]!;
    const k = controls[points.length - 1] ?? 0.5;
    ctx.quadraticCurveTo(
      cx + (last.x - cx) * k,
      cy + (last.y - cy) * k,
      first.x,
      first.y,
    );
  }
  ctx.stroke();
}

export function drawSigil(
  ctx: CanvasRenderingContext2D,
  forged: ForgeResult,
  opts: DrawOptions,
): Layout {
  const {
    width: w,
    height: h,
    showMeta = true,
    clear = true,
    mode = forged.mode,
  } = opts;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.42;
  const geo = layout(forged.letters, forged.seed, cx, cy, R, mode);

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

  const { points } = geo;

  if (geo.chords.length) {
    ctx.strokeStyle = COLORS.chord;
    ctx.lineWidth = 0.9;
    for (const { from, to } of geo.chords) {
      const a = points[from];
      const b = points[to];
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = mode === "chaos" ? COLORS.chaosStroke : COLORS.stroke;
  ctx.lineWidth = mode === "chaos" ? 1.85 : 1.6;
  ctx.lineJoin = "miter";
  strokePath(ctx, geo, geo.closed);

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
    if (!geo.closed) {
      ctx.beginPath();
      ctx.moveTo(pn.x - 8, pn.y - 8);
      ctx.lineTo(pn.x + 8, pn.y + 8);
      ctx.moveTo(pn.x + 8, pn.y - 8);
      ctx.lineTo(pn.x - 8, pn.y + 8);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(pn.x, pn.y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (showMeta) {
    ctx.fillStyle = COLORS.meta;
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    const tag = mode === "chaos" ? "chaos" : forged.letters.join("") || "—";
    ctx.fillText(`${tag} · ${forged.seedHex}`, cx, h - 10);
  }

  return geo;
}

/** Paint a forged intent onto a canvas, handling DPR sizing. */
export function paintCanvas(
  canvas: HTMLCanvasElement,
  intent: string,
  opts: { showMeta?: boolean; mode?: SigilMode } = {},
): ForgeResult {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, rect.width || canvas.clientWidth || 320);
  const cssH = Math.max(1, rect.height || canvas.clientHeight || 320);
  const dpr = Math.min(
    2,
    typeof devicePixelRatio === "number" ? devicePixelRatio : 1,
  );

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const mode = opts.mode ?? "forge";
  const forged = forge(intent, mode);
  drawSigil(ctx, forged, {
    width: cssW,
    height: cssH,
    showMeta: opts.showMeta,
    mode,
  });
  return forged;
}

/** Export current canvas content as a PNG download. */
export function downloadPng(canvas: HTMLCanvasElement, filename: string): void {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}

export function downloadText(
  contents: string,
  filename: string,
  mime = "image/svg+xml",
): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
