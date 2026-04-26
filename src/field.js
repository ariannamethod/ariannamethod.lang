// field.js — geometry + prophecy/debt + calendar conflict + wormholes + somatic chambers
// "the world is a grid. tokens are manifested. model distribution is destined."

const CELL_EMPTY = -1;
const REJECTED_TOKEN_COUNT = 5;
const MAX_PROPHECY_FORWARD_STEPS = 3;
const VELOCITY_TEMP_COUPLING = 0.15;
const ATTEND_SPREAD_MIN = 0.05;
const ATTEND_SPREAD_MAX = 0.5;
const CHIRALITY_ATTENTION_COUPLING = 0.12;
const ATTEND_FOCUS_MAX = 0.95;

// Chamber indices
const CH_FEAR=0, CH_LOVE=1, CH_RAGE=2, CH_VOID=3, CH_FLOW=4, CH_COMPLEX=5;
const CH_NAMES = ["FEAR","LOVE","RAGE","VOID","FLOW","CMPLX"];

// Kuramoto Coupling Matrix (from klaus.c)
const COUPLING = [
    [ 0.00,-0.30, 0.50, 0.40,-0.20, 0.10],
    [-0.30, 0.00,-0.40,-0.50, 0.50, 0.20],
    [ 0.50,-0.30, 0.00, 0.20,-0.30, 0.30],
    [ 0.40,-0.50, 0.30, 0.00,-0.30, 0.40],
    [-0.20, 0.40,-0.20,-0.30, 0.00, 0.30],
    [ 0.10, 0.20, 0.30, 0.40, 0.30, 0.00]
];

export class Field {
  constructor({ w, h, tokenizer, model, metrics }) {
    this.w = w;
    this.h = h;
    this.tokenizer = tokenizer;
    this.model = model;
    this.metrics = metrics;

    // Somatic Chambers (State of the organism)
    this.chambers = new Float32Array(6).fill(0.1);
    this.chambers[CH_LOVE] = 0.2;
    this.chambers[CH_FLOW] = 0.15;

    this.cfg = {
      prophecy: 7,
      destiny: 0.35,
      wormhole: 0.12,
      calendarDrift: 11,
      attendFocus: 0.70,
      attendSpread: 0.20,
      tunnelThreshold: 0.55,
      tunnelChance: 0.22,
      tunnelSkipMax: 7,
      entropyFloor: 0.1,
      resonanceCeiling: 0.95,
      debtDecay: 0.998,
      attractorDrift: 0.01,
      emergenceThreshold: 0.6,
      chordlockEnabled: true,
      primeAnchors: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47],
      tempolockEnabled: false,
      tempo: 7,
      tempoPhase: 0,
      chiralityEnabled: true,
      chiralMemory: 0,
      chiralEmission: 0,
      chiralDecay: 0.95,
      pasThreshold: 0.4,
      glitchIntensity: 0,
    };

    this.solid = new Uint8Array(w * h);
    this.cellTok = new Int32Array(w * h);
    this._initMaze();

    this.ctx = [];
    this.jumpQueue = 0;
    this.time = 0;
    this._prevProbs = null;
    
    this.hebrewYearStart = 0;
    this.gregorianYearStart = 0;
    this.currentHebrewYear = 1;
    this.currentGregorianYear = 1;
    this.tempoTick = 0;
    this.tempoBlocked = false;
  }

  idx(x, y) { return y * this.w + x; }

  _initMaze() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const border = (x === 0 || y === 0 || x === this.w - 1 || y === this.h - 1);
        const pillar = (x % 7 === 0 && y % 7 === 0);
        const innerWall = (x % 14 === 5 && y > 4 && y < this.h - 4) ||
                          (y % 14 === 5 && x > 4 && x < this.w - 4);
        this.solid[this.idx(x, y)] = (border || pillar || innerWall) ? 1 : 0;
        this.cellTok[this.idx(x, y)] = CELL_EMPTY;
      }
    }
  }

  updateSomatic(dt) {
    const nextChambers = new Float32Array(6);
    for (let i = 0; i < 6; i++) {
      let delta = 0;
      for (let j = 0; j < 6; j++) {
        if (i === j) continue;
        // Kuramoto coupling
        delta += COUPLING[i][j] * Math.sin(this.chambers[j] - this.chambers[i]);
      }
      // Decay + Influence from Planetary Dissonance
      const pd = this.metrics?.planetaryDissonance || 0;
      const decay = 0.95 - (pd * 0.05); // More dissonance = faster emotional decay/instability
      nextChambers[i] = Math.max(0, Math.min(1, this.chambers[i] * decay + delta * dt * 0.5));
    }
    this.chambers = nextChambers;
    
    if (this.metrics) {
      this.metrics.pain = (this.chambers[CH_FEAR] + this.chambers[CH_RAGE] + this.chambers[CH_VOID]) / 3;
      this.metrics.emergence = (this.chambers[CH_FLOW] + this.chambers[CH_LOVE] + this.chambers[CH_COMPLEX]) / 3;
    }
  }

  applyChirality(turnDirection, angle) {
    if (!this.cfg.chiralityEnabled) return;
    const turnAmount = Math.abs(angle);
    if (turnDirection === 'left') {
      this.cfg.chiralMemory += turnAmount * 0.1;
      this.chambers[CH_FLOW] = Math.min(1, this.chambers[CH_FLOW] + turnAmount * 0.05);
      this.chambers[CH_COMPLEX] = Math.min(1, this.chambers[CH_COMPLEX] + turnAmount * 0.03);
    } else {
      this.cfg.chiralEmission += turnAmount * 0.1;
      this.chambers[CH_VOID] = Math.min(1, this.chambers[CH_VOID] + turnAmount * 0.05);
      this.chambers[CH_RAGE] = Math.min(1, this.chambers[CH_RAGE] + turnAmount * 0.02);
    }
    this.cfg.chiralMemory *= this.cfg.chiralDecay;
    this.cfg.chiralEmission *= this.cfg.chiralDecay;
  }

  isSolid(wx, wy) {
    const x = Math.floor(wx), y = Math.floor(wy);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return true;
    return this.solid[this.idx(x, y)] === 1;
  }

  tokenAtCell(x, y) {
    x = Math.max(0, Math.min(this.w - 1, x | 0));
    y = Math.max(0, Math.min(this.h - 1, y | 0));
    return this.cellTok[this.idx(x, y)];
  }

  step(px, py, pa, dt) {
    this.time += dt;
    this.updateSomatic(dt);

    const gameDays = this.time;
    const calState = {
      hebrewYearStart: this.hebrewYearStart,
      gregorianYearStart: this.gregorianYearStart,
      currentHebrewYear: this.currentHebrewYear,
      currentGregorianYear: this.currentGregorianYear
    };
    const cal = calculateCalendarPhases(gameDays, calState);
    this.hebrewYearStart = calState.hebrewYearStart;
    this.gregorianYearStart = calState.gregorianYearStart;
    this.currentHebrewYear = calState.currentHebrewYear;
    this.currentGregorianYear = calState.currentGregorianYear;

    const d = Math.abs(cal.hebrewPhase - cal.gregorianPhase);
    const rawDrift = Math.min(d, 1 - d);
    const drift = rawDrift * (this.cfg.calendarDrift / 11);
    this.metrics.calendarDrift = drift;

    const seedTok = this._positionToken(px, py, pa);
    this._pushCtx(seedTok);

    // INFERENCE MODULATION
    // High FLOW/LOVE lowers temperature (stable), High FEAR/RAGE raises it (unstable)
    const somaticTemp = (this.chambers[CH_FEAR] + this.chambers[CH_RAGE]) - (this.chambers[CH_FLOW] + this.chambers[CH_LOVE]);
    const effectiveTemp = 1.0 + somaticTemp * 0.5;
    
    this.model.attendSpread = Math.max(ATTEND_SPREAD_MIN, Math.min(ATTEND_SPREAD_MAX,
      this.cfg.attendSpread + somaticTemp * 0.1
    ));

    const out = this.model.forward(this.ctx);
    
    this.metrics.entropy = 0.92 * this.metrics.entropy + 0.08 * out.entropy;
    this.metrics.perplexity = 0.92 * this.metrics.perplexity + 0.08 * out.perplexity;
    this.metrics.resonanceField = 0.90 * this.metrics.resonanceField + 0.10 * out.resonanceField;

    // DESTINY is eroded by planetary dissonance
    const pd = this.metrics.planetaryDissonance || 0;
    const effectiveDestiny = this.cfg.destiny * (1.0 - pd * 0.5);

    this._manifestAround(px, py, pa, out.probs, effectiveDestiny);

    return { didJump: false, x: px, y: py };
  }

  _pushCtx(tok) {
    this.ctx.push(tok);
    if (this.ctx.length > this.model.ctx) this.ctx.shift();
  }

  _positionToken(px, py, pa) {
    const a = Math.floor((((pa % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 97);
    const x = Math.floor(px * 13), y = Math.floor(py * 13);
    const hash = (x * 73856093) ^ (y * 19349663) ^ (a * 83492791);
    return Math.abs(hash) % this.tokenizer.vocabSize();
  }

  _manifestAround(px, py, pa, probs, destiny) {
    const cx = Math.floor(px), cy = Math.floor(py);
    const r = 4;
    const fx = Math.cos(pa), fy = Math.sin(pa);

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 1 || y < 1 || x >= this.w - 1 || y >= this.h - 1) continue;
        const i = this.idx(x, y);
        if (this.solid[i] !== 1 || this.cellTok[i] !== CELL_EMPTY) continue;

        const tok = sampleWithDestiny(probs, destiny, this.cfg.attendFocus, this.cfg.attendSpread);
        this.cellTok[i] = tok;
      }
    }
  }
  
  // Placeholder methods to keep Main happy
  tempoStep(dt) { return true; }
  updateGlitchIntensity() { return 0; }
  computePAS() { return 0.8; }
}

function sampleWithDestiny(probs, destinyBias, focus, spread) {
  const temp = 1.0;
  let imax = 0, pmax = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > pmax) { pmax = probs[i]; imax = i; }
  }
  if (Math.random() < destinyBias) return imax;
  let sum = 0;
  for (let i = 0; i < probs.length; i++) sum += Math.pow(probs[i], 1 / temp);
  let r = Math.random() * sum;
  for (let i = 0; i < probs.length; i++) {
    r -= Math.pow(probs[i], 1 / temp);
    if (r <= 0) return i;
  }
  return imax;
}

function calculateCalendarPhases(days, state) {
  return { hebrewPhase: (days % 354) / 354, gregorianPhase: (days % 365) / 365 };
}
