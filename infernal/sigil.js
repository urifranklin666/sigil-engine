const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const phraseEl = document.getElementById('phrase');
const hashEl = document.getElementById('hash');
const grid = document.getElementById('grid');
const toastEl = document.getElementById('toast');
const statusEl = document.getElementById('markStatus');
const countEl = document.getElementById('phraseCount');

let hue = 356, sat = 100, light = 52, glow = 14, rings = 3, inverted = false, outerRings = true, animating = true;
let sigilType = 'infernal';
let animId = null, currentPhrase = 'deadplug', animationPhase = 0, toastTimer = null;

const SEEDS = [
  'LEVIATHAN',
  'BAPHOMET',
  'LUCIFER',
  'SATAN',
  'ABADDON',
  'DEADPLUG',
  'AZAZEL',
  'HAIL THE VOID',
  'NO GODS NO MASTERS',
  'ASMODEUS',
  'BEELZEBUB',
  'BELIAL'
];

const ELDER_RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'];

const CHAR_TO_RUNE = {
  'A': 'ᚨ', 'B': 'ᛒ', 'C': 'ᚲ', 'D': 'ᛞ', 'E': 'ᛖ', 'F': 'ᚠ',
  'G': 'ᚷ', 'H': 'ᚺ', 'I': 'ᛁ', 'J': 'ᛃ', 'K': 'ᚲ', 'L': 'ᛚ',
  'M': 'ᛗ', 'N': 'ᚾ', 'O': 'ᛟ', 'P': 'ᛈ', 'Q': 'ᚲ', 'R': 'ᚱ',
  'S': 'ᛊ', 'T': 'ᛏ', 'U': 'ᚢ', 'V': 'ᚢ', 'W': 'ᚹ', 'X': 'ᛉ',
  'Y': 'ᛃ', 'Z': 'ᛉ', '0': 'ᛟ', '1': 'ᛁ', '2': 'ᛏ', '3': 'ᚦ',
  '4': 'ᚠ', '5': 'ᚱ', '6': 'ᚲ', '7': 'ᚷ', '8': 'ᚺ', '9': 'ᛊ'
};

function fnv1a(str){
  let h = 0x811c9dc5;
  for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function extractOccultEntropy(phrase, rnd){
  const clean = phrase.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const rawChars = clean.length > 0 ? clean.split('') : ['D','E','A','D','P','L','U','G'];

  const consonants = [];
  const vowels = [];
  for(const c of rawChars){
    if('AEIOU'.includes(c)) vowels.push(c);
    else consonants.push(c);
  }

  const glyphChars = consonants.length > 0 ? consonants : vowels;
  const unique = [];
  const seen = new Set();
  for(const c of glyphChars){
    if(!seen.has(c)){ seen.add(c); unique.push(c); }
  }

  while(unique.length < 5){
    const base = rawChars[unique.length % rawChars.length].charCodeAt(0);
    const nextChar = String.fromCharCode(65 + ((base * (unique.length + 3) + Math.floor(rnd() * 26)) % 26));
    if(!seen.has(nextChar)){
      seen.add(nextChar);
      unique.push(nextChar);
    } else {
      unique.push(String.fromCharCode(65 + Math.floor(rnd() * 26)));
    }
  }
  return { rawChars, glyphChars: unique.slice(0, 8) };
}

function getRuneRing(entropy, count = 24, rnd){
  const clean = entropy.rawChars;
  const ringRunes = [];

  for(const ch of clean){
    const r = CHAR_TO_RUNE[ch];
    if(r && !ringRunes.includes(r)){
      ringRunes.push(r);
    }
  }

  const remaining = ELDER_RUNES.filter(r => !ringRunes.includes(r));
  for(let i = remaining.length - 1; i > 0; i--){
    const j = Math.floor(rnd() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  const full = ringRunes.concat(remaining);
  return full.slice(0, count);
}

function hsl(h,s,l){ return `hsl(${h},${s}%,${l}%)`; }

function notify(message){
  toastEl.textContent = message;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200);
}

function updateCount(){ countEl.textContent = phraseEl.value.length; }

/* ZERO CURVES: Pure straight line geometry helpers */
function drawPolygon(c, cx, cy, r, sides, rot = 0, fill = false){
  c.beginPath();
  for(let i=0; i<sides; i++){
    const ang = rot + (i / sides) * Math.PI * 2;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    if(i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  if(fill) c.fill();
  else c.stroke();
}

function drawDiamond(c, cx, cy, w, h, rot = 0, fill = true){
  c.save();
  c.translate(cx, cy);
  c.rotate(rot);
  c.beginPath();
  c.moveTo(0, -h);
  c.lineTo(w, 0);
  c.lineTo(0, h);
  c.lineTo(-w, 0);
  c.closePath();
  if(fill) c.fill();
  else c.stroke();
  c.restore();
}

function drawSpike(c, x1, y1, x2, y2, barbW = 5){
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = y2 - y1;
  const dy = -(x2 - x1);
  const len = Math.hypot(dx, dy) || 1;
  const nx = (dx / len) * barbW;
  const ny = (dy / len) * barbW;

  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(mx + nx, my + ny);
  c.lineTo(x2, y2);
  c.lineTo(mx - nx, my - ny);
  c.closePath();
  c.stroke();
}

/* Occult Inverted Star (5, 7, or 9 points) with barbed thorn tips */
function drawOccultInvertedStar(c, cx, cy, r, points = 5, rot = 0, rnd = Math.random){
  const pts = [];
  const startAng = rot + Math.PI / 2; // Inverted: points directly DOWNWARD
  for(let i = 0; i < points; i++){
    const ang = startAng + (i * 2 * Math.PI / points);
    pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, ang });
  }

  const step = (points === 5) ? 2 : ((points === 7) ? (rnd() > 0.5 ? 2 : 3) : 2);
  c.beginPath();
  let curr = 0;
  for(let i = 0; i <= points; i++){
    const pt = pts[curr];
    if(i === 0) c.moveTo(pt.x, pt.y);
    else c.lineTo(pt.x, pt.y);
    curr = (curr + step) % points;
  }
  c.stroke();

  // Inner polygon boundary
  const innerFactor = (points === 5) ? 0.382 : 0.42;
  drawPolygon(c, cx, cy, r * innerFactor, points, startAng);

  // Sharp radial thorn spines from each vertex
  const spineMultiplier = 1.15 + (rnd ? rnd() * 0.18 : 0.12);
  for(let i = 0; i < points; i++){
    const p = pts[i];
    const ang = p.ang;
    const tipX = cx + Math.cos(ang) * (r * spineMultiplier);
    const tipY = cy + Math.sin(ang) * (r * spineMultiplier);
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(tipX, tipY);
    c.stroke();

    // Barb brackets on thorns
    const barbSpread = 0.25 + (rnd ? rnd() * 0.12 : 0.05);
    const barbRad = r * (0.08 + (rnd ? rnd() * 0.08 : 0.04));
    const bx1 = p.x + Math.cos(ang + barbSpread) * barbRad;
    const by1 = p.y + Math.sin(ang + barbSpread) * barbRad;
    const bx2 = p.x + Math.cos(ang - barbSpread) * barbRad;
    const by2 = p.y + Math.sin(ang - barbSpread) * barbRad;
    c.beginPath();
    c.moveTo(bx1, by1); c.lineTo(tipX, tipY); c.lineTo(bx2, by2);
    c.stroke();

    if(i === 0 || (points === 5 && (i === 1 || i === 4))){
      drawDiamond(c, tipX, tipY, 4, 6, ang, true);
    }
  }
}

/* Occult Inverted Cross / Leviathan Sulfur Emblem made of straight lines */
function drawLeviathanCross(c, cx, cy, size, rnd = Math.random){
  const h = size * (0.8 + (rnd ? rnd() * 0.3 : 0.1));
  const w = size * (0.55 + (rnd ? rnd() * 0.25 : 0.1));
  const w2 = size * (0.35 + (rnd ? rnd() * 0.2 : 0.1));

  // Main vertical shaft pointing downwards
  c.beginPath();
  c.moveTo(cx, cy - h * 0.45);
  c.lineTo(cx, cy + h * 0.72);
  c.stroke();

  // Downward spearhead tip
  const spearW = 8 + (rnd ? Math.floor(rnd() * 6) : 2);
  c.beginPath();
  c.moveTo(cx - spearW, cy + h * 0.6);
  c.lineTo(cx, cy + h * 0.78);
  c.lineTo(cx + spearW, cy + h * 0.6);
  c.stroke();

  // Upper horizontal bar
  const y1 = cy - h * 0.15;
  c.beginPath();
  c.moveTo(cx - w2, y1);
  c.lineTo(cx + w2, y1);
  c.stroke();
  drawDiamond(c, cx - w2, y1, 4, 4);
  drawDiamond(c, cx + w2, y1, 4, 4);

  // Lower wide horizontal bar
  const y2 = cy + h * 0.18;
  c.beginPath();
  c.moveTo(cx - w, y2);
  c.lineTo(cx + w, y2);
  c.stroke();
  drawDiamond(c, cx - w, y2, 6, 6);
  drawDiamond(c, cx + w, y2, 6, 6);

  // Inverted sulfur chevron diamond at top
  drawDiamond(c, cx, cy - h * 0.45, 8, 8, 0, false);
}

/* Angular Demon Horns / Chevron Blades */
function drawDemonHorns(c, cx, cy, r, rnd = Math.random){
  const flare = 0.4 + (rnd ? rnd() * 0.35 : 0.15);
  const height = 0.7 + (rnd ? rnd() * 0.35 : 0.15);
  const midSpread = 0.25 + (rnd ? rnd() * 0.2 : 0.1);

  // Left horn
  c.beginPath();
  c.moveTo(cx - r * 0.2, cy - r * 0.15);
  c.lineTo(cx - r * flare, cy - r * height);
  c.lineTo(cx - r * midSpread, cy - r * 0.45);
  c.lineTo(cx - r * 0.1, cy - r * 0.25);
  c.stroke();
  drawDiamond(c, cx - r * flare, cy - r * height, 3, 5, -0.4, true);

  // Right horn
  c.beginPath();
  c.moveTo(cx + r * 0.2, cy - r * 0.15);
  c.lineTo(cx + r * flare, cy - r * height);
  c.lineTo(cx + r * midSpread, cy - r * 0.45);
  c.lineTo(cx + r * 0.1, cy - r * 0.25);
  c.stroke();
  drawDiamond(c, cx + r * flare, cy - r * height, 3, 5, 0.4, true);
}

/* BESPOKE DEMONIC SEED GLYPH (Pure straight lines forged directly from seed phrase) */
function drawDemonicSeedGlyph(c, cx, cy, r, entropy, rnd){
  const chars = entropy.glyphChars;
  const n = chars.length;
  const pts = [];

  for(let i = 0; i < n; i++){
    const code = chars[i].charCodeAt(0);
    const ang = (i / n) * Math.PI * 2 + ((code % 13) / 13) * 0.6;
    const radFactor = 0.25 + 0.55 * (((code * 7) % 100) / 100 * 0.5 + rnd() * 0.5);
    const rad = r * radFactor;
    pts.push({
      x: cx + Math.cos(ang) * rad,
      y: cy + Math.sin(ang) * rad,
      ang: ang,
      code: code
    });
  }

  c.save();
  c.lineWidth = 2.4;
  c.beginPath();
  for(let i = 0; i < n; i++){
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    if(i === 0) c.moveTo(p1.x, p1.y);

    if(p1.code % 2 === 0){
      c.lineTo(p2.x, p1.y);
      c.lineTo(p2.x, p2.y);
    } else {
      c.lineTo(p2.x, p2.y);
    }
  }
  c.stroke();

  // Diagonal cross chords between opposite nodes
  c.beginPath();
  for(let i = 0; i < Math.floor(n / 2); i++){
    const p1 = pts[i];
    const p2 = pts[(i + Math.floor(n / 2)) % n];
    c.moveTo(p1.x, p1.y);
    c.lineTo(p2.x, p2.y);
  }
  c.stroke();

  // Terminals at each character node
  for(let i = 0; i < n; i++){
    const p = pts[i];
    const termType = (p.code + i) % 4;

    if(termType === 0){
      const spearLen = 14 + (p.code % 8);
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x, p.y + spearLen);
      c.lineTo(p.x - 5, p.y + spearLen - 4);
      c.moveTo(p.x, p.y + spearLen);
      c.lineTo(p.x + 5, p.y + spearLen - 4);
      c.stroke();
    } else if(termType === 1){
      const barW = 10 + (p.code % 6);
      c.beginPath();
      c.moveTo(p.x - barW, p.y);
      c.lineTo(p.x + barW, p.y);
      c.stroke();
      drawDiamond(c, p.x - barW, p.y, 3, 3);
      drawDiamond(c, p.x + barW, p.y, 3, 3);
    } else if(termType === 2){
      const tipX = p.x + Math.cos(p.ang) * 16;
      const tipY = p.y + Math.sin(p.ang) * 16;
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(tipX, tipY);
      c.stroke();
      drawDiamond(c, tipX, tipY, 4, 4, p.ang, true);
    } else {
      drawDiamond(c, p.x, p.y, 6, 6, p.ang, true);
    }
  }

  c.restore();
}

/* 3 INDEPENDENTLY ROTATING RINGS (100% Straight Lines & Runes) */

// RING 1: OUTERMOST FACETED RING (rotates counter-clockwise)
function drawOuterRing1(c, cx, cy, maxR, fg, phase, rnd, entropy){
  const rOuter = maxR * 1.02;
  const rInner = maxR * 0.93;
  const rot = -phase * 0.75;
  const sides = 32;

  c.save();
  c.translate(cx, cy);
  c.rotate(rot);
  c.translate(-cx, -cy);

  // Concentric 32-gon polygon borders (no arcs)
  c.lineWidth = 2.4;
  c.globalAlpha = 0.9;
  drawPolygon(c, cx, cy, rOuter, sides);
  c.globalAlpha = 0.6;
  c.lineWidth = 1.4;
  drawPolygon(c, cx, cy, rInner, sides);

  // Outward razor-sharp sawteeth at every vertex - modulated by phrase entropy
  c.globalAlpha = 0.85;
  c.lineWidth = 2.0;
  for(let i = 0; i < sides; i++){
    const ang = (i / sides) * Math.PI * 2;
    const xBase1 = cx + Math.cos(ang - 0.045) * rOuter;
    const yBase1 = cy + Math.sin(ang - 0.045) * rOuter;
    const xBase2 = cx + Math.cos(ang + 0.045) * rOuter;
    const yBase2 = cy + Math.sin(ang + 0.045) * rOuter;

    const isCardinal = (i % 8 === 0);
    const spikeVariation = Math.floor(rnd() * 16);
    const spikeLen = isCardinal ? (28 + spikeVariation) : (12 + (spikeVariation % 12));
    const xTip = cx + Math.cos(ang) * (rOuter + spikeLen);
    const yTip = cy + Math.sin(ang) * (rOuter + spikeLen);

    c.beginPath();
    c.moveTo(xBase1, yBase1);
    c.lineTo(xTip, yTip);
    c.lineTo(xBase2, yBase2);
    c.stroke();

    if(isCardinal){
      drawDiamond(c, xTip, yTip, 3, 5, ang, true);
    }
  }

  // 24 Elder Futhark runes etched between outer and inner polygon facets
  const runes = getRuneRing(entropy, 24, rnd);
  const runeR = (rOuter + rInner) / 2;
  c.font = '700 20px "JetBrains Mono", monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = fg;

  for(let i = 0; i < 24; i++){
    const ang = (i / 24) * Math.PI * 2;
    const rx = cx + Math.cos(ang) * runeR;
    const ry = cy + Math.sin(ang) * runeR;

    c.save();
    c.translate(rx, ry);
    c.rotate(ang + Math.PI / 2);
    c.fillText(runes[i % runes.length], 0, 0);
    c.restore();
  }

  // Radial degree tick marks
  c.lineWidth = 1.0;
  c.globalAlpha = 0.45;
  for(let i = 0; i < 64; i++){
    const ang = (i / 64) * Math.PI * 2;
    const tickLen = 5 + Math.floor(rnd() * 4);
    const x1 = cx + Math.cos(ang) * (rInner - tickLen);
    const y1 = cy + Math.sin(ang) * (rInner - tickLen);
    const x2 = cx + Math.cos(ang) * (rInner + 4);
    const y2 = cy + Math.sin(ang) * (rInner + 4);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  c.restore();
}

// RING 2: MIDDLE STAR MATRIX RING (rotates clockwise)
function drawMiddleRing2(c, cx, cy, maxR, fg, phase, rnd, entropy){
  const r = maxR * 0.70;
  const rot = phase * 1.15;
  const sides = 24;

  c.save();
  c.translate(cx, cy);
  c.rotate(rot);
  c.translate(-cx, -cy);

  // Concentric polygon track
  c.lineWidth = 2.0;
  c.globalAlpha = 0.8;
  drawPolygon(c, cx, cy, r, sides);
  c.globalAlpha = 0.4;
  drawPolygon(c, cx, cy, r * 0.92, sides);

  // Collect vertices for sharp chord matrices
  const pts = [];
  for(let i = 0; i < sides; i++){
    const ang = (i / sides) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, ang });
  }

  // Intersecting straight chords (Star Matrix lattice) - jump steps driven by phrase seed!
  const jump1 = 5 + Math.floor(rnd() * 4);
  const jump2 = 2 + Math.floor(rnd() * 3);
  c.lineWidth = 1.2;
  c.globalAlpha = 0.55;
  c.beginPath();
  for(let i = 0; i < sides; i++){
    const p1 = pts[i];
    const p2 = pts[(i + jump1) % sides];
    c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y);
    if(i % 2 === 0){
      const p3 = pts[(i + jump2) % sides];
      c.moveTo(p1.x, p1.y); c.lineTo(p3.x, p3.y);
    }
  }
  c.stroke();

  // Inward pointing acute daggers
  c.lineWidth = 2.0;
  c.globalAlpha = 0.9;
  const daggerStep = (Math.floor(rnd() * 2) === 0) ? 2 : 3;
  for(let i = 0; i < sides; i += daggerStep){
    const ang = pts[i].ang;
    const xBase1 = cx + Math.cos(ang - 0.08) * (r * 0.92);
    const yBase1 = cy + Math.sin(ang - 0.08) * (r * 0.92);
    const xBase2 = cx + Math.cos(ang + 0.08) * (r * 0.92);
    const yBase2 = cy + Math.sin(ang + 0.08) * (r * 0.92);
    const daggerReach = 0.74 - (rnd() * 0.08);
    const daggerTipX = cx + Math.cos(ang) * (r * daggerReach);
    const daggerTipY = cy + Math.sin(ang) * (r * daggerReach);

    c.beginPath();
    c.moveTo(xBase1, yBase1);
    c.lineTo(daggerTipX, daggerTipY);
    c.lineTo(xBase2, yBase2);
    c.stroke();

    drawDiamond(c, daggerTipX, daggerTipY, 4, 4, ang, true);
  }

  c.restore();
}

// RING 3: INNER DEMON RING & SATANIC CORE (rotates counter-clockwise faster)
function drawInnerRing3(c, cx, cy, maxR, fg, phase, rnd, entropy){
  const r = maxR * 0.45;
  const rot = -phase * 1.7;
  const sides = 16;

  c.save();
  c.translate(cx, cy);
  c.rotate(rot);
  c.translate(-cx, -cy);

  // Concentric 16-gon polygon
  c.lineWidth = 2.4;
  c.globalAlpha = 0.9;
  drawPolygon(c, cx, cy, r, sides);
  c.lineWidth = 1.4;
  c.globalAlpha = 0.5;
  drawPolygon(c, cx, cy, r * 0.88, sides);

  // Perimeter sharp thorns along inner ring
  c.lineWidth = 1.6;
  c.globalAlpha = 0.75;
  for(let i = 0; i < sides; i++){
    const ang = (i / sides) * Math.PI * 2;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    const isSpecial = (i % 4 === 0);
    drawDiamond(c, x, y, isSpecial ? 5 : 3, isSpecial ? 8 : 5, ang);
  }

  // CORE OCCULT GEOMETRY (Zero Curves)
  c.lineWidth = 2.6;
  c.globalAlpha = 1.0;

  if(sigilType === 'infernal'){
    // 1. INVERTED OCCULT STAR FRAME (5 or 7 points based on seed)
    const starPts = (Math.floor(rnd() * 2) === 0) ? 5 : 7;
    drawOccultInvertedStar(c, cx, cy, r * 0.84, starPts, 0, rnd);

    // 2. BESPOKE SEED DEMON GLYPH (100% unique straight lines from phrase letters)
    drawDemonicSeedGlyph(c, cx, cy, r * 0.76, entropy, rnd);

    // 3. LEVIATHAN BRIMSTONE CROSS (scaled & barbed by seed)
    drawLeviathanCross(c, cx, cy, r * 0.72, rnd);

    // 4. DEMON HORNS (flare & span driven by seed)
    drawDemonHorns(c, cx, cy, r * 0.92, rnd);

  } else if(sigilType === 'goetic'){
    // GOETIC DEMON SEAL (Ars Goetia labyrinthine circuit)
    drawPolygon(c, cx, cy, r * 0.84, 8, Math.PI / 8);
    for(let i = 0; i < 8; i++){
      const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
      drawDiamond(c, cx + Math.cos(ang) * (r * 0.84), cy + Math.sin(ang) * (r * 0.84), 5, 5, ang);
    }
    drawDemonicSeedGlyph(c, cx, cy, r * 0.74, entropy, rnd);
    drawLeviathanCross(c, cx, cy, r * 0.65, rnd);

  } else if(sigilType === 'bloodrunes'){
    // ELDER FUTHARK BINDRUNE MATRIX (Staves and 45° crossbars)
    const staves = 8;
    c.beginPath();
    for(let i = 0; i < staves; i++){
      const ang = (i / staves) * Math.PI * 2;
      const x1 = cx + Math.cos(ang) * (r * 0.12);
      const y1 = cy + Math.sin(ang) * (r * 0.12);
      const x2 = cx + Math.cos(ang) * (r * 0.88);
      const y2 = cy + Math.sin(ang) * (r * 0.88);
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);

      const charForStave = entropy.glyphChars[i % entropy.glyphChars.length];
      const charCode = charForStave ? charForStave.charCodeAt(0) : 65;
      const branchLevels = 2 + (charCode % 3);

      for(let b = 1; b <= branchLevels; b++){
        const frac = 0.22 + (b * 0.18);
        const bx = x1 + (x2 - x1) * frac;
        const by = y1 + (y2 - y1) * frac;
        const branchLen = 14 + (charCode % 10);
        const branchAng = (charCode % 2 === 0) ? Math.PI / 4 : -Math.PI / 4;
        const bTipX = bx + Math.cos(ang + branchAng) * branchLen;
        const bTipY = by + Math.sin(ang + branchAng) * branchLen;
        c.moveTo(bx, by);
        c.lineTo(bTipX, bTipY);
      }
    }
    c.stroke();

    // Central downward Tiwaz spearhead
    c.beginPath();
    c.moveTo(cx, cy - r * 0.65);
    c.lineTo(cx, cy + r * 0.78);
    c.lineTo(cx - 16, cy + r * 0.52);
    c.moveTo(cx, cy + r * 0.78);
    c.lineTo(cx + 16, cy + r * 0.52);
    c.stroke();

    drawDemonicSeedGlyph(c, cx, cy, r * 0.52, entropy, rnd);

  } else if(sigilType === 'abyssal'){
    // INVERTED ABYSSAL MULTI-STAR
    const pCount = (entropy.rawChars.length % 2 === 0) ? 7 : 9;
    drawOccultInvertedStar(c, cx, cy, r * 0.86, pCount, 0, rnd);
    drawPolygon(c, cx, cy, r * 0.38, pCount, Math.PI / 2);
    drawPolygon(c, cx, cy, r * 0.20, pCount, Math.PI / 2 + Math.PI / pCount);
    drawDemonicSeedGlyph(c, cx, cy, r * 0.58, entropy, rnd);

  } else if(sigilType === 'blackblade'){
    // CROSSED RITUAL BLADES
    const bladeCount = 2 + (entropy.rawChars.length % 3);
    for(let b = 0; b < bladeCount; b++){
      const ang = (b / bladeCount) * Math.PI + (entropy.rawChars[0].charCodeAt(0) % 5) * 0.1;
      const x1 = cx - Math.cos(ang) * (r * 0.82);
      const y1 = cy - Math.sin(ang) * (r * 0.82);
      const x2 = cx + Math.cos(ang) * (r * 0.82);
      const y2 = cy + Math.sin(ang) * (r * 0.82);

      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();

      drawDiamond(c, x1, y1, 8, 16, ang, true);
      drawDiamond(c, x2, y2, 8, 16, ang, true);

      const gAng = ang + Math.PI / 2;
      const gx1 = cx + Math.cos(ang) * (r * 0.5) - Math.cos(gAng) * 16;
      const gy1 = cy + Math.sin(ang) * (r * 0.5) - Math.sin(gAng) * 16;
      const gx2 = cx + Math.cos(ang) * (r * 0.5) + Math.cos(gAng) * 16;
      const gy2 = cy + Math.sin(ang) * (r * 0.5) + Math.sin(gAng) * 16;
      c.beginPath();
      c.moveTo(gx1, gy1); c.lineTo(gx2, gy2);
      c.stroke();
    }

    c.beginPath();
    c.moveTo(cx, cy - r * 0.82);
    c.lineTo(cx, cy + r * 0.88);
    c.lineTo(cx - 14, cy + r * 0.65);
    c.moveTo(cx, cy + r * 0.88);
    c.lineTo(cx + 14, cy + r * 0.65);
    c.stroke();

    drawDemonicSeedGlyph(c, cx, cy, r * 0.52, entropy, rnd);
  }

  // Central Void Diamond
  drawDiamond(c, cx, cy, 8, 12, 0, true);

  c.restore();
}

function draw(phrase, phase = 0){
  const cleanPhrase = phrase || 'deadplug';
  const seed = fnv1a(cleanPhrase + '|' + sigilType);
  const rnd = mulberry32(seed);
  const entropy = extractOccultEntropy(cleanPhrase, rnd);
  const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;

  const bg = inverted ? hsl(hue, sat, light) : '#040205';
  const fg = inverted ? '#040205' : hsl(hue, sat, light);

  // Background fill
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle dark radial vignette for abyssal depth
  if(!inverted){
    const grad = ctx.createRadialGradient(cx, cy, 50, cx, cy, W * 0.6);
    grad.addColorStop(0, 'rgba(80, 0, 10, 0.22)');
    grad.addColorStop(1, 'rgba(2, 1, 3, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Infernal glow settings
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'square';
  ctx.miterLimit = 12;

  if(!inverted && glow > 0){
    ctx.shadowColor = fg;
    ctx.shadowBlur = glow;
  } else {
    ctx.shadowBlur = 0;
  }

  const maxR = W * 0.44;

  // DRAW THE 3 COUNTER-ROTATING RINGS (All made with straight lines)
  if(outerRings){
    drawOuterRing1(ctx, cx, cy, maxR, fg, phase, rnd, entropy);
  }

  drawMiddleRing2(ctx, cx, cy, maxR, fg, phase, rnd, entropy);
  drawInnerRing3(ctx, cx, cy, maxR, fg, phase, rnd, entropy);

  // Reset shadow for text and hash
  ctx.shadowBlur = 0;
  hashEl.textContent = '0x' + seed.toString(16).toUpperCase();
}

function render(){
  cancelAnimationFrame(animId);
  draw(currentPhrase, animationPhase);
  statusEl.textContent = `FORGED // ${sigilType.toUpperCase()} // SEED: ${currentPhrase.toUpperCase()}`;

  if(animating){
    function loop(){
      animationPhase += 0.005;
      draw(currentPhrase, animationPhase);
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);
  }
}

// Download Handlers
function downloadPNG(size){
  const tmp = document.createElement('canvas');
  tmp.width = size; tmp.height = size;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(canvas, 0, 0, size, size);
  tmp.toBlob(b => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'infernal-sigil-' + currentPhrase.replace(/[^a-z0-9]/gi,'') + '-' + size + '.png';
    a.click();
    notify(`EXPORTED PNG ${size}x${size}`);
  });
}

function downloadSVG(){
  const image = canvas.toDataURL('image/png');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><title>Infernal Sigil — ${currentPhrase.replace(/[<>&]/g,'')}</title><image href="${image}" width="100%" height="100%"/></svg>`;
  const blob = new Blob([svg], {type:'image/svg+xml'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'infernal-sigil-' + currentPhrase.replace(/[^a-z0-9]/gi,'') + '.svg';
  a.click();
  notify('EXPORTED VECTOR SVG');
}

// Event Listeners
const typeBtns = document.querySelectorAll('.typebtn');
typeBtns.forEach(b => {
  b.addEventListener('click', () => {
    typeBtns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    sigilType = b.dataset.type;
    render();
  });
});

document.getElementById('phrase').addEventListener('input', (e) => {
  currentPhrase = e.target.value || 'deadplug';
  updateCount();
  render();
});

document.getElementById('gen').addEventListener('click', () => {
  render();
  addToGrimoire();
  notify('SIGIL FORGED FROM VOID');
});

document.getElementById('surprise').addEventListener('click', () => {
  const chosen = SEEDS[Math.floor(Math.random() * SEEDS.length)];
  phraseEl.value = chosen;
  currentPhrase = chosen;
  updateCount();
  render();
  addToGrimoire();
  notify(`SUMMONED SEED: ${chosen}`);
});

document.getElementById('randomize').addEventListener('click', () => {
  // Blood / Void / Occult palettes
  const palettes = [
    { h: 356, s: 100, l: 52 }, // Blood Crimson
    { h: 14, s: 100, l: 50 },  // Sulfur Flame
    { h: 42, s: 100, l: 52 },  // Occult Gold
    { h: 280, s: 95, l: 60 },  // Abyssal Violet
    { h: 0, s: 0, l: 90 },     // Bone White
  ];
  const p = palettes[Math.floor(Math.random() * palettes.length)];
  hue = p.h; sat = p.s; light = p.l;
  document.getElementById('hue').value = hue;
  document.getElementById('sat').value = sat;
  document.getElementById('light').value = light;
  document.getElementById('hueVal').textContent = hue;
  document.getElementById('satVal').textContent = sat;
  document.getElementById('lightVal').textContent = light;
  render();
  notify(`PALETTE SWITCHED (HUE ${hue})`);
});

document.getElementById('reset').addEventListener('click', () => {
  phraseEl.value = '';
  currentPhrase = 'deadplug';
  hue = 356; sat = 100; light = 52; glow = 14;
  updateCount();
  render();
  notify('SIGIL RESET TO PRIME CURSE');
});

document.getElementById('animate').addEventListener('click', () => {
  animating = !animating;
  const btn = document.getElementById('animate');
  btn.setAttribute('aria-pressed', String(animating));
  btn.textContent = animating ? 'Rotating Rings: ON' : 'Rotating Rings: OFF';
  render();
});

document.getElementById('invert').addEventListener('click', () => {
  inverted = !inverted;
  document.getElementById('invert').setAttribute('aria-pressed', String(inverted));
  render();
});

document.getElementById('outerRings').addEventListener('click', () => {
  outerRings = !outerRings;
  document.getElementById('outerRings').setAttribute('aria-pressed', String(outerRings));
  render();
});

document.getElementById('hue').addEventListener('input', (e) => {
  hue = parseInt(e.target.value);
  document.getElementById('hueVal').textContent = hue;
  render();
});

document.getElementById('sat').addEventListener('input', (e) => {
  sat = parseInt(e.target.value);
  document.getElementById('satVal').textContent = sat;
  render();
});

document.getElementById('light').addEventListener('input', (e) => {
  light = parseInt(e.target.value);
  document.getElementById('lightVal').textContent = light;
  render();
});

document.getElementById('glow').addEventListener('input', (e) => {
  glow = parseInt(e.target.value);
  document.getElementById('glowVal').textContent = glow;
  render();
});

document.getElementById('dl512').addEventListener('click', () => downloadPNG(512));
document.getElementById('dl1024').addEventListener('click', () => downloadPNG(1024));
document.getElementById('dl2048').addEventListener('click', () => downloadPNG(2048));
document.getElementById('svg').addEventListener('click', downloadSVG);

document.getElementById('copy').addEventListener('click', async () => {
  try {
    canvas.toBlob(async (b) => {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]);
      notify('IMAGE COPIED TO CLIPBOARD');
    });
  } catch(e) {
    notify('CLIPBOARD PERMISSION DENIED');
  }
});

document.getElementById('copyHash').addEventListener('click', () => {
  navigator.clipboard.writeText(hashEl.textContent);
  notify('HASH COPIED: ' + hashEl.textContent);
});

document.getElementById('share').addEventListener('click', () => {
  const url = new URL(window.location.href);
  url.searchParams.set('seed', currentPhrase);
  url.searchParams.set('type', sigilType);
  navigator.clipboard.writeText(url.href);
  notify('RITUAL LINK COPIED');
});


// ---- Forged Grimoire: a local gallery of forged sigils ----
const GRIMOIRE_KEY = 'infernal-grimoire-v1';
const GRIMOIRE_MAX = 24;

function loadGrimoire(){
  try { const v = JSON.parse(localStorage.getItem(GRIMOIRE_KEY)); return Array.isArray(v) ? v : []; }
  catch(e){ return []; }
}
function saveGrimoire(list){
  while(list.length){
    try { localStorage.setItem(GRIMOIRE_KEY, JSON.stringify(list)); return true; }
    catch(e){ list.pop(); } // storage full: drop the oldest and retry
  }
  try { localStorage.removeItem(GRIMOIRE_KEY); } catch(e){}
  return false;
}

function grimoireKey(e){
  return [e.phrase, e.type, e.hue, e.sat, e.light, e.glow, e.inverted, e.outerRings].join('|');
}

function addToGrimoire(){
  const thumb = document.createElement('canvas');
  thumb.width = thumb.height = 180;
  thumb.getContext('2d').drawImage(canvas, 0, 0, 180, 180);
  const entry = {
    phrase: currentPhrase, type: sigilType,
    hue, sat, light, glow, inverted, outerRings,
    hash: hashEl.textContent,
    img: thumb.toDataURL('image/jpeg', 0.85),
    at: Date.now()
  };
  const key = grimoireKey(entry);
  const list = loadGrimoire().filter(e => grimoireKey(e) !== key);
  list.unshift(entry);
  saveGrimoire(list.slice(0, GRIMOIRE_MAX));
  renderGrimoire();
}

function syncControls(){
  [['hue', hue], ['sat', sat], ['light', light], ['glow', glow]].forEach(([id, v]) => {
    document.getElementById(id).value = v;
    document.getElementById(id + 'Val').textContent = v;
  });
  document.getElementById('invert').setAttribute('aria-pressed', String(inverted));
  document.getElementById('outerRings').setAttribute('aria-pressed', String(outerRings));
  typeBtns.forEach(b => b.classList.toggle('active', b.dataset.type === sigilType));
}

function restoreFromGrimoire(e){
  currentPhrase = e.phrase || 'deadplug';
  phraseEl.value = e.phrase || '';
  sigilType = e.type || 'infernal';
  hue = e.hue; sat = e.sat; light = e.light; glow = e.glow;
  inverted = !!e.inverted; outerRings = e.outerRings !== false;
  updateCount();
  syncControls();
  render();
  canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
  notify(`RESURRECTED: ${currentPhrase.toUpperCase()}`);
}

function renderGrimoire(){
  const list = loadGrimoire();
  grid.replaceChildren();
  document.getElementById('clear').disabled = list.length === 0;
  if(!list.length){
    const empty = document.createElement('p');
    empty.className = 'grimoire-empty';
    empty.textContent = 'The grimoire is empty. Forge or summon a sigil to bind it here.';
    grid.appendChild(empty);
    return;
  }
  list.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'grimoire-item';
    const label = `${e.phrase} — ${e.type}`;
    b.title = `${label} (${e.hash})`;
    b.setAttribute('aria-label', `Restore sigil: ${label}`);
    const img = document.createElement('img');
    img.src = e.img; img.alt = ''; img.loading = 'lazy';
    const cap = document.createElement('span');
    cap.textContent = e.phrase;
    b.append(img, cap);
    b.addEventListener('click', () => restoreFromGrimoire(e));
    grid.appendChild(b);
  });
}

document.getElementById('clear').addEventListener('click', () => {
  if(!loadGrimoire().length) return;
  if(!confirm('Erase every sigil in the grimoire? This cannot be undone.')) return;
  try { localStorage.removeItem(GRIMOIRE_KEY); } catch(e){}
  renderGrimoire();
  notify('GRIMOIRE ERASED');
});

// Init on load
const urlParams = new URLSearchParams(window.location.search);
if(urlParams.get('seed')){
  currentPhrase = urlParams.get('seed');
  phraseEl.value = currentPhrase;
}
if(urlParams.get('type') && ['infernal','goetic','bloodrunes','abyssal','blackblade'].includes(urlParams.get('type'))){
  sigilType = urlParams.get('type');
  typeBtns.forEach(b => b.classList.toggle('active', b.dataset.type === sigilType));
}

updateCount();
render();
renderGrimoire();
