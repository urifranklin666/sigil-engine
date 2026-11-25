import { useMemo, useState } from "react";
import { SigilLive } from "../src/components/sigil/SigilLive";
import { forge, type ForgeResult } from "../src/engine";

const DEFAULT = "NOTHING HERE WORKS ALONE";

export function App() {
  const [result, setResult] = useState<ForgeResult>(() => forge(DEFAULT));
  const nodes = result.letters.length;
  const entropy = useMemo(
    () => ((result.seed % 9000) + 1000).toString(),
    [result.seed],
  );

  return (
    <div className="app">
      <header className="brand">
        <p className="brand-mark">SIGIL ENGINE</p>
        <p className="brand-sub">deadplug extract · deterministic · forever</p>
      </header>

      <main className="stage">
        <section className="forge-panel" aria-label="Forge log">
          <div className="tabs">
            <span className="tab active">FORGE</span>
            <span className="tab muted">CHAOS</span>
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
            <p className="method-title">METHOD</p>
            <ol>
              <li>
                <strong>Vowels are cowards.</strong> Removed.
              </li>
              <li>
                <strong>Duplicate letters are vanity.</strong> Collapsed.
              </li>
              <li>
                <strong>What survives is bound across the wheel.</strong>
              </li>
              <li>
                <strong>Same intent, same sigil. Forever.</strong> It is maths,
                but spooky.
              </li>
            </ol>
            <p className="disclaimer">
              Classic chaos-magick reduction, implemented in strict mode. We
              accept no liability for demons, mergers, or unexpected uptime.
            </p>
          </div>
        </section>

        <section className="canvas-panel" aria-label="Live sigil">
          <SigilLive initial={DEFAULT} onForge={setResult} />
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
              <span>CHARGE</span>
              <strong>100%</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
