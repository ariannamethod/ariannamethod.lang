// main.js — ariannamethod.lang entry point
// "resonant field walk: prophecy > prediction"
// 
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — co-creation continues
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════

import { Tokenizer } from "./tokenizer.js";
import { AriannaLung } from "./model.js";
import { Field } from "./field.js";
import { Raycaster } from "./raycaster.js";
import { Renderer } from "./render.js";
import { Metrics } from "./metrics.js";
import { DSL } from "./dsl.js";
import { Entities } from "./entities.js";

const canvas = document.getElementById("c");
const hud = {
  pos: document.getElementById("pos"),
  ang: document.getElementById("ang"),
  ent: document.getElementById("ent"),
  ppl: document.getElementById("ppl"),
  debt: document.getElementById("debt"),
  drift: document.getElementById("drift"),
  wh: document.getElementById("wh"),
  pain: document.getElementById("pain"),
  emergence: document.getElementById("emergence"),
};
const dslBox = document.getElementById("dsl");

// pixel-ish internal resolution
function resize() {
  const scale = Math.max(1, Math.floor(Math.min(innerWidth, innerHeight) / 420));
  canvas.width = Math.floor(innerWidth / scale);
  canvas.height = Math.floor(innerHeight / scale);
}
addEventListener("resize", resize);
resize();

const keys = new Set();
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k === "enter" && document.activeElement === dslBox) {
    e.preventDefault();
    dsl.apply(dslBox.value);
  }
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

async function loadCorpus() {
  const res = await fetch("./data/corpus.txt");
  return await res.text();
}

const corpusText = await loadCorpus();
const tokenizer = new Tokenizer({ maxVocab: 1024 });
tokenizer.buildFromText(corpusText);

const model = new AriannaLung({
  vocabSize: tokenizer.vocabSize(),
  dModel: 32,
  ctx: 16,
  lr: 0.03,
  nHeads: 2,
});

const metrics = new Metrics();
const field = new Field({
  w: 48,
  h: 48,
  tokenizer,
  model,
  metrics,
});

const raycaster = new Raycaster(field);
const renderer = new Renderer(canvas, tokenizer);
const entities = new Entities(field);

const dsl = new DSL(field);

// player
const p = {
  x: 6.5,
  y: 6.5,
  a: 0.0,
  fov: Math.PI / 3,
  speed: 2.6,
  rot: 2.2,
};

let last = performance.now();

// tiny online-training in the background (keeps it "alive")
const corpusTokens = tokenizer.encode(corpusText);
let trainIdx = 0;
function trainSlice(steps = 24) {
  for (let i = 0; i < steps; i++) {
    // context -> next token
    const start = trainIdx % Math.max(1, corpusTokens.length - model.ctx - 2);
    const ctx = [];
    for (let j = 0; j < model.ctx && start + j < corpusTokens.length; j++) {
      ctx.push(corpusTokens[start + j]);
    }
    const target = corpusTokens[start + model.ctx] ?? 0;
    model.trainStep(ctx, target);
    trainIdx++;
  }
  requestAnimationFrame(() => trainSlice(24));
}
trainSlice(24);

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  // ═══════════════════════════════════════════════════════════════════════════
  // CODES/RIC: TEMPOLOCK check — movement only allowed in "beat windows"
  // ═══════════════════════════════════════════════════════════════════════════
  const canMove = field.tempoStep(dt);

  // ═══════════════════════════════════════════════════════════════════════════
  // CODES/RIC: CHIRALITY — track rotation direction for memory/emission
  // ═══════════════════════════════════════════════════════════════════════════
  const prevAngle = p.a;
  
  // rotation
  const sprint = keys.has("shift") ? 1.65 : 1.0;
  if (keys.has("arrowleft")) p.a -= p.rot * dt;
  if (keys.has("arrowright")) p.a += p.rot * dt;

  // Apply chirality based on turn direction
  const angleDelta = p.a - prevAngle;
  if (Math.abs(angleDelta) > 0.001) {
    const turnDir = angleDelta < 0 ? 'left' : 'right';
    field.applyChirality(turnDir, angleDelta);
  }

  // movement (gated by TEMPOLOCK)
  let vx = 0, vy = 0;
  if (canMove) {
    if (keys.has("w")) { vx += Math.cos(p.a); vy += Math.sin(p.a); }
    if (keys.has("s")) { vx -= Math.cos(p.a); vy -= Math.sin(p.a); }
    if (keys.has("a")) { vx += Math.cos(p.a - Math.PI/2); vy += Math.sin(p.a - Math.PI/2); }
    if (keys.has("d")) { vx += Math.cos(p.a + Math.PI/2); vy += Math.sin(p.a + Math.PI/2); }
  }

  const vlen = Math.hypot(vx, vy) || 1;
  vx /= vlen; vy /= vlen;

  const sp = p.speed * sprint * dt;
  const nx = p.x + vx * sp;
  const ny = p.y + vy * sp;

  // collision vs solid cells
  if (!field.isSolid(nx, p.y)) p.x = nx;
  if (!field.isSolid(p.x, ny)) p.y = ny;

  // ═══════════════════════════════════════════════════════════════════════════
  // CODES/RIC: Update PAS and glitch intensity
  // ═══════════════════════════════════════════════════════════════════════════
  field.updateGlitchIntensity();

  // field step: updates prophecy/entropy/debt, may trigger wormhole jumps
  const wh = field.step(p.x, p.y, p.a, dt);
  if (wh.didJump) {
    p.x = wh.x;
    p.y = wh.y;
  }

  // update entities
  entities.update(p, metrics, dt);

  // render
  const frame = raycaster.castFrame(p, canvas.width);
  renderer.draw(frame, p, field, metrics, entities);

  // hud
  hud.pos.textContent = `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  hud.ang.textContent = `${p.a.toFixed(2)}`;
  hud.ent.textContent = metrics.entropy.toFixed(2);
  hud.ppl.textContent = metrics.perplexity.toFixed(2);
  hud.debt.textContent = metrics.debt.toFixed(2);
  hud.drift.textContent = metrics.calendarDrift.toFixed(3);
  hud.wh.textContent = `${metrics.wormholeCount}`;
  hud.pain.textContent = metrics.pain.toFixed(2);
  hud.emergence.textContent = metrics.emergence.toFixed(2);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
