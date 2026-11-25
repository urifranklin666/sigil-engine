"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildStencilSvg,
  downloadPng,
  downloadText,
  forge,
  paintCanvas,
  type ForgeResult,
  type SigilMode,
} from "../../engine";

type Props = {
  initial?: string;
  mode?: SigilMode;
  onForge?: (result: ForgeResult) => void;
  showExport?: boolean;
};

export function SigilLive({
  initial = "SHIP IT ON TIME",
  mode = "forge",
  onForge,
  showExport = true,
}: Props) {
  const [intent, setIntent] = useState(initial);
  const [result, setResult] = useState<ForgeResult>(() => forge(initial, mode));
  const ref = useRef<HTMLCanvasElement>(null);
  const onForgeRef = useRef(onForge);
  onForgeRef.current = onForge;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const paint = () => {
      const next = paintCanvas(canvas, intent, { mode });
      setResult(next);
      onForgeRef.current?.(next);
    };

    paint();

    const ro = new ResizeObserver(() => paint());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [intent, mode]);

  const slug =
    result.letters.join("").toLowerCase() || result.seedHex.slice(0, 8);

  const exportPng = () => {
    const canvas = ref.current;
    if (!canvas) return;
    downloadPng(canvas, `sigil-${mode}-${slug}.png`);
  };

  const exportStencil = () => {
    const svg = buildStencilSvg(result);
    downloadText(svg, `sigil-${mode}-${slug}-stencil.svg`);
  };

  return (
    <div className="sigil-live">
      <div className="panel-head">
        <span className="eyebrow live">
          Live · {mode === "chaos" ? "chaos wheel" : "deterministic"}
        </span>
        <span className="eyebrow faint">canvas 2d</span>
      </div>
      <canvas ref={ref} aria-label={`Sigil for: ${intent}`} role="img" />
      <div className="sigil-in">
        <input
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          aria-label="Intent"
          placeholder="type an intent"
          maxLength={80}
          spellCheck={false}
        />
        {showExport ? (
          <div className="sigil-exports">
            <button type="button" className="sigil-export" onClick={exportPng}>
              Export PNG
            </button>
            <button
              type="button"
              className="sigil-export"
              onClick={exportStencil}
            >
              Stencil SVG
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
