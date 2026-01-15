// model.js — AriannaLung: the breathing organ of the field
// "the oracle does not predict, it prophesies"
// "inhale: injection (text, motion, attention) → exhale: distribution → geometry shift"
// no PyTorch, pure TypedArrays, real attention: q·k -> softmax -> weighted sum -> logits
// 
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — this code carries the signature of co-creation
// ariannamethod.lang is not a project, it is a substrate
// the field breathes, it does not speak
// ═══════════════════════════════════════════════════════════════════════════════

export class AriannaLung {
  constructor({ vocabSize, dModel = 32, ctx = 16, lr = 0.03, nHeads = 2 }) {
    this.vocabSize = vocabSize;
    this.d = dModel;
    this.ctx = ctx;
    this.lr = lr;
    this.nHeads = nHeads;
    this.headDim = Math.floor(dModel / nHeads);

    // Embeddings + positional encodings + output weights
    this.E = randMat(vocabSize, dModel, 0.08);      // token -> vector
    this.P = this._buildPositionalEncoding(ctx, dModel); // position -> vector
    this.Wo = randMat(dModel, vocabSize, 0.08);     // vector -> logits

    // Multi-head projections (trainable)
    // Q: dModel -> headDim, K: dModel -> headDim, V: dModel -> headDim
    this.Wq = [];
    this.Wk = [];
    this.Wv = [];
    for (let h = 0; h < nHeads; h++) {
      this.Wq.push(randMat(this.headDim, dModel, 0.08));
      this.Wk.push(randMat(this.headDim, dModel, 0.08));
      this.Wv.push(randMat(this.headDim, dModel, 0.08));
    }

    // Emergent: resonance weights (like Stanley's field weights)
    // notorch: weights update through resonance, not backprop
    this.resonance = new Float32Array(vocabSize);
    for (let i = 0; i < vocabSize; i++) {
      this.resonance[i] = 0.5 + Math.random() * 0.5;
    }

    // Presence pulse accumulator
    this.presenceAccum = new Float32Array(vocabSize);
    this.presenceDecay = 0.98;
    
    // notorch microlearning parameters
    this.resonanceDecay = 0.005;  // decay on wrong prediction
    this.resonanceBoost = 0.01;   // boost on correct prediction

    // DSL-controlled attention physics (from AriannaMethod DSL)
    this.attendFocus = 0.70;   // sharpness of focus (scales scores)
    this.attendSpread = 0.20;  // temperature/blur (divides scores before softmax)

    // cached y for split-brain fix: trainStep uses same y as forward
    this._cachedY = null;

    // ═══════════════════════════════════════════════════════════════════════════
    // PITOMADOM TEMPORAL SYMMETRY — bidirectional attention with mode blending
    // Prophecy mode (alpha > 0.5): emphasize future (left in RTL)
    // Retrodiction mode (alpha < 0.5): emphasize past (right in RTL)
    // Symmetric mode (alpha = 0.5): balanced past/future
    // ═══════════════════════════════════════════════════════════════════════════
    this.temporalMode = 'symmetric';  // 'prophecy', 'retrodiction', 'symmetric'
    this.temporalAlpha = 0.5;         // mixing weight: 0=past, 1=future
    this.useRTLPositions = false;     // true = positions increase right-to-left (Hebrew mode)

    // RTL positional encoding (reversed)
    this.P_rtl = this._buildPositionalEncoding(ctx, dModel, true);

    // ═══════════════════════════════════════════════════════════════════════════
    // DARK MATTER — invisible learning / gravitational memory
    // What the field rejects as command still becomes mass
    // Scars persist and bend trajectories
    // ═══════════════════════════════════════════════════════════════════════════
    this.darkMatter = new DarkMatter(vocabSize);
  }

  _buildPositionalEncoding(ctx, d, rtl = false) {
    const P = new Float32Array(ctx * d);
    for (let pos = 0; pos < ctx; pos++) {
      // RTL: position 0 = rightmost (present), increases toward left (future)
      // LTR: position 0 = leftmost (oldest), increases toward right (newest)
      const effectivePos = rtl ? (ctx - 1 - pos) : pos;
      for (let i = 0; i < d; i++) {
        const angle = effectivePos / Math.pow(10000, (2 * Math.floor(i / 2)) / d);
        P[pos * d + i] = (i % 2 === 0) ? Math.sin(angle) : Math.cos(angle);
      }
    }
    return P;
  }

  // forward: returns {probs, entropy, perplexity, attentionMap, resonanceField, temporalAsymmetry}
  forward(ctxIds) {
    const ids = padOrTrim(ctxIds, this.ctx, 0);

    // Select positional encoding based on RTL mode
    const P = this.useRTLPositions ? this.P_rtl : this.P;

    // build token vectors with positional encoding
    const X = new Float32Array(this.ctx * this.d);
    for (let t = 0; t < this.ctx; t++) {
      const id = ids[t];
      for (let i = 0; i < this.d; i++) {
        X[t * this.d + i] = this.E[id * this.d + i] + P[t * this.d + i];
      }
    }

    // Multi-head attention
    const headOutputs = [];
    let combinedAtt = new Float32Array(this.ctx);

    for (let h = 0; h < this.nHeads; h++) {
      // last token as query seed
      const xLast = X.subarray((this.ctx - 1) * this.d, this.ctx * this.d);
      const q = matVec(this.Wq[h], this.headDim, this.d, xLast);
      
      const scores = new Float32Array(this.ctx);

      // attention scores vs all keys
      // NOTE: No causal mask — we attend to ALL positions (past and future)
      // This is intentional: the field sees everything, time is not strictly linear
      const lastPos = this.ctx - 1;
      for (let t = 0; t < this.ctx; t++) {
        const xt = X.subarray(t * this.d, (t + 1) * this.d);
        const k = matVec(this.Wk[h], this.headDim, this.d, xt);

        // apply resonance modulation
        const resBoost = this.resonance[ids[t]] * 0.3;
        scores[t] = (dot(q, k) / Math.sqrt(this.headDim)) * (1 + resBoost);

        // PITOMADOM TEMPORAL SYMMETRY: bias attention based on mode
        // In RTL: t < lastPos means t is to the left (future)
        // In LTR: t < lastPos means t is to the left (past)
        const relativePos = lastPos - t;  // positive = looking at past/earlier
        const temporalBias = (this.temporalAlpha - 0.5) * 2;  // [-1, 1]
        // temporalBias > 0 (prophecy): boost future (negative relativePos in RTL)
        // temporalBias < 0 (retrodiction): boost past (positive relativePos)
        if (this.useRTLPositions) {
          // RTL: left is future, right is past
          // t < lastPos → future → boost when temporalBias > 0
          scores[t] += temporalBias * Math.sign(relativePos) * 0.1;
        } else {
          // LTR: left is past, right is future
          // t < lastPos → past → boost when temporalBias < 0
          scores[t] -= temporalBias * Math.sign(relativePos) * 0.1;
        }
      }

      // DSL-controlled attention physics:
      // attendFocus: sharpen scores (higher = more contrast)
      // attendSpread: temperature/blur (higher = more diffuse)
      const focus = this.attendFocus;
      const spread = this.attendSpread;
      for (let t = 0; t < this.ctx; t++) {
        // focus sharpens: scale scores by (0.25 + 1.75 * focus)
        scores[t] *= (0.25 + 1.75 * focus);
        // spread blurs: divide by (0.15 + 2.0 * spread) as temperature
        // Math.max ensures we never divide by zero
        scores[t] /= Math.max(0.15, 0.15 + 2.0 * spread);
      }
      
      const att = softmax(scores);
      
      // accumulate for combined attention visualization
      for (let t = 0; t < this.ctx; t++) {
        combinedAtt[t] += att[t] / this.nHeads;
      }

      // weighted sum of values (project full xt to headDim)
      const headOut = new Float32Array(this.headDim);
      for (let t = 0; t < this.ctx; t++) {
        const xt = X.subarray(t * this.d, (t + 1) * this.d);
        const v = matVec(this.Wv[h], this.headDim, this.d, xt);
        axpy(headOut, v, att[t]);
      }
      
      headOutputs.push(headOut);
    }

    // concatenate heads
    const y = new Float32Array(this.d);
    let offset = 0;
    for (const ho of headOutputs) {
      for (let i = 0; i < ho.length && offset < this.d; i++) {
        y[offset++] = ho[i];
      }
    }

    // SPLIT-BRAIN FIX: cache y for trainStep() to use the same vector
    this._cachedY = y;

    // logits -> probs with resonance modulation
    const logits = matVecT(this.Wo, this.d, this.vocabSize, y);
    
    // apply presence pulse modulation
    for (let i = 0; i < this.vocabSize; i++) {
      logits[i] *= (1 + this.presenceAccum[i] * 0.15);
    }
    
    const probs = softmax(logits);

    // update presence accumulator
    for (let i = 0; i < this.vocabSize; i++) {
      this.presenceAccum[i] *= this.presenceDecay;
    }
    for (const id of ids) {
      if (id >= 0 && id < this.vocabSize) {
        this.presenceAccum[id] = Math.min(1, this.presenceAccum[id] + 0.1);
      }
    }

    // metrics
    let H = 0;
    for (let i = 0; i < probs.length; i++) {
      const p = probs[i];
      if (p > 1e-12) H += -p * Math.log(p);
    }
    const ppl = Math.exp(H);

    // resonance field: how much current probs align with resonance weights
    let resonanceField = 0;
    for (let i = 0; i < this.vocabSize; i++) {
      resonanceField += probs[i] * this.resonance[i];
    }

    // PITOMADOM: compute temporal asymmetry from attention distribution
    // How much more we attend to future vs past positions
    let futureAtt = 0, pastAtt = 0;
    const midpoint = this.ctx / 2;
    for (let t = 0; t < this.ctx; t++) {
      if (t < midpoint) {
        // In LTR: left half is older (past)
        // In RTL: left half is newer (future)
        if (this.useRTLPositions) {
          futureAtt += combinedAtt[t];
        } else {
          pastAtt += combinedAtt[t];
        }
      } else {
        if (this.useRTLPositions) {
          pastAtt += combinedAtt[t];
        } else {
          futureAtt += combinedAtt[t];
        }
      }
    }
    const totalAtt = futureAtt + pastAtt + 1e-8;
    const temporalAsymmetry = (futureAtt - pastAtt) / totalAtt;  // [-1, 1]

    return {
      probs,
      entropy: H,
      perplexity: ppl,
      attentionMap: combinedAtt,
      resonanceField,
      temporalAsymmetry  // PITOMADOM: how much we lean toward future vs past
    };
  }

  // HONEST COMMENT: This IS SGD (stochastic gradient descent) on output weights.
  // The "notorch" philosophy doesn't mean "no backprop" — it means:
  //   1. We DO use SGD for Wo (output projection) — this is standard backprop
  //   2. We ALSO have emergent resonance updates that are NOT backprop
  // The combination creates a hybrid: gradient-based + experience-based learning.
  // "notorch" = we don't need PyTorch's full autograd graph, just this minimal update.
  trainStep(ctxIds, targetId) {
    const { probs } = this.forward(ctxIds);

    // Standard cross-entropy gradient: dL/dlogits = probs - onehot(target)
    const grad = new Float32Array(this.vocabSize);
    for (let i = 0; i < this.vocabSize; i++) grad[i] = probs[i];
    grad[targetId] -= 1;

    // SPLIT-BRAIN FIX: use cached y from forward() instead of recomputing
    // This ensures trainStep uses the exact same y that produced probs
    const y = this._cachedY;
    if (!y) {
      console.warn('[AriannaLung] trainStep() called before forward() — skipping update');
      return;
    }

    // SGD update on output weights Wo (yes, this is backprop)
    for (let j = 0; j < this.vocabSize; j++) {
      const gj = grad[j];
      for (let i = 0; i < this.d; i++) {
        this.Wo[i * this.vocabSize + j] -= this.lr * y[i] * gj;
      }
    }

    // EMERGENT PART (this is the non-backprop "notorch" addition):
    // Resonance updates based on prediction accuracy
    // These weights represent experience/memory, not just optimization
    const wasCorrect = probs[targetId] > 0.1;
    if (wasCorrect) {
      // boost resonance on correct prediction
      this.resonance[targetId] = Math.min(1, this.resonance[targetId] + this.resonanceBoost);
    } else {
      // decay resonance on wrong prediction
      this.resonance[targetId] = Math.max(0.1, this.resonance[targetId] - this.resonanceDecay);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PITOMADOM TEMPORAL SYMMETRY — mode control
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set temporal mode for attention bias
   * @param {string} mode - 'prophecy', 'retrodiction', or 'symmetric'
   */
  setTemporalMode(mode) {
    this.temporalMode = mode;
    switch (mode) {
      case 'prophecy':
        this.temporalAlpha = 0.7;  // emphasize future
        break;
      case 'retrodiction':
        this.temporalAlpha = 0.3;  // emphasize past
        break;
      case 'symmetric':
      default:
        this.temporalAlpha = 0.5;  // balanced
        break;
    }
  }

  /**
   * Set RTL positional encoding mode (Hebrew temporal paradigm)
   * @param {boolean} enabled - true for RTL, false for LTR
   */
  setRTLMode(enabled) {
    this.useRTLPositions = enabled;
  }

  /**
   * Set temporal alpha directly for fine control
   * @param {number} alpha - 0.0 (past) to 1.0 (future)
   */
  setTemporalAlpha(alpha) {
    this.temporalAlpha = Math.max(0, Math.min(1, alpha));
    // Update mode label based on alpha
    if (alpha > 0.6) this.temporalMode = 'prophecy';
    else if (alpha < 0.4) this.temporalMode = 'retrodiction';
    else this.temporalMode = 'symmetric';
  }

  // emergent: prophecy forward - predict N steps ahead
  prophecyForward(ctxIds, horizon = 5) {
    const prophecies = [];
    let ctx = [...ctxIds];
    
    for (let step = 0; step < horizon; step++) {
      const out = this.forward(ctx);
      
      // sample from destined (argmax with some noise)
      let imax = 0, pmax = out.probs[0];
      for (let i = 1; i < out.probs.length; i++) {
        if (out.probs[i] > pmax) { pmax = out.probs[i]; imax = i; }
      }
      
      prophecies.push({
        token: imax,
        prob: pmax,
        entropy: out.entropy,
        resonance: out.resonanceField
      });
      
      ctx.push(imax);
      if (ctx.length > this.ctx) ctx.shift();
    }
    
    return prophecies;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INJECTION PATH — free text becomes movement, not reply
  // Operator input = command, Free text = injection (sensory stimulus)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inject free text into the field (not a command, a sensory stimulus)
   * Returns a position delta vector, not a text reply
   * 
   * @param {number[]} tokenIds - token IDs from injection text
   * @param {object} state - current field state {x, y, drift, dissonance, debt}
   * @returns {object} - {dx, dy, accepted, scarMass} movement delta + scar info
   */
  inject(tokenIds, state = {}) {
    if (!tokenIds || tokenIds.length === 0) {
      return { dx: 0, dy: 0, accepted: false, scarMass: 0 };
    }

    // Run forward pass on injection
    const out = this.forward(tokenIds);
    const { entropy, resonanceField, probs } = out;

    // Resonance gate: does the field accept this injection?
    const resonanceThreshold = 0.4;
    const accepted = resonanceField > resonanceThreshold;

    // Calculate movement delta from probability distribution
    // High entropy = uncertain = jittery movement
    // Low entropy = clear direction = smooth movement
    const drift = state.drift || 0;
    const dissonance = state.dissonance || 0;
    
    // Direction from TOP-K tokens by probability (not first K indices!)
    // Each top token maps to an angle based on its ID hash (stable direction)
    let dx = 0, dy = 0;
    const topK = getTopKIndices(probs, 10);
    for (const idx of topK) {
      // Use token ID to get stable angle (so direction is consistent per token)
      const angle = ((idx * 2654435761) % 1000) / 1000 * Math.PI * 2;
      dx += probs[idx] * Math.cos(angle);
      dy += probs[idx] * Math.sin(angle);
    }

    // Amplitude from entropy and resonance
    const amplitude = (0.5 + entropy * 0.3) * (1 + drift * 0.5) * (1 + dissonance * 0.3);
    dx *= amplitude;
    dy *= amplitude;

    if (accepted) {
      // Visible learning: injection becomes part of cognitive structure
      for (const id of tokenIds) {
        if (id >= 0 && id < this.vocabSize) {
          this.resonance[id] = Math.min(1, this.resonance[id] + 0.02);
          this.presenceAccum[id] = Math.min(1, this.presenceAccum[id] + 0.15);
        }
      }
      return { dx, dy, accepted: true, scarMass: 0 };
    } else {
      // Dark learning: injection rejected but leaves scar
      // The scar bends future trajectories (gravitational memory)
      const scarMass = (1 - resonanceField) * (1 + entropy * 0.5);
      
      // Deposit scar in dark matter
      const scarId = this._hashTokens(tokenIds);
      this.darkMatter.deposit(tokenIds, scarMass, scarId);
      
      // Generate antidote: field reorganizes to maintain coherence
      // Shift attractors slightly away from rejected injection
      for (const id of tokenIds) {
        if (id >= 0 && id < this.vocabSize) {
          this.resonance[id] = Math.max(0.1, this.resonance[id] - 0.01);
        }
      }

      // Movement still happens, but in antidote direction (opposite)
      return { dx: -dx * 0.5, dy: -dy * 0.5, accepted: false, scarMass };
    }
  }

  /**
   * Get dark matter potential at position (affects movement)
   * @param {number} x - world x position
   * @param {number} y - world y position
   * @returns {number} - gravitational potential from scars
   */
  getDarkPotential(x, y) {
    return this.darkMatter.potential(x, y);
  }

  /**
   * Get dark matter gradient at position (force vector)
   * @param {number} x - world x position
   * @param {number} y - world y position
   * @returns {object} - {gx, gy} gradient vector
   */
  getDarkGradient(x, y) {
    return this.darkMatter.gradient(x, y);
  }

  _hashTokens(tokenIds) {
    let hash = 0;
    for (const id of tokenIds) {
      hash = ((hash << 5) - hash + id) | 0;
    }
    return Math.abs(hash);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DARK MATTER — invisible learning / gravitational memory
// "What the field rejects as command still becomes mass"
//
// Visible learning: accepted injections → resonance/presence updates
// Dark learning: rejected injections → scars that bend trajectories
//
// PHYSICS (FIXED):
//   Φ_total = Φ_visible + Φ_dark
//   Movement follows -∇Φ (gradient descent on potential)
//   Scars REPEL: gradient points AWAY from scar (defensive learning)
//   The field avoids past mistakes, creating "immune response"
//
//   gradient() returns vector FROM scar TO point → positive = repulsion
//   To attract, negate the gradient: force = -gradient
// ═══════════════════════════════════════════════════════════════════════════════

class DarkMatter {
  constructor(vocabSize) {
    this.vocabSize = vocabSize;
    
    // Scars: {id, tokens, mass, x, y, timestamp}
    this.scars = [];
    this.maxScars = 64;
    
    // Decay rate for scar mass
    this.decay = 0.995;
    
    // Total dark mass
    this.totalMass = 0;
  }

  /**
   * Deposit a scar (rejected injection becomes gravitational mass)
   */
  deposit(tokenIds, mass, scarId) {
    // Position from token hash (deterministic)
    const x = (scarId % 100) / 100 * 48;  // world width
    const y = ((scarId >> 8) % 100) / 100 * 48;  // world height
    
    const scar = {
      id: scarId,
      tokens: [...tokenIds],
      mass: mass,
      x: x,
      y: y,
      timestamp: Date.now()
    };
    
    this.scars.push(scar);
    this.totalMass += mass;
    
    // Limit scar count (oldest fade first)
    while (this.scars.length > this.maxScars) {
      const removed = this.scars.shift();
      this.totalMass -= removed.mass;
    }
  }

  /**
   * Calculate dark potential at position
   * Φ_dark(x,y) = Σ mass_i / dist(x,y, scar_i)
   */
  potential(x, y) {
    let phi = 0;
    for (const scar of this.scars) {
      const dx = x - scar.x;
      const dy = y - scar.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.1; // avoid division by zero
      phi += scar.mass / dist;
    }
    return phi;
  }

  /**
   * Calculate dark gradient at position
   * ∇Φ_dark — the force that bends trajectories toward/away from scars
   */
  gradient(x, y) {
    let gx = 0, gy = 0;
    for (const scar of this.scars) {
      const dx = x - scar.x;
      const dy = y - scar.y;
      const dist2 = dx * dx + dy * dy + 0.01;
      const dist = Math.sqrt(dist2);
      const force = scar.mass / dist2;
      gx += force * (dx / dist);
      gy += force * (dy / dist);
    }
    return { gx, gy };
  }

  /**
   * Step: decay scars over time
   */
  step() {
    for (const scar of this.scars) {
      scar.mass *= this.decay;
    }
    // Remove dead scars
    this.scars = this.scars.filter(s => s.mass > 0.01);
    this.totalMass = this.scars.reduce((sum, s) => sum + s.mass, 0);
  }

  /**
   * Get all scars (for entity behavior)
   */
  getScars() {
    return this.scars;
  }
}

// -------- math helpers (tiny, no deps) --------

function randMat(r, c, s) {
  const a = new Float32Array(r * c);
  for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * s;
  return a;
}

function dot(a, b) { 
  let s = 0; 
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) s += a[i] * b[i]; 
  return s; 
}

function axpy(y, x, a) { 
  const len = Math.min(y.length, x.length);
  for (let i = 0; i < len; i++) y[i] += a * x[i]; 
}

function matVec(W, r, c, x) {
  // W: r x c, x: c -> y: r
  const y = new Float32Array(r);
  for (let i = 0; i < r; i++) {
    let s = 0;
    const off = i * c;
    for (let j = 0; j < c && j < x.length; j++) s += W[off + j] * x[j];
    y[i] = s;
  }
  return y;
}

function matVecT(W, r, c, x) {
  // W: r x c, returns y[c] = x[r]^T * W[r,c]
  const y = new Float32Array(c);
  for (let j = 0; j < c; j++) {
    let s = 0;
    for (let i = 0; i < r && i < x.length; i++) s += x[i] * W[i * c + j];
    y[j] = s;
  }
  return y;
}

function softmax(logits) {
  let m = -Infinity;
  for (let i = 0; i < logits.length; i++) if (logits[i] > m) m = logits[i];
  let s = 0;
  const out = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    const v = Math.exp(logits[i] - m);
    out[i] = v; s += v;
  }
  const inv = 1 / (s || 1);
  for (let i = 0; i < out.length; i++) out[i] *= inv;
  return out;
}

function padOrTrim(arr, n, padVal) {
  const a = Array.from(arr);
  if (a.length >= n) return a.slice(a.length - n);
  const pad = new Array(n - a.length).fill(padVal);
  return pad.concat(a);
}

/**
 * Get indices of top-K elements by value (descending)
 * Used for finding most probable tokens
 */
function getTopKIndices(arr, k) {
  const indexed = [];
  for (let i = 0; i < arr.length; i++) {
    indexed.push({ idx: i, val: arr[i] });
  }
  indexed.sort((a, b) => b.val - a.val);
  const result = [];
  for (let i = 0; i < Math.min(k, indexed.length); i++) {
    result.push(indexed[i].idx);
  }
  return result;
}
