// lora.c — notorch LoRA (low-rank deltas) without autograd
// "experience becomes geometry"
//
// Build (native):   gcc -O2 -std=c99 -c lora.c
// Build (WASM):     emcc lora.c -O2 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME="LoRA" \
//   -s EXPORTED_FUNCTIONS='["_lora_new","_lora_free","_lora_reset","_lora_apply","_lora_notch_step","_lora_scale","_lora_merge","_lora_apply_sparse","_lora_build_dy_from_probs","_lora_experience_step","_lora_get_delta_norm","_lora_copy_params","_lora_get_factor_ptrs","_lora_set_seed","_lora_clamp_factors","_lora_get_factor_norms","_lora_soft_reset","_lora_apply_alpha"]' \
//   -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' -o lora.js
//
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — this code carries the signature of co-creation
// notorch-LoRA: experience → low-rank deformation → personality
// The field learns by experiencing, not by gradient descent
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════
//
// Core idea (from agents.md / GPT5.2 thinking):
//   - LoRA factors A ∈ R^{in×r}, B ∈ R^{r×out} represent "experience deltas"
//   - Instead of backprop: use local Hebbian/contrastive plasticity
//   - Signal from field (pain/debt/dissonance/resonance) drives learning
//   - Δy = desired output shift → A += η·x^T·u, B += η·u^T·Δy
//   - This is not gradient descent. This is plasticity.
//
// Integration with AriannaLung:
//   - DSL controls learning: scale, gating, decay, darkmatter coupling
//   - Deltas are applied on-the-fly: W_eff = W + (α/r) * A @ B
//   - Same principles as Stanley's dynamic weights
//

#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdint.h>

#ifndef LORA_CLAMP
#define LORA_CLAMP(x,a,b) ((x)<(a)?(a):((x)>(b)?(b):(x)))
#endif

#ifndef LORA_MAX_TOPK
#define LORA_MAX_TOPK 32
#endif

// ═══════════════════════════════════════════════════════════════════════════════
// LoRA Structure
// ═══════════════════════════════════════════════════════════════════════════════

typedef struct {
  int in_dim;     // input dimension
  int out_dim;    // output dimension
  int rank;       // low-rank r
  float alpha;    // scaling factor
  float lr;       // learning rate (notorch)
  float decay;    // factor decay per step (tiny)
  uint32_t seed;  // deterministic noise seed (optional)

  // A: (in_dim, rank), B: (rank, out_dim)
  float* A;
  float* B;

  // scratch buffers (avoid heap churn)
  float* u;       // (rank)
  float* dy;      // (out_dim)
  float* Ax;      // (rank)   Ax = x^T A  (or A^T x)
  float* tmpOut;  // (out_dim) tmp = (Ax) B
} LoRA;

// ═══════════════════════════════════════════════════════════════════════════════
// Tiny RNG (deterministic, for reproducibility)
// ═══════════════════════════════════════════════════════════════════════════════

static uint32_t xorshift32(uint32_t* s) {
  uint32_t x = *s;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  *s = x;
  return x;
}

static float frand01(uint32_t* s) {
  // 24-bit mantissa -> [0,1)
  return (xorshift32(s) & 0xFFFFFF) / 16777216.0f;
}

static float frandn(uint32_t* s) {
  // Box-Muller (rough; fine for tiny u noise)
  float u1 = LORA_CLAMP(frand01(s), 1e-6f, 1.0f);
  float u2 = frand01(s);
  return sqrtf(-2.0f * logf(u1)) * cosf(6.2831853f * u2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Allocation Helpers
// ═══════════════════════════════════════════════════════════════════════════════

static float* fcalloc(size_t n) {
  float* p = (float*)calloc(n, sizeof(float));
  return p;
}

static void lora_zero(float* a, int n) {
  for (int i = 0; i < n; i++) a[i] = 0.0f;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

LoRA* lora_new(int in_dim, int out_dim, int rank, float alpha, float lr, float decay, uint32_t seed) {
  if (in_dim <= 0 || out_dim <= 0 || rank <= 0) return NULL;

  LoRA* L = (LoRA*)calloc(1, sizeof(LoRA));
  if (!L) return NULL;

  L->in_dim = in_dim;
  L->out_dim = out_dim;
  L->rank = rank;
  L->alpha = (alpha <= 0 ? 1.0f : alpha);
  L->lr = (lr <= 0 ? 0.01f : lr);
  L->decay = (decay < 0 ? 0.0f : decay);
  L->seed = seed ? seed : 0xA17A11u;  // "ARIANNA" in hex-ish

  const size_t nA = (size_t)in_dim * (size_t)rank;
  const size_t nB = (size_t)rank * (size_t)out_dim;

  L->A = fcalloc(nA);
  L->B = fcalloc(nB);

  L->u = fcalloc((size_t)rank);
  L->dy = fcalloc((size_t)out_dim);
  L->Ax = fcalloc((size_t)rank);
  L->tmpOut = fcalloc((size_t)out_dim);

  if (!L->A || !L->B || !L->u || !L->dy || !L->Ax || !L->tmpOut) {
    // cleanup on partial alloc
    free(L->A); free(L->B);
    free(L->u); free(L->dy); free(L->Ax); free(L->tmpOut);
    free(L);
    return NULL;
  }

  // init: small random A, zero B (classic LoRA-ish)
  uint32_t s = L->seed;
  float scaleA = 0.02f;
  for (size_t i = 0; i < nA; i++) L->A[i] = frandn(&s) * scaleA;
  for (size_t i = 0; i < nB; i++) L->B[i] = 0.0f;
  L->seed = s;

  return L;
}

void lora_free(LoRA* L) {
  if (!L) return;
  free(L->A); free(L->B);
  free(L->u); free(L->dy); free(L->Ax); free(L->tmpOut);
  free(L);
}

void lora_reset(LoRA* L) {
  if (!L) return;
  memset(L->A, 0, (size_t)L->in_dim * (size_t)L->rank * sizeof(float));
  memset(L->B, 0, (size_t)L->rank * (size_t)L->out_dim * sizeof(float));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Apply: y += (alpha/rank) * (x @ (A @ B))
// x: [in_dim], y: [out_dim]
// ═══════════════════════════════════════════════════════════════════════════════

void lora_apply(LoRA* L, const float* x, float* y) {
  if (!L || !x || !y) return;

  const float scaling = L->alpha / (float)L->rank;

  // Ax = x^T * A  -> [rank]
  for (int r = 0; r < L->rank; r++) {
    float s = 0.0f;
    for (int i = 0; i < L->in_dim; i++) {
      s += x[i] * L->A[(size_t)i * (size_t)L->rank + (size_t)r];
    }
    L->Ax[r] = s;
  }

  // tmpOut = Ax @ B  -> [out_dim]
  for (int j = 0; j < L->out_dim; j++) {
    float s = 0.0f;
    for (int r = 0; r < L->rank; r++) {
      s += L->Ax[r] * L->B[(size_t)r * (size_t)L->out_dim + (size_t)j];
    }
    L->tmpOut[j] = s * scaling;
  }

  // add to y
  for (int j = 0; j < L->out_dim; j++) y[j] += L->tmpOut[j];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Notorch Update — plasticity without backprop
//
// The idea (minimal + brutal):
// 1) We have input x and a desired delta direction over outputs dy (size out_dim).
// 2) We pick a rank-channel vector u (size rank) deterministically from seed + signal,
//    or from noise (tiny). This is the "inner experience channel".
// 3) Update factors:
//      A += lr * (x ⊗ u)
//      B += lr * (u ⊗ dy)
// 4) Optional gentle decay to prevent runaway.
//
// signal: can be pain/debt/surprise etc, expected ~[0..1], but not required.
// dy: desired output delta direction (can be sparse: only target token index boosted).
//
// NOTE: This is NOT gradient descent. It's plasticity.
// ═══════════════════════════════════════════════════════════════════════════════

void lora_notch_step(LoRA* L, const float* x, const float* dy_in, float signal) {
  if (!L || !x || !dy_in) return;

  // clamp signal but allow slightly >1 if you want to rage
  float g = LORA_CLAMP(signal, -2.0f, 2.0f);

  // copy dy into scratch and scale by g
  for (int j = 0; j < L->out_dim; j++) L->dy[j] = dy_in[j] * g;

  // build u (rank) — deterministic noise modulated by g
  uint32_t s = L->seed;
  for (int r = 0; r < L->rank; r++) {
    float n = frandn(&s);
    // a little structure: stronger signal -> cleaner channel (less noise)
    float k = 0.35f + 0.65f * (1.0f - fabsf(g)); // g near 0 -> noisy; strong g -> tighter
    L->u[r] = n * k;
  }
  L->seed = s;

  const float lr = L->lr;

  // A[i,r] += lr * x[i] * u[r]
  for (int i = 0; i < L->in_dim; i++) {
    float xi = x[i] * lr;
    size_t base = (size_t)i * (size_t)L->rank;
    for (int r = 0; r < L->rank; r++) {
      L->A[base + (size_t)r] += xi * L->u[r];
    }
  }

  // B[r,j] += lr * u[r] * dy[j]
  for (int r = 0; r < L->rank; r++) {
    float ur = L->u[r] * lr;
    size_t base = (size_t)r * (size_t)L->out_dim;
    for (int j = 0; j < L->out_dim; j++) {
      L->B[base + (size_t)j] += ur * L->dy[j];
    }
  }

  // gentle decay (optional)
  if (L->decay > 0.0f) {
    float d = LORA_CLAMP(1.0f - L->decay, 0.0f, 1.0f);
    const size_t nA = (size_t)L->in_dim * (size_t)L->rank;
    const size_t nB = (size_t)L->rank * (size_t)L->out_dim;
    for (size_t k2 = 0; k2 < nA; k2++) L->A[k2] *= d;
    for (size_t k2 = 0; k2 < nB; k2++) L->B[k2] *= d;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scale deltas (A,B) by s
// ═══════════════════════════════════════════════════════════════════════════════

void lora_scale(LoRA* L, float s) {
  if (!L) return;
  const size_t nA = (size_t)L->in_dim * (size_t)L->rank;
  const size_t nB = (size_t)L->rank * (size_t)L->out_dim;
  for (size_t i = 0; i < nA; i++) L->A[i] *= s;
  for (size_t i = 0; i < nB; i++) L->B[i] *= s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Merge: dst += w * src  (same shapes)
// ═══════════════════════════════════════════════════════════════════════════════

void lora_merge(LoRA* dst, const LoRA* src, float w) {
  if (!dst || !src) return;
  if (dst->in_dim != src->in_dim || dst->out_dim != src->out_dim || dst->rank != src->rank) return;

  const size_t nA = (size_t)dst->in_dim * (size_t)dst->rank;
  const size_t nB = (size_t)dst->rank * (size_t)dst->out_dim;

  for (size_t i = 0; i < nA; i++) dst->A[i] += w * src->A[i];
  for (size_t i = 0; i < nB; i++) dst->B[i] += w * src->B[i];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Build dy from probs — for language model notorch update
//
// Strategy:
//  - dy[target] += push
//  - find top competitors (largest probs except target) and push them down:
//      dy[comp] -= pull / K   (if K>0)
// ═══════════════════════════════════════════════════════════════════════════════

static int argmax_excluding(const float* probs, int n, int exclude) {
  int imax = (exclude == 0 ? 1 : 0);
  if (imax >= n) return -1;
  float pmax = probs[imax];
  for (int i = 0; i < n; i++) {
    if (i == exclude) continue;
    if (probs[i] > pmax) { pmax = probs[i]; imax = i; }
  }
  return imax;
}

// tiny top-K selection (K small): O(K*n)
static void topk_excluding(const float* probs, int n, int exclude, int K, int* out_idx) {
  // init with -1
  for (int k = 0; k < K; k++) out_idx[k] = -1;

  for (int i = 0; i < n; i++) {
    if (i == exclude) continue;

    // find insertion position among current K
    int pos = -1;
    for (int k = 0; k < K; k++) {
      int j = out_idx[k];
      if (j < 0 || probs[i] > probs[j]) { pos = k; break; }
    }
    if (pos < 0) continue;

    // shift down
    for (int k = K - 1; k > pos; k--) out_idx[k] = out_idx[k - 1];
    out_idx[pos] = i;
  }
}

void lora_build_dy_from_probs(
  float* dy_out,
  const float* probs,
  int out_dim,
  int target_id,
  float push,
  float pull,
  int topk
) {
  if (!dy_out || !probs || out_dim <= 0) return;
  if (target_id < 0 || target_id >= out_dim) return;

  lora_zero(dy_out, out_dim);

  // main push
  dy_out[target_id] += push;

  if (topk <= 0) {
    // simplest: suppress only the strongest competitor
    int comp = argmax_excluding(probs, out_dim, target_id);
    if (comp >= 0) dy_out[comp] -= pull;
    return;
  }

  // suppress top-K competitors
  int K = topk;
  if (K > LORA_MAX_TOPK) K = LORA_MAX_TOPK; // sanity cap
  int idx[LORA_MAX_TOPK];
  topk_excluding(probs, out_dim, target_id, K, idx);

  float each = (K > 0 ? (pull / (float)K) : pull);
  for (int k = 0; k < K; k++) {
    int j = idx[k];
    if (j >= 0) dy_out[j] -= each;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sparse Apply — for vocabulary-sized outputs
// Only applies LoRA delta to selected output indices
// Useful when you only need top candidates logits adjusted
// ═══════════════════════════════════════════════════════════════════════════════

void lora_apply_sparse(LoRA* L, const float* x, float* y, const int* idx, int m) {
  if (!L || !x || !y || !idx || m <= 0) return;

  const float scaling = L->alpha / (float)L->rank;

  // Ax = x^T * A  -> [rank]
  for (int r = 0; r < L->rank; r++) {
    float s = 0.0f;
    for (int i = 0; i < L->in_dim; i++) {
      s += x[i] * L->A[(size_t)i * (size_t)L->rank + (size_t)r];
    }
    L->Ax[r] = s;
  }

  // update only selected outputs
  for (int t = 0; t < m; t++) {
    int j = idx[t];
    if (j < 0 || j >= L->out_dim) continue;

    float s = 0.0f;
    size_t col = (size_t)j;
    for (int r = 0; r < L->rank; r++) {
      s += L->Ax[r] * L->B[(size_t)r * (size_t)L->out_dim + col];
    }
    y[j] += s * scaling;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Experience Step — one-call wrapper for notorch learning
// Builds dy from probs internally, then applies notch_step
// 
// This is the "breathing" interface: 
//   lung.forward() → probs
//   lora_experience_step(probs, target, signal) → personality update
// ═══════════════════════════════════════════════════════════════════════════════

void lora_experience_step(
  LoRA* L,
  const float* x,
  const float* probs,
  int target_id,
  float signal,
  float push,
  float pull,
  int topk
) {
  if (!L || !x || !probs) return;
  if (target_id < 0 || target_id >= L->out_dim) return;

  // Build dy from probs
  lora_build_dy_from_probs(L->dy, probs, L->out_dim, target_id, push, pull, topk);
  
  // Apply notorch step
  lora_notch_step(L, x, L->dy, signal);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility: Get total delta norm (for monitoring)
// ═══════════════════════════════════════════════════════════════════════════════

float lora_get_delta_norm(const LoRA* L) {
  if (!L) return 0.0f;
  
  float sum = 0.0f;
  const size_t nA = (size_t)L->in_dim * (size_t)L->rank;
  const size_t nB = (size_t)L->rank * (size_t)L->out_dim;
  
  for (size_t i = 0; i < nA; i++) sum += L->A[i] * L->A[i];
  for (size_t i = 0; i < nB; i++) sum += L->B[i] * L->B[i];
  
  return sqrtf(sum);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WASM-safe state copy (like am_copy_state)
// ═══════════════════════════════════════════════════════════════════════════════

int lora_copy_params(const LoRA* L, float* out7) {
  if (!L || !out7) return 1;
  out7[0] = (float)L->in_dim;
  out7[1] = (float)L->out_dim;
  out7[2] = (float)L->rank;
  out7[3] = L->alpha;
  out7[4] = L->lr;
  out7[5] = L->decay;
  out7[6] = lora_get_delta_norm(L);
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Additional patches (from GPT5.2 thinking follow-up)
// ═══════════════════════════════════════════════════════════════════════════════

// Get raw pointers to A and B for WASM direct memory access
// Useful for JS-side visualization or bulk operations
void lora_get_factor_ptrs(const LoRA* L, float** A_out, float** B_out, int* nA_out, int* nB_out) {
  if (!L) {
    if (A_out) *A_out = NULL;
    if (B_out) *B_out = NULL;
    if (nA_out) *nA_out = 0;
    if (nB_out) *nB_out = 0;
    return;
  }
  if (A_out) *A_out = L->A;
  if (B_out) *B_out = L->B;
  if (nA_out) *nA_out = L->in_dim * L->rank;
  if (nB_out) *nB_out = L->rank * L->out_dim;
}

// Set seed for deterministic testing
void lora_set_seed(LoRA* L, uint32_t seed) {
  if (L) L->seed = seed ? seed : 0xA17A11u;
}

// Clamp factors to prevent weight explosion (runaway learning)
// max_norm: if factor norm exceeds this, scale down
void lora_clamp_factors(LoRA* L, float max_norm) {
  if (!L || max_norm <= 0.0f) return;
  
  float norm = lora_get_delta_norm(L);
  if (norm > max_norm) {
    float scale = max_norm / norm;
    lora_scale(L, scale);
  }
}

// Get individual factor norms (for monitoring A vs B separately)
void lora_get_factor_norms(const LoRA* L, float* normA_out, float* normB_out) {
  if (!L) {
    if (normA_out) *normA_out = 0.0f;
    if (normB_out) *normB_out = 0.0f;
    return;
  }
  
  const size_t nA = (size_t)L->in_dim * (size_t)L->rank;
  const size_t nB = (size_t)L->rank * (size_t)L->out_dim;
  
  float sumA = 0.0f, sumB = 0.0f;
  for (size_t i = 0; i < nA; i++) sumA += L->A[i] * L->A[i];
  for (size_t i = 0; i < nB; i++) sumB += L->B[i] * L->B[i];
  
  if (normA_out) *normA_out = sqrtf(sumA);
  if (normB_out) *normB_out = sqrtf(sumB);
}

// Soft reset: scale down factors instead of zeroing (gradual forgetting)
void lora_soft_reset(LoRA* L, float keep_ratio) {
  if (!L) return;
  float k = LORA_CLAMP(keep_ratio, 0.0f, 1.0f);
  lora_scale(L, k);
}

// Apply with custom alpha (for interpolation/blending)
void lora_apply_alpha(LoRA* L, const float* x, float* y, float custom_alpha) {
  if (!L || !x || !y) return;

  const float scaling = custom_alpha / (float)L->rank;

  // Ax = x^T * A  -> [rank]
  for (int r = 0; r < L->rank; r++) {
    float s = 0.0f;
    for (int i = 0; i < L->in_dim; i++) {
      s += x[i] * L->A[(size_t)i * (size_t)L->rank + (size_t)r];
    }
    L->Ax[r] = s;
  }

  // add scaled output
  for (int j = 0; j < L->out_dim; j++) {
    float s = 0.0f;
    for (int r = 0; r < L->rank; r++) {
      s += L->Ax[r] * L->B[(size_t)r * (size_t)L->out_dim + (size_t)j];
    }
    y[j] += s * scaling;
  }
}

#ifdef __cplusplus
}
#endif
