"use client";
import { useEffect, useRef, useState } from "react";

// A faithful port of the legacy sigil engine's core: reduce the intent
// (vowels out, duplicates out), seed FNV-1a, bind the survivors across a
// three-ring wheel. Same intent, same sigil, forever.
function fnv1a(s: string) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function rng(seed: number) { let x = seed || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 0xffffffff; }; }
function reduce(intent: string) {
  const letters = intent.toUpperCase().replace(/[^A-Z]/g, "").replace(/[AEIOU]/g, "");
  const out: string[] = []; for (const c of letters) if (!out.includes(c)) out.push(c); return out;
}

export function SigilLive({ initial = "SHIP IT ON TIME" }: { initial?: string }) {
  const [intent, setIntent] = useState(initial);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = r.width * dpr; c.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width, h = r.height, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
    ctx.clearRect(0, 0, w, h);
    const letters = reduce(intent);
    const seed = fnv1a(letters.join("") || "VOID");
    const rand = rng(seed);
    const rings = [R, R * 0.68, R * 0.36];
    ctx.strokeStyle = "#2a2d35"; ctx.lineWidth = 1;
    for (const rr of rings) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); }
    const pts = letters.map((ch, i) => {
      const ring = rings[(ch.charCodeAt(0) + i) % 3]!;
      const a = ((ch.charCodeAt(0) - 65) / 21) * Math.PI * 2 + rand() * 0.4 - 0.2;
      return { x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring };
    });
    ctx.strokeStyle = "#e8202a"; ctx.lineWidth = 1.6; ctx.lineJoin = "miter";
    ctx.beginPath();
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else { const m = pts[i - 1]!; const k = 0.5 + rand() * 0.5; ctx.quadraticCurveTo(cx + (m.x - cx) * k, cy + (m.y - cy) * k, p.x, p.y); } });
    ctx.stroke();
    ctx.fillStyle = "#e8e6e1";
    for (const p of pts) ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
    if (pts.length) { const p0 = pts[0]!, pn = pts[pts.length - 1]!; ctx.strokeStyle = "#e8e6e1"; ctx.beginPath(); ctx.arc(p0.x, p0.y, 7, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(pn.x - 8, pn.y - 8); ctx.lineTo(pn.x + 8, pn.y + 8); ctx.moveTo(pn.x + 8, pn.y - 8); ctx.lineTo(pn.x - 8, pn.y + 8); ctx.stroke(); }
    ctx.fillStyle = "#5f5e5a"; ctx.font = "10px var(--font-mono), monospace"; ctx.textAlign = "center";
    ctx.fillText(`${letters.join("") || "—"} · ${seed.toString(16).padStart(8, "0")}`, cx, h - 10);
  }, [intent]);

  return (
    <div className="sigil-live">
      <div className="panel-head"><span className="eyebrow live">Live · deterministic</span><span className="eyebrow faint">canvas 2d</span></div>
      <canvas ref={ref} aria-label={`Sigil for: ${intent}`} role="img" />
      <div className="sigil-in">
        <input value={intent} onChange={(e) => setIntent(e.target.value)} aria-label="Intent" placeholder="type an intent" maxLength={80} spellCheck={false} />
      </div>
    </div>
  );
}
