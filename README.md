# Sigil Engine

Two tools, one repo, both live on deadplug.digital:

- **Infernal** (`infernal/`, vanilla JS) at https://deadplug.digital/sigil/ — five ritual styles, palettes, rotating rings, PNG/SVG export, share links, grimoire. This is the product.
- **The Wheel** (`src/` + `demo/`, React/Vite, this package) at https://deadplug.digital/sigil/forge/ — the classic three-ring engine from deadplug-web, as a tested library and a live forge.

Deploy both with `./deploy/sigil-deploy` (tests, builds with base `/sigil/forge/`, rsyncs into /srv/www/deadplug-apps/sigil, mirrors into the deadplug-apps repo). Fonts come from the network's signal bundle because the hub CSP does not allow Google Fonts.


Faithful port of the legacy sigil engine from deadplug-web. Reduce intent (vowels out, duplicates out), seed FNV-1a from the lowercased intent, bind survivors across a three-ring wheel. **Same intent, same sigil, forever.**

## Pipeline

1. **Reduce** — keep A–Z only, strip vowels, collapse duplicate consonants (first occurrence wins).
2. **Seed** — FNV-1a over `intent.toLowerCase()` (legacy charge; empty → `"void"`).
3. **Bind** — xorshift32 from that seed places survivors on a three-ring wheel and draws quadratic arcs between them.

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

Demo: [http://127.0.0.1:5173](http://127.0.0.1:5173)

## Use as a library

```ts
import { forge, paintCanvas } from "sigil-engine";

const result = forge("SHIP IT ON TIME");
// result.letters, result.seed, result.seedHex, result.steps
```

React live canvas:

```tsx
import { SigilLive } from "sigil-engine/react";

<SigilLive initial="SHIP IT ON TIME" />
```

## Source

Extracted from deadplug-web (ASSET-03) before the deadplug.digital rebuild.
