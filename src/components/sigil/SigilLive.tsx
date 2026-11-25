"use client";

import { useEffect, useRef, useState } from "react";
import { downloadPng, forge, paintCanvas, type ForgeResult } from "../../engine";

type Props = {
  initial?: string;
  onForge?: (result: ForgeResult) => void;
  showExport?: boolean;
};

export function SigilLive({
  initial = "SHIP IT ON TIME",
  onForge,
  showExport = true,
}: Props) {
  const [intent, setIntent] = useState(initial);
  const [result, setResult] = useState<ForgeResult>(() => forge(initial));
  const ref = useRef<HTMLCanvasElement>(null);
  const onForgeRef = useRef(onForge);
  onForgeRef.current = onForge;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const paint = () => {
      const next = paintCanvas(canvas, intent);
      setResult(next);
      onForgeRef.current?.(next);
    };

    paint();

    const ro = new ResizeObserver(() => paint());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [intent]);

  const exportPng = () => {
    const canvas = ref.current;
    if (!canvas) return;
    const slug =
      result.letters.join("").toLowerCase() || result.seedHex.slice(0, 8);
    downloadPng(canvas, `sigil-${slug}.png`);
  };

  return (
    <div className="sigil-live">
      <div className="panel-head">
        <span className="eyebrow live">Live · deterministic</span>
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
          <button type="button" className="sigil-export" onClick={exportPng}>
            Export PNG
          </button>
        ) : null}
      </div>
    </div>
  );
}
