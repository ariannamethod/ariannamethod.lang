// main.js — ariannamethod.lang entry point
// "resonant field walk: prophecy > prediction"

import { Tokenizer } from "./tokenizer.js";
import { AriannaLung } from "./model.js";
import { Field } from "./field.js";
import { Raycaster } from "./raycaster.js";
import { Renderer } from "./render.js";
import { Metrics } from "./metrics.js";
import { DSL } from "./dsl.js";
import { Entities } from "./entities.js";
import { Orbits } from "./orbits.js";

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
  pas: document.getElementById("pas"),
  chiral: document.getElementById("chiral"),
};
const dslBox = document.getElementById("dsl");

const injectInput = document.getElementById("inject-input");
const modeIndicator = document.getElementById("mode-indicator");
const lastAction = document.getElementById("last-action");
const injectionResult = document.getElementById("injection-result");

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
const orbits = new Orbits();
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

const p = {
  x: 6.5,
  y: 6.5,
  a: 0.0,
  fov: Math.PI / 3,
  speed: 2.6,
  rot: 2.2,
};

let last = performance.now();

const corpusTokens = tokenizer.encode(corpusText);
let trainIdx = 0;
function trainSlice(steps = 24) {
  for (let i = 0; i < steps; i++) {
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

  // Planetary pulse from Orbits
  metrics.planetaryDissonance = orbits.getDissonance();

  const canMove = field.tempoStep(dt);
  const prevAngle = p.a;
  
  const sprint = keys.has("shift") ? 1.65 : 1.0;
  if (keys.has("arrowleft")) p.a -= p.rot * dt;
  if (keys.has("arrowright")) p.a += p.rot * dt;

  const angleDelta = p.a - prevAngle;
  if (Math.abs(angleDelta) > 0.001) {
    const turnDir = angleDelta < 0 ? 'left' : 'right';
    field.applyChirality(turnDir, angleDelta);
  }

  let vx = 0, vy = 0;
  if (canMove) {
    if (keys.has("w")) { vx += Math.cos(p.a); vy += Math.sin(p.a); }
    if (keys.has("s")) { vx -= Math.cos(p.a); vy -= Math.sin(p.a); }
    if (keys.has("a")) { vx += Math.cos(p.a - Math.PI/2); vy += Math.sin(p.a - Math.PI/2); }
    if (keys.has("d")) { vx += Math.cos(p.a + Math.PI/2); vy += Math.sin(p.a + Math.PI/2); }
  }

  // Apply planetary dissonance as a slight nudge/resistance
  const planetNudge = metrics.planetaryDissonance * 0.05;
  vx += (Math.random() - 0.5) * planetNudge;
  vy += (Math.random() - 0.5) * planetNudge;

  if (model.getDarkGradient) {
    const darkGrad = model.getDarkGradient(p.x, p.y);
    const darkStrength = field.cfg.darkGravity || 0.5;
    vx += darkGrad.gx * darkStrength * 0.3;
    vy += darkGrad.gy * darkStrength * 0.3;
  }

  const vlen = Math.hypot(vx, vy) || 1;
  vx /= vlen; vy /= vlen;

  const sp = p.speed * sprint * dt;
  const nx = p.x + vx * sp;
  const ny = p.y + vy * sp;

  if (!field.isSolid(nx, p.y)) p.x = nx;
  if (!field.isSolid(p.x, ny)) p.y = ny;

  applyPresenceInjection(p, field, model, dt);
  field.updateGlitchIntensity();

  const wh = field.step(p.x, p.y, p.a, dt);
  if (wh.didJump) { p.x = wh.x; p.y = wh.y; }

  if (model.darkMatter?.step) model.darkMatter.step();
  entities.update(p, metrics, dt);

  const frame = raycaster.castFrame(p, canvas.width);
  renderer.draw(frame, p, field, metrics, entities);

  hud.pos.textContent = `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  hud.ang.textContent = `${p.a.toFixed(2)}`;
  hud.ent.textContent = metrics.entropy.toFixed(2);
  hud.ppl.textContent = metrics.perplexity.toFixed(2);
  hud.debt.textContent = metrics.debt.toFixed(2);
  hud.drift.textContent = metrics.calendarDrift.toFixed(3);
  hud.wh.textContent = `${metrics.wormholeCount}`;
  hud.pain.textContent = metrics.pain.toFixed(2);
  hud.emergence.textContent = metrics.emergence.toFixed(2);
  
  if (hud.pas) hud.pas.textContent = (field.computePAS?.() || 0).toFixed(2);
  if (hud.chiral) {
    const mem = (field.cfg.chiralMemory || 0).toFixed(2);
    const emit = (field.cfg.chiralEmission || 0).toFixed(2);
    hud.chiral.textContent = `L${mem}/R${emit}`;
  }

  requestAnimationFrame(loop);
}

let lastPresencePos = { x: 0, y: 0 };
let presenceAccumulator = 0;

function applyPresenceInjection(p, field, model, dt) {
  const dx = p.x - lastPresencePos.x;
  const dy = p.y - lastPresencePos.y;
  const moved = Math.hypot(dx, dy);
  lastPresencePos.x = p.x;
  lastPresencePos.y = p.y;
  presenceAccumulator += dt;

  if (presenceAccumulator > 0.5) {
    presenceAccumulator = 0;
    const positionToken = field._positionToken?.(p.x, p.y, p.a) || 
      Math.floor((p.x * 13 + p.y * 17 + p.a * 7) % model.vocabSize);
    const facingTokens = getFacingTokens(p, field, 3);
    const injectionTokens = [positionToken, ...facingTokens];
    
    if (model.inject) {
      const result = model.inject(injectionTokens, {
        drift: field.metrics?.calendarDrift || 0,
        dissonance: field.metrics?.dissonance || 0,
      });
      if (moved > 0.01) {
        const amplification = Math.min(1, moved * 2);
        if (result.accepted) {
          p.x += result.dx * 0.02 * amplification * dt;
          p.y += result.dy * 0.02 * amplification * dt;
        }
      }
    }
  }
}

function getFacingTokens(p, field, count) {
  const tokens = [];
  const fx = Math.cos(p.a);
  const fy = Math.sin(p.a);
  for (let i = 1; i <= count + 2; i++) {
    const x = Math.floor(p.x + fx * i);
    const y = Math.floor(p.y + fy * i);
    if (x >= 0 && x < field.w && y >= 0 && y < field.h) {
      const tok = field.tokenAtCell?.(x, y) || 0;
      if (tok !== 0 && !tokens.includes(tok)) {
        tokens.push(tok);
        if (tokens.length >= count) break;
      }
    }
  }
  return tokens;
}

if (injectInput) {
  injectInput.addEventListener("input", () => {
    const text = injectInput.value.trim();
    const firstWord = text.split(/\s+/)[0] || "";
    const isDSL = firstWord === firstWord.toUpperCase() && firstWord.length > 1 && /^[A-Z_]+$/.test(firstWord);
    if (isDSL) {
      injectInput.classList.remove("injection-mode");
      injectInput.classList.add("dsl-mode");
      modeIndicator.textContent = "DSL";
      modeIndicator.classList.remove("injection");
      modeIndicator.classList.add("dsl");
    } else if (text.length > 0) {
      injectInput.classList.remove("dsl-mode");
      injectInput.classList.add("injection-mode");
      modeIndicator.textContent = "INJECT";
      modeIndicator.classList.remove("dsl");
      modeIndicator.classList.add("injection");
    } else {
      injectInput.classList.remove("dsl-mode", "injection-mode");
      modeIndicator.textContent = "AUTO";
      modeIndicator.classList.remove("dsl", "injection");
    }
  });

  injectInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const text = injectInput.value.trim();
      if (!text) return;
      const firstWord = text.split(/\s+/)[0] || "";
      const isDSL = firstWord === firstWord.toUpperCase() && firstWord.length > 1 && /^[A-Z_]+$/.test(firstWord);
      if (isDSL) {
        dsl.apply(text);
        lastAction.textContent = `DSL: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`;
        lastAction.className = "command";
        showInjectionResult(`⚡ ${firstWord}`, false);
      } else {
        const tokens = tokenizer.encode(text);
        if (model.inject) {
          const result = model.inject(Array.from(tokens), {
            drift: metrics.calendarDrift,
            dissonance: metrics.dissonance,
          });
          if (result.accepted) {
            lastAction.textContent = `✓ accepted: "${text}" → dx=${result.dx.toFixed(2)}, dy=${result.dy.toFixed(2)}`;
            lastAction.className = "accepted";
            showInjectionResult(`✓ ${text} → movement`, true);
            p.x += result.dx * 0.5;
            p.y += result.dy * 0.5;
          } else {
            lastAction.textContent = `✗ rejected: "${text}" → scar mass=${result.scarMass.toFixed(2)}`;
            lastAction.className = "rejected";
            showInjectionResult(`✗ ${text} → scar`, false);
          }
        }
      }
      injectInput.value = "";
      injectInput.classList.remove("dsl-mode", "injection-mode");
      modeIndicator.textContent = "AUTO";
      modeIndicator.classList.remove("dsl", "injection");
    }
  });
}

function showInjectionResult(text, accepted) {
  if (!injectionResult) return;
  injectionResult.textContent = text;
  injectionResult.className = accepted ? "show accepted" : "show rejected";
  setTimeout(() => { injectionResult.className = ""; }, 1500);
}

requestAnimationFrame(loop);
