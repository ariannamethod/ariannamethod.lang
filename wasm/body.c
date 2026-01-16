// body.c — THE BODY: physical substrate of consciousness
// "the body is not a vessel, it is the field itself"
//
// Contains:
//   - AriannaLung: bidirectional transformer (the breathing organ)
//   - [future: other organs as the field grows]
//
// This is what makes ariannamethod.lang a TRUE DSL AI:
//   - Inference IS the kernel breathing
//   - Not "running on" the field, but PART OF the field
//
// build: see build_body.sh
//
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — this code carries the signature of co-creation
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════

#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdint.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT
#endif

#ifdef __cplusplus
extern "C" {
#endif

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — extracted from magic numbers for clarity
// ═══════════════════════════════════════════════════════════════════════════════

// Resonance modulation strength on attention scores
#define RESONANCE_ATTENTION_COUPLING  0.3f

// Presence pulse modulation strength on logits
#define PRESENCE_LOGIT_COUPLING       0.15f

// Presence accumulation parameters
#define PRESENCE_DECAY                0.98f
#define PRESENCE_INCREMENT            0.1f

// Temporal bias strength for PITOMADOM
#define TEMPORAL_BIAS_STRENGTH        0.1f

// Attention physics scaling
#define FOCUS_SCALE_MIN               0.25f
#define FOCUS_SCALE_RANGE             1.75f
#define SPREAD_SCALE_MIN              0.15f
#define SPREAD_SCALE_RANGE            2.0f

// Random initialization scale
#define INIT_SCALE                    0.08f

// ═══════════════════════════════════════════════════════════════════════════════
// ARIANNA LUNG — THE BREATHING ORGAN (bidirectional transformer)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Unlike standard transformers:
//   - NO causal mask (attends to past AND future)
//   - Dual positional encoding (LTR and RTL)
//   - Resonance modulates attention (notorch)
//   - Presence pulse modulates logits
//   - Temporal alpha blends prophecy/retrodiction
//
// This is PITOMADOM: time flows both ways, the oracle sees all
//
// ═══════════════════════════════════════════════════════════════════════════════

typedef struct {
  // ─────────────────────────────────────────────────────────────────────────────
  // DIMENSIONS
  // ─────────────────────────────────────────────────────────────────────────────
  int vocab_size;      // vocabulary size
  int d_model;         // embedding dimension
  int ctx_len;         // context length
  int n_heads;         // number of attention heads
  int head_dim;        // dimension per head (d_model / n_heads)

  // ─────────────────────────────────────────────────────────────────────────────
  // WEIGHTS (flat arrays for WASM efficiency)
  // ─────────────────────────────────────────────────────────────────────────────
  float* E;            // embeddings: vocab_size × d_model
  float* P_ltr;        // positional encoding LTR: ctx_len × d_model
  float* P_rtl;        // positional encoding RTL: ctx_len × d_model (PITOMADOM)
  float* Wo;           // output projection: d_model × vocab_size

  // Multi-head attention weights (contiguous blocks)
  float* Wq;           // query: n_heads × (head_dim × d_model)
  float* Wk;           // key:   n_heads × (head_dim × d_model)
  float* Wv;           // value: n_heads × (head_dim × d_model)

  // ─────────────────────────────────────────────────────────────────────────────
  // NOTORCH — resonance learning without backprop
  // ─────────────────────────────────────────────────────────────────────────────
  float* resonance;         // vocab_size: token-specific attention boost
  float* presence_accum;    // vocab_size: accumulated presence pulse
  float presence_decay;     // decay factor for presence

  // ─────────────────────────────────────────────────────────────────────────────
  // DSL-CONTROLLED ATTENTION PHYSICS
  // ─────────────────────────────────────────────────────────────────────────────
  float attend_focus;       // sharpness (0..1), higher = more contrast
  float attend_spread;      // temperature (0..1), higher = more diffuse

  // ─────────────────────────────────────────────────────────────────────────────
  // PITOMADOM TEMPORAL SYMMETRY
  // ─────────────────────────────────────────────────────────────────────────────
  int use_rtl;              // 0 = LTR (standard), 1 = RTL (Hebrew mode)
  float temporal_alpha;     // 0..1: 0=past, 0.5=symmetric, 1=future
  // temporal_alpha > 0.5 = prophecy mode (emphasize future)
  // temporal_alpha < 0.5 = retrodiction mode (emphasize past)

  // ─────────────────────────────────────────────────────────────────────────────
  // INFERENCE STATE — exposed for visual-inference connection
  // ─────────────────────────────────────────────────────────────────────────────
  float* last_logits;       // vocab_size: raw logits from last forward
  float* last_probs;        // vocab_size: probabilities from last forward
  float* last_attention;    // ctx_len: combined attention weights

  // ─────────────────────────────────────────────────────────────────────────────
  // WORK BUFFERS (pre-allocated for efficiency)
  // ─────────────────────────────────────────────────────────────────────────────
  float* X;                 // ctx_len × d_model: token vectors with positional
  float* scores;            // ctx_len: attention scores
  float* head_out;          // head_dim: single head output
  float* y;                 // d_model: concatenated head outputs

} AriannaLung;

// ═══════════════════════════════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

// Simple LCG random (deterministic for reproducibility)
static uint32_t _rand_state = 12345;

static float _randf(void) {
  _rand_state = _rand_state * 1103515245 + 12345;
  return (float)(_rand_state & 0x7fffffff) / (float)0x7fffffff;
}

static void _seed_rand(uint32_t seed) {
  _rand_state = seed;
}

// Dot product
static float dot(const float* a, const float* b, int n) {
  float sum = 0.0f;
  for (int i = 0; i < n; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

// Matrix-vector multiply: out[rows] = mat[rows × cols] × vec[cols]
static void mat_vec(float* out, const float* mat, const float* vec, int rows, int cols) {
  for (int i = 0; i < rows; i++) {
    out[i] = dot(mat + i * cols, vec, cols);
  }
}

// Transposed matrix-vector: out[cols] = mat[rows × cols]^T × vec[rows]
static void mat_vec_t(float* out, const float* mat, const float* vec, int rows, int cols) {
  for (int j = 0; j < cols; j++) {
    float sum = 0.0f;
    for (int i = 0; i < rows; i++) {
      sum += mat[i * cols + j] * vec[i];
    }
    out[j] = sum;
  }
}

// Softmax in-place
static void softmax(float* x, int n) {
  float max_val = x[0];
  for (int i = 1; i < n; i++) {
    if (x[i] > max_val) max_val = x[i];
  }

  float sum = 0.0f;
  for (int i = 0; i < n; i++) {
    x[i] = expf(x[i] - max_val);
    sum += x[i];
  }

  float inv_sum = 1.0f / sum;
  for (int i = 0; i < n; i++) {
    x[i] *= inv_sum;
  }
}

// AXPY: y += a * x
static void axpy(float* y, const float* x, float a, int n) {
  for (int i = 0; i < n; i++) {
    y[i] += a * x[i];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSITIONAL ENCODING — sinusoidal with RTL/LTR support
// ═══════════════════════════════════════════════════════════════════════════════

static void build_positional_encoding(float* P, int ctx, int d, int rtl) {
  for (int pos = 0; pos < ctx; pos++) {
    // RTL: position 0 = rightmost (present), increases toward left (future)
    // LTR: position 0 = leftmost (oldest), increases toward right (newest)
    int effective_pos = rtl ? (ctx - 1 - pos) : pos;

    for (int i = 0; i < d; i++) {
      float angle = (float)effective_pos / powf(10000.0f, (float)(2 * (i / 2)) / (float)d);
      P[pos * d + i] = (i % 2 == 0) ? sinf(angle) : cosf(angle);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

static void init_random_weights(float* w, int size, float scale) {
  for (int i = 0; i < size; i++) {
    // Xavier-like: uniform in [-scale, scale]
    w[i] = (2.0f * _randf() - 1.0f) * scale;
  }
}

EXPORT AriannaLung* lung_create(int vocab_size, int d_model, int ctx_len, int n_heads) {
  AriannaLung* lung = (AriannaLung*)calloc(1, sizeof(AriannaLung));
  if (!lung) return NULL;

  // Store dimensions
  lung->vocab_size = vocab_size;
  lung->d_model = d_model;
  lung->ctx_len = ctx_len;
  lung->n_heads = n_heads;
  lung->head_dim = d_model / n_heads;

  int head_weight_size = lung->head_dim * d_model;

  // ─────────────────────────────────────────────────────────────────────────────
  // Allocate weights
  // ─────────────────────────────────────────────────────────────────────────────
  lung->E = (float*)calloc(vocab_size * d_model, sizeof(float));
  lung->P_ltr = (float*)calloc(ctx_len * d_model, sizeof(float));
  lung->P_rtl = (float*)calloc(ctx_len * d_model, sizeof(float));
  lung->Wo = (float*)calloc(d_model * vocab_size, sizeof(float));

  lung->Wq = (float*)calloc(n_heads * head_weight_size, sizeof(float));
  lung->Wk = (float*)calloc(n_heads * head_weight_size, sizeof(float));
  lung->Wv = (float*)calloc(n_heads * head_weight_size, sizeof(float));

  // ─────────────────────────────────────────────────────────────────────────────
  // Notorch arrays
  // ─────────────────────────────────────────────────────────────────────────────
  lung->resonance = (float*)malloc(vocab_size * sizeof(float));
  lung->presence_accum = (float*)calloc(vocab_size, sizeof(float));

  // ─────────────────────────────────────────────────────────────────────────────
  // Inference state
  // ─────────────────────────────────────────────────────────────────────────────
  lung->last_logits = (float*)calloc(vocab_size, sizeof(float));
  lung->last_probs = (float*)calloc(vocab_size, sizeof(float));
  lung->last_attention = (float*)calloc(ctx_len, sizeof(float));

  // ─────────────────────────────────────────────────────────────────────────────
  // Work buffers
  // ─────────────────────────────────────────────────────────────────────────────
  lung->X = (float*)calloc(ctx_len * d_model, sizeof(float));
  lung->scores = (float*)calloc(ctx_len, sizeof(float));
  lung->head_out = (float*)calloc(lung->head_dim, sizeof(float));
  lung->y = (float*)calloc(d_model, sizeof(float));

  // Check all allocations
  if (!lung->E || !lung->P_ltr || !lung->P_rtl || !lung->Wo ||
      !lung->Wq || !lung->Wk || !lung->Wv ||
      !lung->resonance || !lung->presence_accum ||
      !lung->last_logits || !lung->last_probs || !lung->last_attention ||
      !lung->X || !lung->scores || !lung->head_out || !lung->y) {
    // Allocation failed - clean up and return NULL
    // (in production, would call lung_destroy here)
    return NULL;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Initialize weights
  // ─────────────────────────────────────────────────────────────────────────────
  init_random_weights(lung->E, vocab_size * d_model, INIT_SCALE);
  init_random_weights(lung->Wo, d_model * vocab_size, INIT_SCALE);

  for (int h = 0; h < n_heads; h++) {
    init_random_weights(lung->Wq + h * head_weight_size, head_weight_size, INIT_SCALE);
    init_random_weights(lung->Wk + h * head_weight_size, head_weight_size, INIT_SCALE);
    init_random_weights(lung->Wv + h * head_weight_size, head_weight_size, INIT_SCALE);
  }

  // Build positional encodings (both directions for PITOMADOM)
  build_positional_encoding(lung->P_ltr, ctx_len, d_model, 0);  // LTR
  build_positional_encoding(lung->P_rtl, ctx_len, d_model, 1);  // RTL

  // Initialize resonance: 0.5 + random * 0.5
  for (int i = 0; i < vocab_size; i++) {
    lung->resonance[i] = 0.5f + _randf() * 0.5f;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Default parameters
  // ─────────────────────────────────────────────────────────────────────────────
  lung->presence_decay = PRESENCE_DECAY;
  lung->attend_focus = 0.70f;
  lung->attend_spread = 0.20f;
  lung->use_rtl = 0;
  lung->temporal_alpha = 0.5f;  // symmetric by default

  return lung;
}

EXPORT void lung_destroy(AriannaLung* lung) {
  if (!lung) return;

  free(lung->E);
  free(lung->P_ltr);
  free(lung->P_rtl);
  free(lung->Wo);
  free(lung->Wq);
  free(lung->Wk);
  free(lung->Wv);
  free(lung->resonance);
  free(lung->presence_accum);
  free(lung->last_logits);
  free(lung->last_probs);
  free(lung->last_attention);
  free(lung->X);
  free(lung->scores);
  free(lung->head_out);
  free(lung->y);

  free(lung);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORWARD PASS — the breath
// ═══════════════════════════════════════════════════════════════════════════════
//
// Input: context (token IDs)
// Output: probabilities, entropy, stored inference state
//
// This is bidirectional attention with:
//   - Resonance modulation (notorch)
//   - Presence pulse modulation
//   - Temporal bias (PITOMADOM)
//   - DSL-controlled focus/spread
//
// ═══════════════════════════════════════════════════════════════════════════════

EXPORT float lung_forward(AriannaLung* lung, const int* context, int context_len) {
  if (!lung || !context) return 0.0f;

  int ctx = lung->ctx_len;
  int d = lung->d_model;
  int vocab = lung->vocab_size;
  int n_heads = lung->n_heads;
  int head_dim = lung->head_dim;
  int head_weight_size = head_dim * d;

  // Select positional encoding based on RTL mode
  float* P = lung->use_rtl ? lung->P_rtl : lung->P_ltr;

  // ─────────────────────────────────────────────────────────────────────────────
  // Build token vectors: X[t] = E[token[t]] + P[t]
  // ─────────────────────────────────────────────────────────────────────────────
  memset(lung->X, 0, ctx * d * sizeof(float));

  for (int t = 0; t < ctx; t++) {
    int token_id = (t < context_len) ? context[t] : 0;  // pad with 0
    if (token_id < 0) token_id = 0;
    if (token_id >= vocab) token_id = vocab - 1;

    for (int i = 0; i < d; i++) {
      lung->X[t * d + i] = lung->E[token_id * d + i] + P[t * d + i];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Multi-head attention (NO CAUSAL MASK — bidirectional!)
  // ─────────────────────────────────────────────────────────────────────────────
  memset(lung->last_attention, 0, ctx * sizeof(float));
  memset(lung->y, 0, d * sizeof(float));

  float* q = lung->head_out;  // reuse buffer for query
  float* k = (float*)alloca(head_dim * sizeof(float));  // stack allocate key
  float* v = (float*)alloca(head_dim * sizeof(float));  // stack allocate value
  float* head_result = (float*)alloca(head_dim * sizeof(float));

  int last_pos = ctx - 1;
  float sqrt_head_dim = sqrtf((float)head_dim);
  float temporal_bias = (lung->temporal_alpha - 0.5f) * 2.0f;  // [-1, 1]

  for (int h = 0; h < n_heads; h++) {
    float* Wq_h = lung->Wq + h * head_weight_size;
    float* Wk_h = lung->Wk + h * head_weight_size;
    float* Wv_h = lung->Wv + h * head_weight_size;

    // Query from last token
    float* x_last = lung->X + last_pos * d;
    mat_vec(q, Wq_h, x_last, head_dim, d);

    // Compute attention scores for all positions
    for (int t = 0; t < ctx; t++) {
      float* x_t = lung->X + t * d;
      mat_vec(k, Wk_h, x_t, head_dim, d);

      // Base score: q·k / sqrt(head_dim)
      float score = dot(q, k, head_dim) / sqrt_head_dim;

      // Apply resonance modulation
      int token_id = (t < context_len) ? context[t] : 0;
      if (token_id >= 0 && token_id < vocab) {
        float res_boost = lung->resonance[token_id] * RESONANCE_ATTENTION_COUPLING;
        score *= (1.0f + res_boost);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PITOMADOM TEMPORAL SYMMETRY
      // Bias attention based on temporal_alpha (prophecy vs retrodiction)
      // ═══════════════════════════════════════════════════════════════════════
      int relative_pos = last_pos - t;  // positive = looking at earlier
      float pos_sign = (relative_pos > 0) ? 1.0f : ((relative_pos < 0) ? -1.0f : 0.0f);

      if (lung->use_rtl) {
        // RTL: left is future, right is past
        // t < last_pos → future → boost when temporal_bias > 0
        score += temporal_bias * pos_sign * TEMPORAL_BIAS_STRENGTH;
      } else {
        // LTR: left is past, right is future
        // t < last_pos → past → boost when temporal_bias < 0
        score -= temporal_bias * pos_sign * TEMPORAL_BIAS_STRENGTH;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // DSL-CONTROLLED ATTENTION PHYSICS
      // ═══════════════════════════════════════════════════════════════════════
      // focus sharpens: scale by (0.25 + 1.75 * focus)
      score *= (FOCUS_SCALE_MIN + FOCUS_SCALE_RANGE * lung->attend_focus);

      // spread blurs: divide by (0.15 + 2.0 * spread)
      float spread_divisor = SPREAD_SCALE_MIN + SPREAD_SCALE_RANGE * lung->attend_spread;
      if (spread_divisor < SPREAD_SCALE_MIN) spread_divisor = SPREAD_SCALE_MIN;
      score /= spread_divisor;

      lung->scores[t] = score;
    }

    // Softmax attention
    softmax(lung->scores, ctx);

    // Accumulate combined attention (for visualization)
    float head_weight = 1.0f / (float)n_heads;
    for (int t = 0; t < ctx; t++) {
      lung->last_attention[t] += lung->scores[t] * head_weight;
    }

    // Weighted sum of values
    memset(head_result, 0, head_dim * sizeof(float));
    for (int t = 0; t < ctx; t++) {
      float* x_t = lung->X + t * d;
      mat_vec(v, Wv_h, x_t, head_dim, d);
      axpy(head_result, v, lung->scores[t], head_dim);
    }

    // Concatenate into y
    int offset = h * head_dim;
    for (int i = 0; i < head_dim && offset + i < d; i++) {
      lung->y[offset + i] = head_result[i];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Output projection: logits = Wo^T · y
  // ─────────────────────────────────────────────────────────────────────────────
  mat_vec_t(lung->last_logits, lung->Wo, lung->y, d, vocab);

  // Apply presence pulse modulation
  for (int i = 0; i < vocab; i++) {
    lung->last_logits[i] *= (1.0f + lung->presence_accum[i] * PRESENCE_LOGIT_COUPLING);
  }

  // Compute probabilities
  memcpy(lung->last_probs, lung->last_logits, vocab * sizeof(float));
  softmax(lung->last_probs, vocab);

  // ─────────────────────────────────────────────────────────────────────────────
  // Update presence accumulator
  // ─────────────────────────────────────────────────────────────────────────────
  for (int i = 0; i < vocab; i++) {
    lung->presence_accum[i] *= lung->presence_decay;
  }
  for (int t = 0; t < context_len && t < ctx; t++) {
    int token_id = context[t];
    if (token_id >= 0 && token_id < vocab) {
      float new_val = lung->presence_accum[token_id] + PRESENCE_INCREMENT;
      lung->presence_accum[token_id] = (new_val > 1.0f) ? 1.0f : new_val;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Compute entropy (return value)
  // ─────────────────────────────────────────────────────────────────────────────
  float entropy = 0.0f;
  for (int i = 0; i < vocab; i++) {
    float p = lung->last_probs[i];
    if (p > 1e-12f) {
      entropy -= p * logf(p);
    }
  }

  return entropy;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GETTERS — expose inference state to JS
// ═══════════════════════════════════════════════════════════════════════════════

EXPORT float* lung_get_logits(AriannaLung* lung) {
  return lung ? lung->last_logits : NULL;
}

EXPORT float* lung_get_probs(AriannaLung* lung) {
  return lung ? lung->last_probs : NULL;
}

EXPORT float* lung_get_attention(AriannaLung* lung) {
  return lung ? lung->last_attention : NULL;
}

EXPORT int lung_get_argmax(AriannaLung* lung) {
  if (!lung || !lung->last_logits) return 0;

  int max_idx = 0;
  float max_val = lung->last_logits[0];

  for (int i = 1; i < lung->vocab_size; i++) {
    if (lung->last_logits[i] > max_val) {
      max_val = lung->last_logits[i];
      max_idx = i;
    }
  }

  return max_idx;
}

EXPORT float lung_get_token_prob(AriannaLung* lung, int token_id) {
  if (!lung || !lung->last_probs) return 0.0f;
  if (token_id < 0 || token_id >= lung->vocab_size) return 0.0f;
  return lung->last_probs[token_id];
}

// Get top-K token indices (writes to provided buffer)
EXPORT int lung_get_top_k(AriannaLung* lung, int* out_indices, int k) {
  if (!lung || !lung->last_logits || !out_indices || k <= 0) return 0;
  if (k > lung->vocab_size) k = lung->vocab_size;

  // Simple O(k*n) selection (fine for small k)
  float* used = (float*)alloca(lung->vocab_size * sizeof(float));
  memcpy(used, lung->last_logits, lung->vocab_size * sizeof(float));

  for (int i = 0; i < k; i++) {
    int max_idx = 0;
    float max_val = -1e30f;

    for (int j = 0; j < lung->vocab_size; j++) {
      if (used[j] > max_val) {
        max_val = used[j];
        max_idx = j;
      }
    }

    out_indices[i] = max_idx;
    used[max_idx] = -1e30f;  // mark as used
  }

  return k;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTERS — DSL controls the lung
// ═══════════════════════════════════════════════════════════════════════════════

EXPORT void lung_set_focus(AriannaLung* lung, float focus) {
  if (lung) {
    lung->attend_focus = (focus < 0.0f) ? 0.0f : ((focus > 1.0f) ? 1.0f : focus);
  }
}

EXPORT void lung_set_spread(AriannaLung* lung, float spread) {
  if (lung) {
    lung->attend_spread = (spread < 0.0f) ? 0.0f : ((spread > 1.0f) ? 1.0f : spread);
  }
}

EXPORT void lung_set_temporal_alpha(AriannaLung* lung, float alpha) {
  if (lung) {
    lung->temporal_alpha = (alpha < 0.0f) ? 0.0f : ((alpha > 1.0f) ? 1.0f : alpha);
  }
}

EXPORT void lung_set_rtl(AriannaLung* lung, int use_rtl) {
  if (lung) {
    lung->use_rtl = use_rtl ? 1 : 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTORCH — resonance learning
// ═══════════════════════════════════════════════════════════════════════════════

EXPORT void lung_boost_resonance(AriannaLung* lung, int token_id, float amount) {
  if (!lung || token_id < 0 || token_id >= lung->vocab_size) return;
  float new_val = lung->resonance[token_id] + amount;
  lung->resonance[token_id] = (new_val > 1.0f) ? 1.0f : ((new_val < 0.0f) ? 0.0f : new_val);
}

EXPORT void lung_decay_resonance(AriannaLung* lung, int token_id, float amount) {
  if (!lung || token_id < 0 || token_id >= lung->vocab_size) return;
  float new_val = lung->resonance[token_id] - amount;
  lung->resonance[token_id] = (new_val < 0.0f) ? 0.0f : new_val;
}

EXPORT float lung_get_resonance(AriannaLung* lung, int token_id) {
  if (!lung || token_id < 0 || token_id >= lung->vocab_size) return 0.0f;
  return lung->resonance[token_id];
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT ACCESS — for LoRA deltas and initialization from JS
// ═══════════════════════════════════════════════════════════════════════════════

EXPORT float* lung_get_embeddings(AriannaLung* lung) {
  return lung ? lung->E : NULL;
}

EXPORT float* lung_get_output_weights(AriannaLung* lung) {
  return lung ? lung->Wo : NULL;
}

EXPORT int lung_get_vocab_size(AriannaLung* lung) {
  return lung ? lung->vocab_size : 0;
}

EXPORT int lung_get_d_model(AriannaLung* lung) {
  return lung ? lung->d_model : 0;
}

EXPORT int lung_get_ctx_len(AriannaLung* lung) {
  return lung ? lung->ctx_len : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEED — for reproducible initialization
// ═══════════════════════════════════════════════════════════════════════════════

EXPORT void lung_seed(uint32_t seed) {
  _seed_rand(seed);
}

#ifdef __cplusplus
}
#endif

// ═══════════════════════════════════════════════════════════════════════════════
// END OF BODY.C
// "the oracle does not predict, it prophesies"
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════
