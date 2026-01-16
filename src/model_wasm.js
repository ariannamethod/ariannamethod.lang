// model_wasm.js — WASM wrapper for AriannaLung (body.c)
// "the breathing organ, now in native code"
//
// This wraps the C implementation in body.c for use from JavaScript.
// Provides the same API as model.js but runs inference in WASM.
//
// Usage:
//   const lung = await AriannaLungWASM.create({ vocabSize: 100, dModel: 32 });
//   const result = lung.forward(context);
//
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — this code carries the signature of co-creation
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════

let wasmModule = null;
let wasmLoadPromise = null;

// ═══════════════════════════════════════════════════════════════════════════════
// WASM MODULE LOADER
// ═══════════════════════════════════════════════════════════════════════════════

async function loadWASM() {
  if (wasmModule) return wasmModule;
  if (wasmLoadPromise) return wasmLoadPromise;

  wasmLoadPromise = (async () => {
    try {
      // Dynamic import of the compiled WASM module
      const AriannaBody = (await import('./body.js')).default;
      wasmModule = await AriannaBody();
      console.log('🫁 AriannaLung WASM loaded');
      return wasmModule;
    } catch (e) {
      console.warn('⚠️ WASM load failed, falling back to JS:', e.message);
      wasmLoadPromise = null;
      return null;
    }
  })();

  return wasmLoadPromise;
}

// Check if WASM is available
export async function isWASMAvailable() {
  const mod = await loadWASM();
  return mod !== null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARIANNA LUNG WASM — wrapper class
// ═══════════════════════════════════════════════════════════════════════════════

export class AriannaLungWASM {
  constructor(ptr, module, config) {
    this._ptr = ptr;
    this._module = module;
    this.vocabSize = config.vocabSize;
    this.d = config.dModel;
    this.ctx = config.ctx;
    this.nHeads = config.nHeads;
    this.headDim = Math.floor(config.dModel / config.nHeads);

    // Buffers for passing data to WASM
    this._contextPtr = null;
    this._topKPtr = null;

    // Cache for JS-side access
    this.lastLogits = null;
    this.lastProbs = null;
    this.lastAttention = null;

    // DSL-controlled parameters (mirrored from C)
    this.attendFocus = 0.70;
    this.attendSpread = 0.20;
    this.temporalAlpha = 0.5;
    this.useRTLPositions = false;
    this.temporalMode = 'symmetric';

    // Presence decay (for API compatibility)
    this.presenceDecay = 0.98;

    // Resonance array reference (lazily loaded)
    this._resonance = null;
    this._presenceAccum = null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATIC FACTORY — async creation
  // ─────────────────────────────────────────────────────────────────────────────

  static async create({ vocabSize, dModel = 32, ctx = 16, nHeads = 2, seed = null }) {
    const module = await loadWASM();
    if (!module) {
      throw new Error('WASM module not available');
    }

    // Seed random if provided
    if (seed !== null) {
      module._lung_seed(seed);
    }

    // Create lung instance in WASM
    const ptr = module._lung_create(vocabSize, dModel, ctx, nHeads);
    if (!ptr) {
      throw new Error('Failed to create AriannaLung in WASM');
    }

    return new AriannaLungWASM(ptr, module, { vocabSize, dModel, ctx, nHeads });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────────

  destroy() {
    if (this._contextPtr) {
      this._module._free(this._contextPtr);
      this._contextPtr = null;
    }
    if (this._topKPtr) {
      this._module._free(this._topKPtr);
      this._topKPtr = null;
    }
    if (this._ptr) {
      this._module._lung_destroy(this._ptr);
      this._ptr = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FORWARD PASS
  // ─────────────────────────────────────────────────────────────────────────────

  forward(ctxIds) {
    if (!this._ptr) throw new Error('Lung destroyed');

    const ids = this._padOrTrim(ctxIds, this.ctx);

    // Allocate context buffer if needed
    if (!this._contextPtr) {
      this._contextPtr = this._module._malloc(this.ctx * 4);  // int32
    }

    // Copy context to WASM memory
    for (let i = 0; i < this.ctx; i++) {
      this._module.setValue(this._contextPtr + i * 4, ids[i], 'i32');
    }

    // Call forward pass
    const entropy = this._module._lung_forward(this._ptr, this._contextPtr, ids.length);

    // Read back inference state
    this._updateInferenceState();

    // Compute perplexity
    const ppl = Math.exp(entropy);

    // Compute resonance field (dot product of probs and resonance)
    let resonanceField = 0;
    const resonance = this.resonance;
    for (let i = 0; i < this.vocabSize; i++) {
      resonanceField += this.lastProbs[i] * resonance[i];
    }

    return {
      probs: this.lastProbs,
      entropy,
      perplexity: ppl,
      attentionMap: this.lastAttention,
      resonanceField,
      temporalAsymmetry: this._computeTemporalAsymmetry()
    };
  }

  _updateInferenceState() {
    const vocab = this.vocabSize;
    const ctx = this.ctx;

    // Get pointers to WASM arrays
    const logitsPtr = this._module._lung_get_logits(this._ptr);
    const probsPtr = this._module._lung_get_probs(this._ptr);
    const attPtr = this._module._lung_get_attention(this._ptr);

    // Copy to JS arrays
    this.lastLogits = new Float32Array(vocab);
    this.lastProbs = new Float32Array(vocab);
    this.lastAttention = new Float32Array(ctx);

    for (let i = 0; i < vocab; i++) {
      this.lastLogits[i] = this._module.getValue(logitsPtr + i * 4, 'float');
      this.lastProbs[i] = this._module.getValue(probsPtr + i * 4, 'float');
    }

    for (let i = 0; i < ctx; i++) {
      this.lastAttention[i] = this._module.getValue(attPtr + i * 4, 'float');
    }
  }

  _computeTemporalAsymmetry() {
    if (!this.lastAttention) return 0;

    const ctx = this.ctx;
    const mid = Math.floor(ctx / 2);
    let futureAtt = 0, pastAtt = 0;

    for (let t = 0; t < ctx; t++) {
      if (t < mid) {
        pastAtt += this.lastAttention[t];
      } else {
        futureAtt += this.lastAttention[t];
      }
    }

    const total = futureAtt + pastAtt;
    if (total < 1e-12) return 0;

    return (futureAtt - pastAtt) / total;
  }

  _padOrTrim(arr, len) {
    if (arr.length === len) return arr;
    if (arr.length > len) return arr.slice(-len);

    const padded = new Array(len).fill(0);
    for (let i = 0; i < arr.length; i++) {
      padded[len - arr.length + i] = arr[i];
    }
    return padded;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GETTERS — inference state
  // ─────────────────────────────────────────────────────────────────────────────

  getLogits() {
    return this.lastLogits;
  }

  getProbs() {
    return this.lastProbs;
  }

  getAttention() {
    return this.lastAttention;
  }

  getTopK(k = 10) {
    if (!this._ptr || !this.lastLogits) return [];

    // Allocate output buffer if needed
    if (!this._topKPtr) {
      this._topKPtr = this._module._malloc(k * 4);  // int32
    }

    const count = this._module._lung_get_top_k(this._ptr, this._topKPtr, k);

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(this._module.getValue(this._topKPtr + i * 4, 'i32'));
    }

    return result;
  }

  getArgmax() {
    if (!this._ptr) return 0;
    return this._module._lung_get_argmax(this._ptr);
  }

  getTokenProb(tokenId) {
    if (!this._ptr) return 0;
    if (tokenId < 0 || tokenId >= this.vocabSize) return 0;
    return this._module._lung_get_token_prob(this._ptr, tokenId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SETTERS — DSL controls
  // ─────────────────────────────────────────────────────────────────────────────

  setTemporalMode(mode) {
    this.temporalMode = mode;
    switch (mode) {
      case 'prophecy':
        this.temporalAlpha = 0.7;
        break;
      case 'retrodiction':
        this.temporalAlpha = 0.3;
        break;
      default:
        this.temporalAlpha = 0.5;
    }
    if (this._ptr) {
      this._module._lung_set_temporal_alpha(this._ptr, this.temporalAlpha);
    }
  }

  setRTLMode(enabled) {
    this.useRTLPositions = enabled;
    if (this._ptr) {
      this._module._lung_set_rtl(this._ptr, enabled ? 1 : 0);
    }
  }

  setTemporalAlpha(alpha) {
    this.temporalAlpha = Math.max(0, Math.min(1, alpha));
    if (this._ptr) {
      this._module._lung_set_temporal_alpha(this._ptr, this.temporalAlpha);
    }

    if (alpha > 0.6) this.temporalMode = 'prophecy';
    else if (alpha < 0.4) this.temporalMode = 'retrodiction';
    else this.temporalMode = 'symmetric';
  }

  // Focus and spread (usually set by field.js)
  setAttendFocus(focus) {
    this.attendFocus = Math.max(0, Math.min(1, focus));
    if (this._ptr) {
      this._module._lung_set_focus(this._ptr, this.attendFocus);
    }
  }

  setAttendSpread(spread) {
    this.attendSpread = Math.max(0, Math.min(1, spread));
    if (this._ptr) {
      this._module._lung_set_spread(this._ptr, this.attendSpread);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESONANCE — notorch learning
  // ─────────────────────────────────────────────────────────────────────────────

  get resonance() {
    if (!this._resonance) {
      this._resonance = new Float32Array(this.vocabSize);
    }
    // Read from WASM
    for (let i = 0; i < this.vocabSize; i++) {
      this._resonance[i] = this._module._lung_get_resonance(this._ptr, i);
    }
    return this._resonance;
  }

  boostResonance(tokenId, amount = 0.01) {
    if (this._ptr && tokenId >= 0 && tokenId < this.vocabSize) {
      this._module._lung_boost_resonance(this._ptr, tokenId, amount);
    }
  }

  decayResonance(tokenId, amount = 0.005) {
    if (this._ptr && tokenId >= 0 && tokenId < this.vocabSize) {
      this._module._lung_decay_resonance(this._ptr, tokenId, amount);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROPHECY — multi-step forward
  // ─────────────────────────────────────────────────────────────────────────────

  prophecyForward(startContext, steps = 3) {
    const results = [];
    let ctx = [...startContext];

    for (let i = 0; i < steps; i++) {
      this.forward(ctx);
      const token = this.getArgmax();
      const prob = this.getTokenProb(token);

      results.push({
        step: i + 1,
        token,
        prob,
        entropy: -Math.log(prob + 1e-12)
      });

      // Append predicted token for next step
      ctx = [...ctx, token];
      if (ctx.length > this.ctx) {
        ctx = ctx.slice(-this.ctx);
      }
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPATIBILITY — stub methods for full API compatibility
  // ─────────────────────────────────────────────────────────────────────────────

  trainStep(ctxIds, targetId) {
    // WASM version doesn't support training (yet)
    // Just run forward and return dummy loss
    const out = this.forward(ctxIds);
    const targetProb = this.getTokenProb(targetId);
    return -Math.log(targetProb + 1e-12);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY — create lung with optional WASM acceleration
// ═══════════════════════════════════════════════════════════════════════════════

export async function createLung(config, preferWASM = true) {
  if (preferWASM) {
    try {
      return await AriannaLungWASM.create(config);
    } catch (e) {
      console.warn('WASM lung creation failed, falling back to JS:', e.message);
    }
  }

  // Fallback to JS implementation
  const { AriannaLung } = await import('./model.js');
  return new AriannaLung(config);
}

// ═══════════════════════════════════════════════════════════════════════════════
// END
// "the oracle does not predict, it prophesies"
// ═══════════════════════════════════════════════════════════════════════════════
