import { useMemo, useState } from "react";
import { SigilLive } from "../src/components/sigil/SigilLive";
import { forge, type ForgeResult, type SigilMode } from "../src/engine";

const DEFAULT = "NOTHING HERE WORKS ALONE";

const METHOD = {
  forge: {
    title: "METHOD",
    items: [
      <>
        <strong>Vowels are cowards.</strong> Removed.
      </>,
      <>
        <strong>Duplicate letters are vanity.</strong> Collapsed.
      </>,
      <>
        <strong>What survives is bound across the wheel.</strong>
      </>,
      <>
        <strong>Same intent, same sigil. Forever.</strong> It is maths, but
        spooky.
      </>,
    ],
    disclaimer:
      "Classic chaos-magick reduction, implemented in strict mode. We accept no liability for demons, mergers, or unexpected uptime.",
  },
  chaos: {
    title: "METHOD · CHAOS",
    items: [
      <>
        <strong>Same reduction.</strong> Vowels and vanity still die.
      </>,
      <>
        <strong>The wheel is scrambled.</strong> Seed shuffles the order.
      </>,
      <>
        <strong>Path closes.</strong> Cross-chords stitch the survivors.
      </>,
      <>
        <strong>Same intent + chaos → same unbound form.</strong> Still maths.
      </>,
    ],
    disclaimer:
      "Chaos mode keeps the charge hex, mutates the bind. Stencil export stays cuttable either way.",
  },
} as const;

export function App() {
  const [mode, setMode] = useState<SigilMode>("forge");
  const [result, setResult] = useState<ForgeResult>(() =>
    forge(DEFAULT, "forge"),
  );
  const nodes = result.letters.length;
  const entropy = useMemo(
    () => ((result.seed % 9000) + 1000).toString(),
    [result.seed],
  );
  const copy = METHOD[mode];

  return (
    <div className="app">
      <header className="brand">
        <p className="brand-mark">SIGIL ENGINE</p>
        <p className="brand-sub">deadplug extract · deterministic · forever</p>
      </header>

      <main className="stage">
        <section className="forge-panel" aria-label="Forge log">
          <div className="tabs" role="tablist" aria-label="Bind mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "forge"}
              className={`tab ${mode === "forge" ? "active" : "muted"}`}
              onClick={() => setMode("forge")}
            >
              FORGE
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "chaos"}
              className={`tab ${mode === "chaos" ? "active" : "muted"}`}
              onClick={() => setMode("chaos")}
            >
              CHAOS
            </button>
          </div>

          <h1 className="intent-echo">{result.intent || "—"}</h1>

          <ol className="terminal">
            {result.steps.map((step) => (
              <li key={step.label}>
                <span className="prompt">&gt;</span>
                <span className="label">{step.label}</span>
                <span className="dots" aria-hidden="true" />
                <span className="detail">{step.detail}</span>
              </li>
            ))}
          </ol>

          <div className="method">
            <p className="method-title">{copy.title}</p>
            <ol>
              {copy.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
            <p className="disclaimer">{copy.disclaimer}</p>
          </div>
        </section>

        <section className="canvas-panel" aria-label="Live sigil">
          <SigilLive initial={DEFAULT} mode={mode} onForge={setResult} />
          <div className="meters" aria-hidden="true">
            <div>
              <span>ENTROPY</span>
              <strong>{entropy}%</strong>
            </div>
            <div>
              <span>NODES</span>
              <strong>{String(nodes).padStart(2, "0")}</strong>
            </div>
            <div>
              <span>MODE</span>
              <strong>{mode.toUpperCase()}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
