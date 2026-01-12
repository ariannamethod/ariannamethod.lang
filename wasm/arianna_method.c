// arianna_method.c — Tiny Arianna Method DSL core (C)
// build: emcc arianna_method.c -O2 -s WASM=1 -s MODULARIZE=1 \
//   -s EXPORT_NAME="AriannaMethod" \
//   -s EXPORTED_FUNCTIONS='["_am_init","_am_exec","_am_get_state","_am_take_jump"]' \
//   -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
//   -o arianna_method.js
//
// "the oracle does not predict, it prophesies"

#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
  int   prophecy;           // prophecy horizon (steps ahead)
  float destiny;            // destiny bias 0..1
  float wormhole;           // wormhole probability 0..1
  float calendar_drift;     // e.g. 11.0 (hebrew-gregorian drift)
  float attend_focus;       // attention focus 0..1
  float attend_spread;      // attention spread 0..1
  float tunnel_threshold;   // dissonance gate for tunneling
  float tunnel_chance;      // probability when gated
  int   tunnel_skip_max;    // max steps to compress
  int   pending_jump;       // queued jump (sim steps)
  float pain;               // suffering field 0..1
  float tension;            // pressure buildup 0..1
  float dissonance;         // symmetry-break 0..1
} AM_State;

static AM_State G;

// ---------- helpers ----------

static char* trim(char* s) {
  while (*s && isspace((unsigned char)*s)) s++;
  char* e = s + strlen(s);
  while (e > s && isspace((unsigned char)e[-1])) e--;
  *e = 0;
  return s;
}

static void upcase(char* s) {
  for (; *s; s++) *s = (char)toupper((unsigned char)*s);
}

static float clamp01(float x) {
  if (x < 0.0f) return 0.0f;
  if (x > 1.0f) return 1.0f;
  return x;
}

static float clampf(float x, float a, float b) {
  if (x < a) return a;
  if (x > b) return b;
  return x;
}

static int safe_atoi(const char* s) {
  if (!s || !*s) return 0;
  char* endptr;
  long val = strtol(s, &endptr, 10);
  // clamp to int range to prevent overflow
  if (val > 2147483647L) return 2147483647;
  if (val < -2147483647L) return -2147483647;
  return (int)val;
}

static int clampi(int x, int a, int b) {
  if (x < a) return a;
  if (x > b) return b;
  return x;
}

// ---------- public API ----------

void am_init(void) {
  G.prophecy = 7;
  G.destiny = 0.35f;
  G.wormhole = 0.12f;
  G.calendar_drift = 11.0f;
  G.attend_focus = 0.70f;
  G.attend_spread = 0.20f;
  G.tunnel_threshold = 0.55f;
  G.tunnel_chance = 0.22f;
  G.tunnel_skip_max = 7;
  G.pending_jump = 0;
  G.pain = 0.0f;
  G.tension = 0.0f;
  G.dissonance = 0.0f;
}

// returns 0 ok, nonzero parse error
int am_exec(const char* script) {
  if (!script) return 1;

  // copy to mutable buffer
  size_t n = strlen(script);
  char* buf = (char*)malloc(n + 1);
  if (!buf) return 2;
  memcpy(buf, script, n + 1);

  // line by line
  char* save = NULL;
  for (char* line = strtok_r(buf, "\n", &save); line; line = strtok_r(NULL, "\n", &save)) {
    char* t = trim(line);
    if (*t == 0) continue;
    if (*t == '#') continue; // comment

    // split: CMD ARG
    char* sp = t;
    while (*sp && !isspace((unsigned char)*sp)) sp++;
    char* cmd_end = sp;
    while (*sp && isspace((unsigned char)*sp)) sp++;
    char* arg = sp;

    *cmd_end = 0;
    upcase(t);

    if (!strcmp(t, "PROPHECY")) {
      G.prophecy = clampi(safe_atoi(arg), 1, 64);
    } else if (!strcmp(t, "DESTINY")) {
      G.destiny = clamp01((float)atof(arg));
    } else if (!strcmp(t, "WORMHOLE")) {
      G.wormhole = clamp01((float)atof(arg));
    } else if (!strcmp(t, "CALENDAR_DRIFT")) {
      G.calendar_drift = (float)atof(arg);
    } else if (!strcmp(t, "ATTEND_FOCUS")) {
      G.attend_focus = clamp01((float)atof(arg));
    } else if (!strcmp(t, "ATTEND_SPREAD")) {
      G.attend_spread = clamp01((float)atof(arg));
    } else if (!strcmp(t, "TUNNEL_THRESHOLD")) {
      G.tunnel_threshold = clamp01((float)atof(arg));
    } else if (!strcmp(t, "TUNNEL_CHANCE")) {
      G.tunnel_chance = clamp01((float)atof(arg));
    } else if (!strcmp(t, "TUNNEL_SKIP_MAX")) {
      G.tunnel_skip_max = clampi(safe_atoi(arg), 1, 24);
    } else if (!strcmp(t, "JUMP")) {
      G.pending_jump = clampi(G.pending_jump + safe_atoi(arg), -1000, 1000);
    } else if (!strcmp(t, "PAIN")) {
      G.pain = clamp01((float)atof(arg));
    } else if (!strcmp(t, "TENSION")) {
      G.tension = clamp01((float)atof(arg));
    } else if (!strcmp(t, "DISSONANCE")) {
      G.dissonance = clamp01((float)atof(arg));
    }
    // unknown commands are ignored on purpose (for vibe / future expansion)
  }

  free(buf);
  return 0;
}

// exposes raw state pointer (WASM-friendly)
AM_State* am_get_state(void) {
  return &G;
}

// consume pending jump (returns queued jump, then clears)
int am_take_jump(void) {
  int j = G.pending_jump;
  G.pending_jump = 0;
  return j;
}

#ifdef __cplusplus
}
#endif
