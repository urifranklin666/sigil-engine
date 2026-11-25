# Sigil Engine

Faithful port of the legacy sigil engine from deadplug-web. Reduce intent (vowels out, duplicates out), seed FNV-1a from the lowercased intent, bind survivors as **FORGE** (three-ring open path) or **CHAOS** (scrambled closed wheel + chords). **Same intent + mode → same sigil. Forever.**

## Pipeline

1. **Reduce** — keep A–Z only, strip vowels, collapse duplicate consonants (first occurrence wins).
2. **Seed** — FNV-1a over `intent.toLowerCase()` (legacy charge; empty → `"void"`).
3. **Bind**
   - **FORGE** — three-ring open quadratic path (legacy live canvas).
   - **CHAOS** — seeded shuffle, closed wheel, cross-chords (same charge hex).

Reference charge from the extracted product media:

| Intent | Survivors | Seed |
| --- | --- | --- |
| `NOTHING HERE WORKS ALONE` | `N T H G R W K S L` | `0x59CF7291` |

## Develop

```bash
npm install
npm test
npm run dev
```

Demo: [http://127.0.0.1:5173](http://127.0.0.1:5173) — switch FORGE / CHAOS, export PNG or Stencil SVG.

## Use as a library

```ts
import { forge, paintCanvas, stencilFromIntent } from "sigil-engine";

const result = forge("SHIP IT ON TIME", "chaos");
// result.letters, result.seed, result.seedHex, result.steps, result.mode

const { svg } = stencilFromIntent("SHIP IT ON TIME", "forge");
// black stroke SVG for vinyl / laser / plotter
```

React live canvas:

```tsx
import { SigilLive } from "sigil-engine/react";

<SigilLive initial="SHIP IT ON TIME" mode="chaos" />
```

## Source

Extracted from deadplug-web (ASSET-03) before the deadplug.digital rebuild.
