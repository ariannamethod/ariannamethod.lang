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

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALITY LOADER — loads 10M personality weights from arianna.c
// "Who am I and how do I speak?" — inner voice modulation
// ═══════════════════════════════════════════════════════════════════════════════

// GPT-style weight layout (approximate for 10M params):
// - wte: token embeddings [vocab × d_model]
// - wpe: position embeddings [ctx × d_model]
// - Blocks × n_layers: (attn + mlp)
const PERSONALITY_CONFIG = {
  vocabSize: 185,        // char-level from vocab_personality.bin
  dModel: 256,           // hidden dimension
  nLayers: 6,            // transformer blocks
  nHeads: 4,             // attention heads
  ctxLen: 512,           // context length
};

export class PersonalityLoader {
  constructor() {
    this.weights = null;
    this.vocab = null;
    this.config = PERSONALITY_CONFIG;
    this.loaded = false;

    // Extracted weight tensors
    this.tokenEmbed = null;      // [vocab × d_model]
    this.posEmbed = null;        // [ctx × d_model]
    this.attentionBias = null;   // aggregated attention bias
  }

  async load(weightsPath = './weights/personality_brain.bin', vocabPath = './weights/vocab_personality.bin') {
    try {
      // Load vocab (char-level)
      const vocabResp = await fetch(vocabPath);
      if (!vocabResp.ok) throw new Error(`Vocab fetch failed: ${vocabResp.status}`);
      this.vocab = await vocabResp.text();
      console.log(`🧠 Personality vocab: ${this.vocab.length} chars`);

      // Load binary weights
      const weightsResp = await fetch(weightsPath);
      if (!weightsResp.ok) throw new Error(`Weights fetch failed: ${weightsResp.status}`);
      const buffer = await weightsResp.arrayBuffer();
      this.weights = new Float32Array(buffer);
      console.log(`🧠 Personality weights: ${this.weights.length} floats (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);

      // Extract key tensors
      this._extractTensors();

      this.loaded = true;
      console.log('🧠 Personality loaded: "Who am I and how do I speak?"');
      return true;
    } catch (e) {
      console.warn('⚠️ Personality load failed:', e.message);
      return false;
    }
  }

  _extractTensors() {
    const { vocabSize, dModel, ctxLen } = this.config;
    let offset = 0;

    // Token embeddings: first vocabSize × dModel floats
    const wteSize = vocabSize * dModel;
    this.tokenEmbed = this.weights.slice(offset, offset + wteSize);
    offset += wteSize;

    // Position embeddings: next ctxLen × dModel floats
    const wpeSize = ctxLen * dModel;
    if (offset + wpeSize <= this.weights.length) {
      this.posEmbed = this.weights.slice(offset, offset + wpeSize);
      offset += wpeSize;
    }

    // Aggregate remaining as attention bias signal
    // (simplified: we'll use the mean activation pattern)
    if (offset < this.weights.length) {
      const remaining = this.weights.slice(offset);
      this.attentionBias = new Float32Array(dModel);

      // Compute mean activation per dimension
      const numVectors = Math.floor(remaining.length / dModel);
      for (let i = 0; i < numVectors; i++) {
        for (let d = 0; d < dModel; d++) {
          this.attentionBias[d] += remaining[i * dModel + d];
        }
      }
      for (let d = 0; d < dModel; d++) {
        this.attentionBias[d] /= numVectors;
      }
    }

    console.log(`🧠 Extracted: tokenEmbed[${this.tokenEmbed?.length}], posEmbed[${this.posEmbed?.length}], attentionBias[${this.attentionBias?.length}]`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELTA INJECTION — modify model behavior via personality
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get personality embedding for a character
   * @param {string} char - single character
   * @returns {Float32Array} embedding vector or null
   */
  getCharEmbedding(char) {
    if (!this.loaded || !this.tokenEmbed) return null;

    const idx = this.vocab.indexOf(char);
    if (idx < 0) return null;

    const { dModel } = this.config;
    const start = idx * dModel;
    return this.tokenEmbed.slice(start, start + dModel);
  }

  /**
   * Get personality bias for a text (aggregated embeddings)
   * @param {string} text - input text
   * @returns {Float32Array} aggregated embedding
   */
  getTextBias(text) {
    if (!this.loaded || !this.tokenEmbed) return null;

    const { dModel } = this.config;
    const bias = new Float32Array(dModel);
    let count = 0;

    for (const char of text) {
      const embed = this.getCharEmbedding(char);
      if (embed) {
        for (let d = 0; d < dModel; d++) {
          bias[d] += embed[d];
        }
        count++;
      }
    }

    if (count > 0) {
      for (let d = 0; d < dModel; d++) {
        bias[d] /= count;
      }
    }

    return bias;
  }

  /**
   * Apply personality delta to model logits
   * Stanley-style: personality changes WHERE attention goes, not WHAT model knows
   *
   * @param {Float32Array} logits - model output logits
   * @param {string} context - recent context text
   * @param {number} scale - delta scale (0-1)
   * @returns {Float32Array} modified logits
   */
  applyDelta(logits, context, scale = 0.1) {
    if (!this.loaded || !this.attentionBias) return logits;

    // Get personality response to context
    const contextBias = this.getTextBias(context);
    if (!contextBias) return logits;

    // Compute dot product with attention bias → personality "agreement"
    let agreement = 0;
    for (let d = 0; d < this.config.dModel; d++) {
      agreement += contextBias[d] * this.attentionBias[d];
    }

    // Normalize and apply as softmax temperature modulation
    const tempMod = 1.0 + agreement * scale;

    // Apply to logits (multiplicative, not additive)
    const modifiedLogits = new Float32Array(logits.length);
    for (let i = 0; i < logits.length; i++) {
      modifiedLogits[i] = logits[i] * tempMod;
    }

    return modifiedLogits;
  }

  /**
   * Generate a "thought" from personality (for wall text)
   * @param {number} length - approximate length
   * @returns {string} generated philosophical fragment
   */
  sampleThought(length = 20) {
    if (!this.loaded || !this.vocab) return '';

    // Simple sampling from token embeddings
    // Higher magnitude embeddings → more "characteristic" chars
    const magnitudes = [];
    const { vocabSize, dModel } = this.config;

    for (let i = 0; i < vocabSize; i++) {
      let mag = 0;
      for (let d = 0; d < dModel; d++) {
        const val = this.tokenEmbed[i * dModel + d];
        mag += val * val;
      }
      magnitudes.push({ idx: i, mag: Math.sqrt(mag) });
    }

    // Sort by magnitude (higher = more personality-defining)
    magnitudes.sort((a, b) => b.mag - a.mag);

    // Sample from top chars with some randomness
    let thought = '';
    for (let i = 0; i < length; i++) {
      const topK = Math.min(20, magnitudes.length);
      const pick = magnitudes[Math.floor(Math.random() * topK)];
      thought += this.vocab[pick.idx] || ' ';
    }

    return thought;
  }
}

// Singleton instance for global access
export const personality = new PersonalityLoader();

// ═══════════════════════════════════════════════════════════════════════════════
// END PERSONALITY LOADER
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
