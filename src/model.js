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
  }

  _buildPositionalEncoding(ctx, d) {
    const P = new Float32Array(ctx * d);
    for (let pos = 0; pos < ctx; pos++) {
      for (let i = 0; i < d; i++) {
        const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / d);
        P[pos * d + i] = (i % 2 === 0) ? Math.sin(angle) : Math.cos(angle);
      }
    }
    return P;
  }

  // forward: returns {probs, entropy, perplexity, attentionMap, resonanceField}
  forward(ctxIds) {
    const ids = padOrTrim(ctxIds, this.ctx, 0);

    // build token vectors with positional encoding
    const X = new Float32Array(this.ctx * this.d);
    for (let t = 0; t < this.ctx; t++) {
      const id = ids[t];
      for (let i = 0; i < this.d; i++) {
        X[t * this.d + i] = this.E[id * this.d + i] + this.P[t * this.d + i];
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

      // attention scores vs all keys (with causal mask implied by focus)
      for (let t = 0; t < this.ctx; t++) {
        const xt = X.subarray(t * this.d, (t + 1) * this.d);
        const k = matVec(this.Wk[h], this.headDim, this.d, xt);
        
        // apply resonance modulation
        const resBoost = this.resonance[ids[t]] * 0.3;
        scores[t] = (dot(q, k) / Math.sqrt(this.headDim)) * (1 + resBoost);
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
        scores[t] /= (0.15 + 2.0 * spread);
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

    return { 
      probs, 
      entropy: H, 
      perplexity: ppl, 
      attentionMap: combinedAtt,
      resonanceField 
    };
  }

  // One SGD step on cross-entropy. Tiny + crude on purpose.
  // notorch: resonance updates through experience, not just backprop
  trainStep(ctxIds, targetId) {
    const { probs } = this.forward(ctxIds);

    // gradient on logits: dL/dlogits = probs - onehot(target)
    const grad = new Float32Array(this.vocabSize);
    for (let i = 0; i < this.vocabSize; i++) grad[i] = probs[i];
    grad[targetId] -= 1;

    // SPLIT-BRAIN FIX: use cached y from forward() instead of recomputing
    // This ensures trainStep uses the exact same y that produced probs
    const y = this._cachedY;
    if (!y) return; // safety: forward() must be called first
    
    for (let j = 0; j < this.vocabSize; j++) {
      const gj = grad[j];
      for (let i = 0; i < this.d; i++) {
        this.Wo[i * this.vocabSize + j] -= this.lr * y[i] * gj;
      }
    }

    // NOTORCH: update resonance based on prediction accuracy (emergent learning)
    // weights are experiences, not parameters
    const wasCorrect = probs[targetId] > 0.1;
    if (wasCorrect) {
      // boost resonance on correct prediction
      this.resonance[targetId] = Math.min(1, this.resonance[targetId] + this.resonanceBoost);
    } else {
      // decay resonance on wrong prediction
      this.resonance[targetId] = Math.max(0.1, this.resonance[targetId] - this.resonanceDecay);
    }
  }

  // internal: compute y again (same as forward, but returns only y)
  _lastY(ctxIds) {
    const ids = padOrTrim(ctxIds, this.ctx, 0);
    const X = new Float32Array(this.ctx * this.d);
    
    for (let t = 0; t < this.ctx; t++) {
      const id = ids[t];
      for (let i = 0; i < this.d; i++) {
        X[t * this.d + i] = this.E[id * this.d + i] + this.P[t * this.d + i];
      }
    }

    const y = new Float32Array(this.d);
    
    for (let h = 0; h < this.nHeads; h++) {
      const xLast = X.subarray((this.ctx - 1) * this.d, this.ctx * this.d);
      const q = matVec(this.Wq[h], this.headDim, this.d, xLast);

      const scores = new Float32Array(this.ctx);
      for (let t = 0; t < this.ctx; t++) {
        const xt = X.subarray(t * this.d, (t + 1) * this.d);
        const k = matVec(this.Wk[h], this.headDim, this.d, xt);
        scores[t] = dot(q, k) / Math.sqrt(this.headDim);
      }
      const att = softmax(scores);

      // project full xt to headDim and accumulate
      const baseIdx = h * this.headDim;
      for (let t = 0; t < this.ctx; t++) {
        const xt = X.subarray(t * this.d, (t + 1) * this.d);
        const v = matVec(this.Wv[h], this.headDim, this.d, xt);
        for (let i = 0; i < this.headDim && baseIdx + i < this.d; i++) {
          y[baseIdx + i] += att[t] * v[i];
        }
      }
    }
    
    return y;
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
