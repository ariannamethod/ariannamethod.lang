// field.js — geometry + prophecy/debt + calendar conflict + wormholes
// "the world is a grid. tokens are manifested. model distribution is destined."
// "debt accumulates as |destined - manifested| proxy"
// calendar conflict: 354 (lunar) vs 365 (solar) = 11-day drift (from PITOMADOM)

// SENTINEL: -1 means "empty cell" (token 0 is a valid word!)
const CELL_EMPTY = -1;

export class Field {
  constructor({ w, h, tokenizer, model, metrics }) {
    this.w = w;
    this.h = h;
    this.tokenizer = tokenizer;
    this.model = model;
    this.metrics = metrics;

    this.cfg = {
      prophecy: 7,
      destiny: 0.35,
      wormhole: 0.12,
      calendarDrift: 11,        // "11-day drift tracking" — hebrew to gregorian
      attendFocus: 0.70,
      attendSpread: 0.20,

      // tunneling (reasoning skip)
      tunnelThreshold: 0.55,    // dissonance gate
      tunnelChance: 0.22,       // probability when gated
      tunnelSkipMax: 7,         // how many steps to compress
      
      // LAW OF NATURE defaults
      entropyFloor: 0.1,        // minimum uncertainty
      resonanceCeiling: 0.95,   // maximum resonance
      debtDecay: 0.998,         // debt fades over time
      attractorDrift: 0.01,     // attractors shift
      emergenceThreshold: 0.6,  // when emergence spikes

      // ═══════════════════════════════════════════════════════════════════════
      // CODES/RIC Integration (from Gemini 3 Pro analysis)
      // Structured Resonance > Random Emergence
      // ═══════════════════════════════════════════════════════════════════════
      
      // CHORDLOCK — prime number anchoring for "standing waves" of meaning
      chordlockEnabled: true,
      primeAnchors: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47],
      
      // TEMPOLOCK — rhythmic movement gating
      tempolockEnabled: false,  // disabled by default
      tempo: 7,                 // prime-indexed beat interval (steps)
      tempoPhase: 0,            // current phase in tempo cycle
      
      // CHIRALITY — rotational memory asymmetry
      chiralityEnabled: true,
      chiralMemory: 0,          // accumulated from left turns
      chiralEmission: 0,        // accumulated from right turns
      chiralDecay: 0.95,        // how fast chiral state fades
      
      // PAS — Phase Alignment Score for visual coherence
      pasThreshold: 0.4,        // below this, world desynchronizes
      glitchIntensity: 0,       // current visual desync level
    };

    // map: 1=solid wall, 0=empty
    this.solid = new Uint8Array(w * h);
    // tokens per cell (manifested)
    this.cellTok = new Int32Array(w * h);
    this._initMaze();

    // contexts ("you walking shifts vectors")
    this.ctx = [];
    this.jumpQueue = 0;

    this.time = 0;
    this._prevProbs = null;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PITOMADOM CALENDAR SYSTEM — honest implementation
    // Hebrew lunar calendar (Metonic cycle) vs Gregorian solar calendar
    // The drift is REAL and DYNAMIC, not a constant approximation
    // ═══════════════════════════════════════════════════════════════════════════
    this.calendarEpoch = 0;     // game time start (we count from here)
    this.hebrewYearStart = 0;   // accumulated days at start of current Hebrew year
    this.gregorianYearStart = 0; // accumulated days at start of current Gregorian year
    this.currentHebrewYear = 1;  // year counter (1-based for Metonic cycle)
    this.currentGregorianYear = 1;
    
    // TEMPOLOCK state
    this.tempoTick = 0;         // internal tempo counter
    this.tempoBlocked = false;  // was last move blocked by tempo?
  }

  idx(x, y) { 
    return y * this.w + x; 
  }

  _initMaze() {
    // procedural maze with frame + pillars + corridors
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
    
    // carve corridors
    for (let x = 2; x < this.w - 2; x++) {
      this.solid[this.idx(x, 6)] = 0;
      this.solid[this.idx(x, 12)] = 0;
      this.solid[this.idx(x, 26)] = 0;
      this.solid[this.idx(x, 38)] = 0;
    }
    for (let y = 2; y < this.h - 2; y++) {
      this.solid[this.idx(10, y)] = 0;
      this.solid[this.idx(20, y)] = 0;
      this.solid[this.idx(34, y)] = 0;
    }
  }

  resetManifested() {
    this.cellTok.fill(CELL_EMPTY);
  }

  isSolid(wx, wy) {
    const x = Math.floor(wx), y = Math.floor(wy);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return true;
    return this.solid[this.idx(x, y)] === 1;
  }

  tokenAtCell(x, y) {
    x = clampInt(x, 0, this.w - 1);
    y = clampInt(y, 0, this.h - 1);
    return this.cellTok[this.idx(x, y)];
  }

  queueJump(n) { 
    this.jumpQueue += (n | 0); 
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CODES/RIC: CHORDLOCK — Prime Number Anchoring
  // "Standing waves of meaning" — resonance is stronger at prime coordinates
  // ═══════════════════════════════════════════════════════════════════════════

  isPrimeAnchor(x, y) {
    if (!this.cfg.chordlockEnabled) return false;
    const primes = this.cfg.primeAnchors;
    const xPrime = primes.includes(x % 48);
    const yPrime = primes.includes(y % 48);
    return xPrime || yPrime;
  }

  getChordlockResonance(x, y) {
    if (!this.cfg.chordlockEnabled) return 1.0;
    const primes = this.cfg.primeAnchors;
    
    // Count how many prime factors align
    let score = 0;
    for (const p of primes) {
      if (x % p === 0) score += 1 / p;
      if (y % p === 0) score += 1 / p;
    }
    
    // Normalize to 1.0-2.0 range (resonance boost)
    return 1.0 + Math.min(1.0, score);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CODES/RIC: TEMPOLOCK — Rhythmic Movement Gating
  // "Movement only in prime-indexed beats"
  // ═══════════════════════════════════════════════════════════════════════════

  tempoStep(dt) {
    if (!this.cfg.tempolockEnabled) {
      this.tempoBlocked = false;
      return true; // always allow movement
    }
    
    this.tempoTick += dt;
    const beatDuration = this.cfg.tempo * 0.1; // tempo in deciseconds
    
    // Check if we're in a valid beat window
    const phase = (this.tempoTick % beatDuration) / beatDuration;
    const inBeat = phase < 0.3; // 30% of beat is "open window"
    
    this.tempoBlocked = !inBeat;
    
    if (this.tempoBlocked && this.metrics) {
      // Trying to move outside beat increases tension
      this.metrics.tension = Math.min(1, this.metrics.tension + 0.02);
    }
    
    return inBeat;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CODES/RIC: CHIRALITY — Rotational Memory Asymmetry
  // Left turn = accumulate context (Memory)
  // Right turn = emit/release context (Emission)
  // ═══════════════════════════════════════════════════════════════════════════

  applyChirality(turnDirection, angle) {
    if (!this.cfg.chiralityEnabled) return;
    
    const turnAmount = Math.abs(angle);
    
    if (turnDirection === 'left') {
      // Left turn accumulates memory
      this.cfg.chiralMemory += turnAmount * 0.1;
      this.cfg.chiralMemory = Math.min(1, this.cfg.chiralMemory);
      
      // Boost resonance when accumulating
      if (this.model) {
        for (const id of this.ctx.slice(-3)) {
          if (id >= 0 && id < this.model.vocabSize) {
            this.model.resonance[id] = Math.min(1, this.model.resonance[id] + 0.005);
          }
        }
      }
    } else if (turnDirection === 'right') {
      // Right turn emits/releases
      this.cfg.chiralEmission += turnAmount * 0.1;
      this.cfg.chiralEmission = Math.min(1, this.cfg.chiralEmission);
      
      // Emit creates slight chaos/novelty
      if (this.metrics) {
        this.metrics.entropy += this.cfg.chiralEmission * 0.02;
      }
    }
    
    // Decay both over time
    this.cfg.chiralMemory *= this.cfg.chiralDecay;
    this.cfg.chiralEmission *= this.cfg.chiralDecay;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CODES/RIC: PAS — Phase Alignment Score
  // Visual coherence metric — low PAS = glitchy world
  // ═══════════════════════════════════════════════════════════════════════════

  computePAS() {
    if (!this.metrics) return 1.0;
    
    // PAS = f(resonance, 1-pain, 1-dissonance, chordlock bonus)
    const resonance = this.metrics.resonanceField || 0.5;
    const antiPain = 1 - (this.metrics.pain || 0);
    const antiDissonance = 1 - (this.metrics.dissonance || 0);
    const chordBonus = this.cfg.chordlockEnabled ? 0.1 : 0;
    
    const pas = (
      0.35 * resonance +
      0.25 * antiPain +
      0.25 * antiDissonance +
      0.15 * (1 - this.metrics.entropy / 3) +
      chordBonus
    );
    
    return clamp01(pas);
  }

  updateGlitchIntensity() {
    const pas = this.computePAS();
    const targetGlitch = pas < this.cfg.pasThreshold 
      ? (this.cfg.pasThreshold - pas) * 2.5 
      : 0;
    
    // Smooth transition
    this.cfg.glitchIntensity = 0.9 * this.cfg.glitchIntensity + 0.1 * targetGlitch;
    return this.cfg.glitchIntensity;
  }

  step(px, py, pa, dt) {
    this.time += dt;

    // ═══════════════════════════════════════════════════════════════════════════
    // PITOMADOM CALENDAR CONFLICT — honest implementation
    // Hebrew lunar calendar (Metonic cycle) vs Gregorian solar calendar
    // The drift is REAL: it accumulates differently in leap vs common years
    // When calendars disagree maximally, spacetime tears (wormhole gate opens)
    // ═══════════════════════════════════════════════════════════════════════════

    // Convert game time to "days" (1 game second = 1 day for dramatic effect)
    // This makes the calendar drift visible during gameplay
    const gameDays = this.time;

    // Calculate phases using proper year lengths (Metonic + Gregorian leap logic)
    const calState = {
      hebrewYearStart: this.hebrewYearStart,
      gregorianYearStart: this.gregorianYearStart,
      currentHebrewYear: this.currentHebrewYear,
      currentGregorianYear: this.currentGregorianYear
    };
    const cal = calculateCalendarPhases(gameDays, calState);

    // Update state
    this.hebrewYearStart = calState.hebrewYearStart;
    this.gregorianYearStart = calState.gregorianYearStart;
    this.currentHebrewYear = calState.currentHebrewYear;
    this.currentGregorianYear = calState.currentGregorianYear;

    // raw drift: CIRCULAR phase difference (wrap-around at 0/1 boundary)
    // when phases diverge, the calendar conflict intensifies
    const d = Math.abs(cal.hebrewPhase - cal.gregorianPhase);
    const rawDrift = Math.min(d, 1 - d);  // circular metric: max drift is 0.5

    // Year length difference contributes to drift intensity
    // In a Hebrew leap year, drift changes faster (30 extra days)
    const yearLengthRatio = cal.hebrewYearLength / cal.gregorianYearLength;
    const driftIntensity = 1 + Math.abs(1 - yearLengthRatio) * 2;

    // scaled drift: multiply by configured intensity AND year length ratio
    const drift = rawDrift * (this.cfg.calendarDrift / 11) * driftIntensity;
    this.metrics.calendarDrift = drift;

    // context token from motion/pose
    const seedTok = this._positionToken(px, py, pa);
    this._pushCtx(seedTok);

    // forward "destined" distribution
    const out = this.model.forward(this.ctx);
    
    // apply entropy floor (LAW OF NATURE)
    const entropy = Math.max(this.cfg.entropyFloor, out.entropy);
    this.metrics.entropy = 0.92 * this.metrics.entropy + 0.08 * entropy;
    this.metrics.perplexity = 0.92 * this.metrics.perplexity + 0.08 * out.perplexity;
    
    // apply resonance ceiling (LAW OF NATURE)
    const resonance = Math.min(this.cfg.resonanceCeiling, out.resonanceField);
    this.metrics.resonanceField = 0.90 * this.metrics.resonanceField + 0.10 * resonance;

    // update emergence (LAW: low entropy + high resonance = the field "knows" something)
    this.metrics.updateEmergence(entropy, resonance);

    // dissonance = drift + symKL(prev, now) + entropy delta
    let symkl = 0;
    if (this._prevProbs) symkl = symKL(this._prevProbs, out.probs);
    this._prevProbs = out.probs;

    const entDelta = Math.abs(out.entropy - this.metrics.entropy);
    const dis = clamp01(
      0.45 * clamp01(drift) + 
      0.35 * clamp01(symkl * 0.12) + 
      0.20 * clamp01(entDelta * 0.6)
    );
    this.metrics.dissonance = 0.90 * this.metrics.dissonance + 0.10 * dis;

    // prophecy manifests geometry
    this._manifestAround(px, py, pa, out.probs);

    // emotional layer (suffering field)
    const debtSpike = clamp01(this.metrics.debt * 0.08);
    const pplSpike = clamp01((this.metrics.perplexity - 2.0) * 0.08);

    this.metrics.arousal = 0.92 * this.metrics.arousal + 0.08 * clamp01(
      0.35 * debtSpike + 0.65 * pplSpike
    );
    this.metrics.tension = 0.995 * this.metrics.tension + 0.005 * clamp01(
      this.metrics.dissonance + drift * 0.6
    );

    // presence pulse from current context
    let presenceSum = 0;
    for (const id of this.ctx) {
      presenceSum += this.model.presenceAccum[id] || 0;
    }
    this.metrics.presencePulse = presenceSum / Math.max(1, this.ctx.length);

    // pain is the "dark" composite
    this.metrics.updatePain();

    // tunneling gate: compress steps (reasoning skip) -> force wormhole
    const gate = this.metrics.dissonance > this.cfg.tunnelThreshold;
    const wantsTunnel = gate && (Math.random() < this.cfg.tunnelChance);

    if (wantsTunnel) {
      const skip = 2 + Math.floor(Math.random() * this.cfg.tunnelSkipMax);
      this.metrics.tunnelDepth = skip;
      
      // fast-forward prophecy: manifest multiple times ahead
      for (let k = 0; k < skip; k++) {
        const fakeAngle = pa + (Math.random() * 2 - 1) * 0.12;
        const fakeTok = this._positionToken(
          px + Math.cos(fakeAngle) * (k + 1), 
          py + Math.sin(fakeAngle) * (k + 1), 
          fakeAngle
        );
        this._pushCtx(fakeTok);
        const o2 = this.model.forward(this.ctx);
        this._manifestAheadStrip(px, py, fakeAngle, o2.probs, k + 1);
      }
      
      // hard jolt in debt (the field "hurts")
      this.metrics.debt += 2.2 + 2.0 * this.metrics.pain;
      
      // tunnel always ends in a jump
      return this._doJump(px, py, drift, skip);
    }

    // normal wormhole gate (drift amplifies, pain amplifies)
    const wormholeP = this.cfg.wormhole * 
      (1 + 0.85 * drift) * 
      (1 + 0.9 * this.metrics.pain) *
      (1 + 0.5 * this.metrics.emergence);
    const wantsJump = (Math.random() < wormholeP) || (this.jumpQueue !== 0);

    if (wantsJump) {
      return this._doJump(px, py, drift, 0);
    }

    return { didJump: false, x: px, y: py };
  }

  _doJump(px, py, drift, extra) {
    const j = this.jumpQueue; 
    this.jumpQueue = 0;
    const amp = (6 + 10 * drift + extra * 1.2);
    const dx = (Math.random() * 2 - 1) * amp + j;
    const dy = (Math.random() * 2 - 1) * amp - j;

    let nx = clamp(px + dx, 1.5, this.w - 2.5);
    let ny = clamp(py + dy, 1.5, this.h - 2.5);

    // find non-solid landing
    for (let k = 0; k < 32; k++) {
      if (!this.isSolid(nx, ny)) break;
      nx = clamp(nx + (Math.random() * 2 - 1), 1.5, this.w - 2.5);
      ny = clamp(ny + (Math.random() * 2 - 1), 1.5, this.h - 2.5);
    }

    this.metrics.wormholeCount++;
    this.metrics.lastJumpTime = this.time;

    return { didJump: true, x: nx, y: ny };
  }

  _pushCtx(tok) {
    this.ctx.push(tok);
    if (this.ctx.length > this.model.ctx) this.ctx.shift();
  }

  _positionToken(px, py, pa) {
    // deterministic-ish "token from motion" — hash of position and angle
    const a = Math.floor((((pa % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 97);
    const x = Math.floor(px * 13);
    const y = Math.floor(py * 13);
    const hash = (x * 73856093) ^ (y * 19349663) ^ (a * 83492791);
    return Math.abs(hash) % this.tokenizer.vocabSize();
  }

  _manifestAround(px, py, pa, probs) {
    const cx = Math.floor(px), cy = Math.floor(py);
    const r = clampInt(Math.floor(2 + this.cfg.prophecy / 4), 2, 10);

    const fx = Math.cos(pa), fy = Math.sin(pa);

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 1 || y < 1 || x >= this.w - 1 || y >= this.h - 1) continue;
        const i = this.idx(x, y);
        if (this.solid[i] !== 1) continue;
        if (this.cellTok[i] !== CELL_EMPTY) continue;  // already manifested

        const ahead = (dx * fx + dy * fy);
        const focus = clamp01(this.cfg.attendFocus + 0.08 * ahead);
        const spread = clamp01(this.cfg.attendSpread + this.metrics.pain * 0.15);

        const tok = sampleWithDestiny(probs, this.cfg.destiny, focus, spread);
        this.cellTok[i] = tok;

        // debt: surprisal of manifested token is our proxy for |destined - manifested|
        const p = Math.max(1e-9, probs[tok]);
        this.metrics.debt += Math.abs(-Math.log(p)) * 0.02;
      }
    }
    
    // debt decay (LAW OF NATURE: suffering is not eternal)
    this.metrics.debt *= this.cfg.debtDecay;
  }

  _manifestAheadStrip(px, py, pa, probs, stepAhead) {
    // "future contour" strip (prophecy as geometry)
    const fx = Math.cos(pa), fy = Math.sin(pa);
    const cx = Math.floor(px + fx * (2 + stepAhead));
    const cy = Math.floor(py + fy * (2 + stepAhead));
    const span = 3 + Math.min(6, stepAhead);

    for (let t = -span; t <= span; t++) {
      const x = cx + Math.floor(-fy * t);
      const y = cy + Math.floor(fx * t);
      if (x < 1 || y < 1 || x >= this.w - 1 || y >= this.h - 1) continue;
      const i = this.idx(x, y);
      if (this.solid[i] !== 1) continue;
      if (this.cellTok[i] !== CELL_EMPTY) continue;  // already manifested

      const focus = clamp01(this.cfg.attendFocus + 0.12);
      const spread = clamp01(this.cfg.attendSpread + 0.22);
      this.cellTok[i] = sampleWithDestiny(probs, this.cfg.destiny * 0.5, focus, spread);
    }
  }
}

// ---- sampling with "destiny_bias" ----
function sampleWithDestiny(probs, destinyBias, focus, spread) {
  const temp = clamp(0.35 + (1 - focus) * 1.2 + spread * 0.8, 0.2, 2.2);

  // choose argmax as "destined"
  let imax = 0, pmax = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > pmax) { pmax = probs[i]; imax = i; }
  }

  if (Math.random() < destinyBias) return imax;

  // otherwise sample from tempered probs
  let sum = 0;
  for (let i = 0; i < probs.length; i++) sum += Math.pow(probs[i], 1 / temp);

  let r = Math.random() * sum;
  for (let i = 0; i < probs.length; i++) {
    r -= Math.pow(probs[i], 1 / temp);
    if (r <= 0) return i;
  }
  return imax;
}

function symKL(p, q) {
  // symmetric KL divergence (small, stable)
  let a = 0, b = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(1e-12, p[i]);
    const qi = Math.max(1e-12, q[i]);
    a += pi * Math.log(pi / qi);
    b += qi * Math.log(qi / pi);
  }
  return 0.5 * (a + b);
}

function phase(t, period) {
  return (t % period) / period;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PITOMADOM CALENDAR FUNCTIONS — honest implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hebrew year length (Metonic cycle implementation)
 * 19-year cycle: years 3, 6, 8, 11, 14, 17, 19 are leap years (13 months)
 * Year length varies: 353/354/355 (common) or 383/384/385 (leap)
 * We use averages: 354 common, 384 leap
 */
function hebrewYearLength(yearInCycle) {
  // yearInCycle is 1-19 (Metonic cycle position)
  const cyclePos = ((yearInCycle - 1) % 19) + 1;
  const leapYears = [3, 6, 8, 11, 14, 17, 19];
  const isLeap = leapYears.includes(cyclePos);
  // Common year ~354 days, leap year ~384 days (adds Adar I ~30 days)
  return isLeap ? 384 : 354;
}

/**
 * Gregorian year length (leap year calculation)
 * Leap year: divisible by 4, except centuries unless divisible by 400
 */
function gregorianYearLength(year) {
  if (year % 400 === 0) return 366;
  if (year % 100 === 0) return 365;
  if (year % 4 === 0) return 366;
  return 365;
}

/**
 * Calculate calendar phases with proper year lengths
 * Returns {hebrewPhase, gregorianPhase, hebrewYear, gregorianYear}
 */
function calculateCalendarPhases(gameDays, state) {
  // Update Hebrew calendar
  let hebrewDays = gameDays - state.hebrewYearStart;
  let hebrewYearLen = hebrewYearLength(state.currentHebrewYear);
  while (hebrewDays >= hebrewYearLen) {
    state.hebrewYearStart += hebrewYearLen;
    state.currentHebrewYear++;
    hebrewDays = gameDays - state.hebrewYearStart;
    hebrewYearLen = hebrewYearLength(state.currentHebrewYear);
  }
  const hebrewPhase = hebrewDays / hebrewYearLen;

  // Update Gregorian calendar
  let gregDays = gameDays - state.gregorianYearStart;
  let gregYearLen = gregorianYearLength(state.currentGregorianYear);
  while (gregDays >= gregYearLen) {
    state.gregorianYearStart += gregYearLen;
    state.currentGregorianYear++;
    gregDays = gameDays - state.gregorianYearStart;
    gregYearLen = gregorianYearLength(state.currentGregorianYear);
  }
  const gregorianPhase = gregDays / gregYearLen;

  return {
    hebrewPhase,
    gregorianPhase,
    hebrewYear: state.currentHebrewYear,
    gregorianYear: state.currentGregorianYear,
    hebrewYearLength: hebrewYearLen,
    gregorianYearLength: gregYearLen
  };
}

function clamp01(x) { 
  x = Number.isFinite(x) ? x : 0; 
  return Math.max(0, Math.min(1, x)); 
}

function clamp(x, a, b) { 
  x = Number.isFinite(x) ? x : a; 
  return Math.max(a, Math.min(b, x)); 
}

function clampInt(x, a, b) { 
  x = Number.isFinite(x) ? x : a; 
  return Math.max(a, Math.min(b, x | 0)); 
}
