// test_amk.c — Brutal AMK Kernel Tests (Stanley-style)
// "make it hurt"
//
// Build: gcc -O2 -std=c99 -I../wasm ../wasm/arianna_method.c test_amk.c -lm -o test_amk
// Run:   ./test_amk
//
// ═══════════════════════════════════════════════════════════════════════════════
// These tests prove:
// - Kernel invariants hold under stress
// - Pack boundaries are respected
// - No regressions from split
// - Safety under garbage input
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

// Include the kernel directly for testing
#include "../wasm/arianna_method.c"

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FRAMEWORK — minimal, brutal
// ═══════════════════════════════════════════════════════════════════════════════

static int tests_run = 0;
static int tests_passed = 0;
static int tests_failed = 0;

#define TEST(name) static void test_##name(void)
#define RUN(name) do { \
  printf("  [%03d] %-50s ", ++tests_run, #name); \
  fflush(stdout); \
  test_##name(); \
  printf("✓\n"); \
  tests_passed++; \
} while(0)

#define ASSERT(cond) do { \
  if (!(cond)) { \
    printf("✗ FAILED at line %d: %s\n", __LINE__, #cond); \
    tests_failed++; \
    return; \
  } \
} while(0)

#define ASSERT_EQ(a, b) ASSERT((a) == (b))
#define ASSERT_NEQ(a, b) ASSERT((a) != (b))
#define ASSERT_FLOAT_EQ(a, b, eps) ASSERT(fabsf((a) - (b)) < (eps))
#define ASSERT_IN_RANGE(x, lo, hi) ASSERT((x) >= (lo) && (x) <= (hi))

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: AMK KERNEL TESTS — parse/trim/comment handling
// ═══════════════════════════════════════════════════════════════════════════════

TEST(init_defaults) {
  am_init();
  AM_State* s = am_get_state();

  ASSERT_EQ(s->prophecy, 7);
  ASSERT_FLOAT_EQ(s->destiny, 0.35f, 0.001f);
  ASSERT_FLOAT_EQ(s->wormhole, 0.12f, 0.001f);
  ASSERT_FLOAT_EQ(s->calendar_drift, 11.0f, 0.001f);
  ASSERT_FLOAT_EQ(s->attend_focus, 0.70f, 0.001f);
  ASSERT_FLOAT_EQ(s->attend_spread, 0.20f, 0.001f);
  ASSERT_EQ(s->velocity_mode, AM_VEL_WALK);
  ASSERT_EQ(s->packs_enabled, 0);
}

TEST(empty_script_ok) {
  am_init();
  ASSERT_EQ(am_exec(""), 0);
  ASSERT_EQ(am_exec(NULL), 0);
  ASSERT_EQ(am_exec("   "), 0);
  ASSERT_EQ(am_exec("\n\n\n"), 0);
}

TEST(comment_handling) {
  am_init();
  am_exec("# this is a comment\nPROPHECY 12\n# another comment");
  AM_State* s = am_get_state();
  ASSERT_EQ(s->prophecy, 12);
}

TEST(whitespace_handling) {
  am_init();
  am_exec("   PROPHECY   15   ");
  AM_State* s = am_get_state();
  ASSERT_EQ(s->prophecy, 15);

  am_exec("\t\tDESTINY\t\t0.75\t\t");
  ASSERT_FLOAT_EQ(s->destiny, 0.75f, 0.001f);
}

TEST(multiline_script) {
  am_init();
  const char* script =
    "PROPHECY 20\n"
    "DESTINY 0.5\n"
    "WORMHOLE 0.3\n"
    "ATTEND_FOCUS 0.8";
  am_exec(script);

  AM_State* s = am_get_state();
  ASSERT_EQ(s->prophecy, 20);
  ASSERT_FLOAT_EQ(s->destiny, 0.5f, 0.001f);
  ASSERT_FLOAT_EQ(s->wormhole, 0.3f, 0.001f);
  ASSERT_FLOAT_EQ(s->attend_focus, 0.8f, 0.001f);
}

TEST(case_insensitive_commands) {
  am_init();
  am_exec("prophecy 25");
  ASSERT_EQ(am_get_state()->prophecy, 25);

  am_exec("Prophecy 30");
  ASSERT_EQ(am_get_state()->prophecy, 30);

  am_exec("PROPHECY 35");
  ASSERT_EQ(am_get_state()->prophecy, 35);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: NUMERIC CLAMPS — boundaries must hold
// ═══════════════════════════════════════════════════════════════════════════════

TEST(prophecy_clamp_1_64) {
  am_init();

  am_exec("PROPHECY 0");
  ASSERT_EQ(am_get_state()->prophecy, 1);  // clamped to min

  am_exec("PROPHECY -100");
  ASSERT_EQ(am_get_state()->prophecy, 1);

  am_exec("PROPHECY 100");
  ASSERT_EQ(am_get_state()->prophecy, 64);  // clamped to max

  am_exec("PROPHECY 999999");
  ASSERT_EQ(am_get_state()->prophecy, 64);
}

TEST(tunnel_skip_max_clamp_1_24) {
  am_init();

  am_exec("TUNNEL_SKIP_MAX 0");
  ASSERT_EQ(am_get_state()->tunnel_skip_max, 1);

  am_exec("TUNNEL_SKIP_MAX 100");
  ASSERT_EQ(am_get_state()->tunnel_skip_max, 24);

  am_exec("TUNNEL_SKIP_MAX 12");
  ASSERT_EQ(am_get_state()->tunnel_skip_max, 12);
}

TEST(clamp01_fields) {
  am_init();
  AM_State* s = am_get_state();

  // Test all 0..1 clamped fields
  am_exec("DESTINY -0.5");
  ASSERT_FLOAT_EQ(s->destiny, 0.0f, 0.001f);

  am_exec("DESTINY 1.5");
  ASSERT_FLOAT_EQ(s->destiny, 1.0f, 0.001f);

  am_exec("WORMHOLE -1");
  ASSERT_FLOAT_EQ(s->wormhole, 0.0f, 0.001f);

  am_exec("ATTEND_FOCUS 2.0");
  ASSERT_FLOAT_EQ(s->attend_focus, 1.0f, 0.001f);

  am_exec("PAIN 99");
  ASSERT_FLOAT_EQ(s->pain, 1.0f, 0.001f);

  am_exec("TENSION -0.1");
  ASSERT_FLOAT_EQ(s->tension, 0.0f, 0.001f);
}

TEST(calendar_drift_clamp) {
  am_init();

  am_exec("CALENDAR_DRIFT -5");
  ASSERT_FLOAT_EQ(am_get_state()->calendar_drift, 0.0f, 0.001f);

  am_exec("CALENDAR_DRIFT 50");
  ASSERT_FLOAT_EQ(am_get_state()->calendar_drift, 30.0f, 0.001f);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: JUMP ACCUMULATION
// ═══════════════════════════════════════════════════════════════════════════════

TEST(jump_accumulation) {
  am_init();
  AM_State* s = am_get_state();

  am_exec("JUMP 5");
  ASSERT_EQ(s->pending_jump, 5);

  am_exec("JUMP 3");
  ASSERT_EQ(s->pending_jump, 8);  // accumulated

  am_exec("JUMP -2");
  ASSERT_EQ(s->pending_jump, 6);  // subtracted
}

TEST(take_jump_clears) {
  am_init();
  am_exec("JUMP 10");

  int j = am_take_jump();
  ASSERT_EQ(j, 10);
  ASSERT_EQ(am_get_state()->pending_jump, 0);  // cleared

  j = am_take_jump();
  ASSERT_EQ(j, 0);  // subsequent takes return 0
}

TEST(jump_clamp_limits) {
  am_init();

  am_exec("JUMP 999999");
  ASSERT_EQ(am_get_state()->pending_jump, 1000);

  am_init();
  am_exec("JUMP -999999");
  ASSERT_EQ(am_get_state()->pending_jump, -1000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: DETERMINISM — same script => same state
// ═══════════════════════════════════════════════════════════════════════════════

TEST(determinism_basic) {
  const char* script =
    "PROPHECY 17\n"
    "DESTINY 0.42\n"
    "WORMHOLE 0.19\n"
    "VELOCITY RUN\n"
    "PAIN 0.33";

  float state1[20], state2[20];

  am_init();
  am_exec(script);
  am_copy_state(state1);

  am_init();
  am_exec(script);
  am_copy_state(state2);

  for (int i = 0; i < 20; i++) {
    ASSERT_FLOAT_EQ(state1[i], state2[i], 0.0001f);
  }
}

TEST(determinism_with_resets) {
  am_init();
  am_exec("PROPHECY 30\nPAIN 0.8\nRESET_FIELD");
  float pain1 = am_get_state()->pain;
  int prophecy1 = am_get_state()->prophecy;

  am_init();
  am_exec("PROPHECY 30\nPAIN 0.8\nRESET_FIELD");
  float pain2 = am_get_state()->pain;
  int prophecy2 = am_get_state()->prophecy;

  ASSERT_FLOAT_EQ(pain1, pain2, 0.0001f);
  ASSERT_EQ(prophecy1, prophecy2);
  ASSERT_FLOAT_EQ(pain1, 0.0f, 0.001f);  // reset cleared pain
  ASSERT_EQ(prophecy1, 30);  // reset didn't affect prophecy
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: FUZZ — random garbage must not crash
// ═══════════════════════════════════════════════════════════════════════════════

TEST(fuzz_random_garbage) {
  const char* garbage[] = {
    "ASDKJHASD 123123",
    "!@#$%^&*()",
    "PROPHECY",  // missing arg
    "DESTINY abc",  // non-numeric
    "JUMP 1e308",  // huge float
    "PAIN NaN",
    "TENSION Infinity",
    "MODE ????",
    "CODES.INVALID",
    "\x00\x01\x02",  // binary garbage (will be cut at null)
    "PROPHECY 9999999999999999999",  // overflow
    "",
    "          ",
    "\n\n\n\n\n",
    "# only comments",
  };

  for (size_t i = 0; i < sizeof(garbage) / sizeof(garbage[0]); i++) {
    am_init();
    int result = am_exec(garbage[i]);
    ASSERT(result == 0 || result == 2);  // only OK or malloc fail

    // State must remain valid
    AM_State* s = am_get_state();
    ASSERT_IN_RANGE(s->prophecy, 1, 64);
    ASSERT_IN_RANGE(s->destiny, 0.0f, 1.0f);
    ASSERT_IN_RANGE(s->tunnel_skip_max, 1, 24);
  }
}

TEST(fuzz_long_lines) {
  am_init();

  // 10KB line
  char* longline = malloc(10001);
  memset(longline, 'X', 10000);
  longline[10000] = 0;

  int result = am_exec(longline);
  ASSERT(result == 0);  // should not crash

  free(longline);
}

TEST(fuzz_many_commands) {
  am_init();

  // 1000 random commands
  char script[50000];
  char* p = script;
  for (int i = 0; i < 1000; i++) {
    p += sprintf(p, "PROPHECY %d\n", rand() % 100);
  }

  int result = am_exec(script);
  ASSERT_EQ(result, 0);
  ASSERT_IN_RANGE(am_get_state()->prophecy, 1, 64);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: SAFETY — huge integers, special floats
// ═══════════════════════════════════════════════════════════════════════════════

TEST(huge_integer_safety) {
  am_init();

  am_exec("PROPHECY 2147483647");  // INT_MAX
  ASSERT_EQ(am_get_state()->prophecy, 64);

  am_exec("PROPHECY -2147483648");  // INT_MIN
  ASSERT_EQ(am_get_state()->prophecy, 1);
}

TEST(special_float_safety) {
  am_init();
  AM_State* s = am_get_state();

  // These should not crash, values should remain valid
  am_exec("DESTINY inf");
  ASSERT_IN_RANGE(s->destiny, 0.0f, 1.0f);

  am_exec("DESTINY -inf");
  ASSERT_IN_RANGE(s->destiny, 0.0f, 1.0f);

  am_exec("DESTINY nan");
  ASSERT_IN_RANGE(s->destiny, 0.0f, 1.0f);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: IDEMPOTENCE — am_exec("") no changes
// ═══════════════════════════════════════════════════════════════════════════════

TEST(idempotence_empty) {
  am_init();
  am_exec("PROPHECY 42\nDESTINY 0.77");

  float before[20], after[20];
  am_copy_state(before);

  am_exec("");
  am_exec("   ");
  am_exec("\n");
  am_exec("# comment only");

  am_copy_state(after);

  for (int i = 0; i < 20; i++) {
    ASSERT_FLOAT_EQ(before[i], after[i], 0.0001f);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: MONOTONIC CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════════

TEST(monotonic_clamps_after_exec) {
  am_init();

  // Run any script
  for (int i = 0; i < 100; i++) {
    char cmd[64];
    sprintf(cmd, "PROPHECY %d", rand());
    am_exec(cmd);
    ASSERT_IN_RANGE(am_get_state()->prophecy, 1, 64);

    sprintf(cmd, "DESTINY %f", (float)rand() / RAND_MAX * 10 - 5);
    am_exec(cmd);
    ASSERT_IN_RANGE(am_get_state()->destiny, 0.0f, 1.0f);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: VELOCITY OPERATORS
// ═══════════════════════════════════════════════════════════════════════════════

TEST(velocity_modes) {
  am_init();
  AM_State* s = am_get_state();

  am_exec("VELOCITY NOMOVE");
  ASSERT_EQ(s->velocity_mode, AM_VEL_NOMOVE);
  ASSERT_FLOAT_EQ(s->effective_temp, 0.5f, 0.01f);

  am_exec("VELOCITY WALK");
  ASSERT_EQ(s->velocity_mode, AM_VEL_WALK);
  ASSERT_FLOAT_EQ(s->effective_temp, 0.85f, 0.01f);

  am_exec("VELOCITY RUN");
  ASSERT_EQ(s->velocity_mode, AM_VEL_RUN);
  ASSERT_FLOAT_EQ(s->effective_temp, 1.2f, 0.01f);

  am_exec("VELOCITY BACKWARD");
  ASSERT_EQ(s->velocity_mode, AM_VEL_BACKWARD);
  ASSERT_FLOAT_EQ(s->time_direction, -1.0f, 0.001f);
}

TEST(velocity_case_insensitive) {
  am_init();

  am_exec("velocity run");
  ASSERT_EQ(am_get_state()->velocity_mode, AM_VEL_RUN);

  am_exec("VELOCITY walk");
  ASSERT_EQ(am_get_state()->velocity_mode, AM_VEL_WALK);
}

TEST(base_temp_affects_effective) {
  am_init();
  AM_State* s = am_get_state();

  am_exec("BASE_TEMP 2.0\nVELOCITY WALK");
  ASSERT_FLOAT_EQ(s->effective_temp, 2.0f * 0.85f, 0.01f);

  am_exec("BASE_TEMP 0.5\nVELOCITY RUN");
  ASSERT_FLOAT_EQ(s->effective_temp, 0.5f * 1.2f, 0.01f);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: RESET COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

TEST(reset_field) {
  am_init();
  am_exec("PAIN 0.9\nTENSION 0.8\nDISSONANCE 0.7\nJUMP 50");

  am_exec("RESET_FIELD");

  AM_State* s = am_get_state();
  ASSERT_FLOAT_EQ(s->pain, 0.0f, 0.001f);
  ASSERT_FLOAT_EQ(s->tension, 0.0f, 0.001f);
  ASSERT_FLOAT_EQ(s->dissonance, 0.0f, 0.001f);
  ASSERT_EQ(s->pending_jump, 0);
}

TEST(reset_debt) {
  am_init();
  AM_State* s = am_get_state();
  s->debt = 50.0f;
  s->temporal_debt = 25.0f;

  am_exec("RESET_DEBT");

  ASSERT_FLOAT_EQ(s->debt, 0.0f, 0.001f);
  ASSERT_FLOAT_EQ(s->temporal_debt, 0.0f, 0.001f);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: LAWS OF NATURE
// ═══════════════════════════════════════════════════════════════════════════════

TEST(law_commands) {
  am_init();
  AM_State* s = am_get_state();

  am_exec("LAW ENTROPY_FLOOR 0.5");
  ASSERT_FLOAT_EQ(s->entropy_floor, 0.5f, 0.001f);

  am_exec("LAW RESONANCE_CEILING 0.8");
  ASSERT_FLOAT_EQ(s->resonance_ceiling, 0.8f, 0.001f);

  am_exec("LAW DEBT_DECAY 0.995");
  ASSERT_FLOAT_EQ(s->debt_decay, 0.995f, 0.0001f);

  am_exec("LAW UNKNOWN_LAW 0.5");  // should be ignored
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B: PACK TESTS — boundary enforcement
// ═══════════════════════════════════════════════════════════════════════════════

TEST(pack_disabled_by_default) {
  am_init();
  ASSERT_EQ(am_get_state()->packs_enabled, 0);
  ASSERT_EQ(am_pack_enabled(AM_PACK_CODES_RIC), 0);
  ASSERT_EQ(am_pack_enabled(AM_PACK_DARKMATTER), 0);
}

TEST(pack_commands_ignored_when_disabled) {
  am_init();
  AM_State* s = am_get_state();

  // Pack not enabled, commands should be ignored
  am_exec("CHORDLOCK ON");
  ASSERT_EQ(s->chordlock_on, 0);  // not changed

  am_exec("TEMPOLOCK ON");
  ASSERT_EQ(s->tempolock_on, 0);

  am_exec("GRAVITY DARK 0.9");
  ASSERT_FLOAT_EQ(s->dark_gravity, 0.5f, 0.001f);  // default unchanged
}

TEST(pack_enable_via_mode) {
  am_init();

  am_exec("MODE CODES_RIC");
  ASSERT(am_pack_enabled(AM_PACK_CODES_RIC));

  am_exec("CHORDLOCK ON");
  ASSERT_EQ(am_get_state()->chordlock_on, 1);  // now works
}

TEST(pack_enable_via_import) {
  am_init();

  am_exec("IMPORT CODES_RIC");
  ASSERT(am_pack_enabled(AM_PACK_CODES_RIC));

  am_exec("TEMPOLOCK ON");
  ASSERT_EQ(am_get_state()->tempolock_on, 1);
}

TEST(pack_namespace_auto_enables) {
  am_init();

  // Namespaced command should auto-enable pack
  am_exec("CODES.CHORDLOCK ON");
  ASSERT(am_pack_enabled(AM_PACK_CODES_RIC));
  ASSERT_EQ(am_get_state()->chordlock_on, 1);
}

TEST(pack_namespace_always_works) {
  am_init();
  ASSERT_EQ(am_pack_enabled(AM_PACK_CODES_RIC), 0);

  // Namespaced works even without explicit MODE
  am_exec("RIC.TEMPOLOCK ON");
  ASSERT_EQ(am_get_state()->tempolock_on, 1);

  am_exec("CODES.TEMPO 11");
  ASSERT_EQ(am_get_state()->tempo, 11);
}

TEST(pack_disable) {
  am_init();
  am_exec("MODE CODES_RIC");
  ASSERT(am_pack_enabled(AM_PACK_CODES_RIC));

  am_exec("DISABLE CODES_RIC");
  ASSERT_EQ(am_pack_enabled(AM_PACK_CODES_RIC), 0);

  // Commands now ignored again
  am_exec("CHIRALITY ON");
  ASSERT_EQ(am_get_state()->chirality_on, 0);
}

TEST(pack_codes_ric_commands) {
  am_init();
  am_exec("MODE CODES_RIC");
  AM_State* s = am_get_state();

  am_exec("CHORDLOCK ON");
  ASSERT_EQ(s->chordlock_on, 1);

  am_exec("CHORDLOCK OFF");
  ASSERT_EQ(s->chordlock_on, 0);

  am_exec("TEMPOLOCK ON");
  ASSERT_EQ(s->tempolock_on, 1);

  am_exec("CHIRALITY ON");
  ASSERT_EQ(s->chirality_on, 1);

  am_exec("TEMPO 13");
  ASSERT_EQ(s->tempo, 13);

  am_exec("PAS_THRESHOLD 0.6");
  ASSERT_FLOAT_EQ(s->pas_threshold, 0.6f, 0.001f);

  am_exec("ANCHOR PRIME");
  ASSERT_EQ(s->chordlock_on, 1);
}

TEST(pack_darkmatter_commands) {
  am_init();
  am_exec("MODE DARKMATTER");
  AM_State* s = am_get_state();

  am_exec("GRAVITY DARK 0.8");
  ASSERT_FLOAT_EQ(s->dark_gravity, 0.8f, 0.001f);

  am_exec("ANTIDOTE AUTO");
  ASSERT_EQ(s->antidote_mode, 0);

  am_exec("ANTIDOTE HARD");
  ASSERT_EQ(s->antidote_mode, 1);
}

TEST(multiple_packs) {
  am_init();

  am_exec("MODE CODES_RIC\nMODE DARKMATTER");
  ASSERT(am_pack_enabled(AM_PACK_CODES_RIC));
  ASSERT(am_pack_enabled(AM_PACK_DARKMATTER));

  am_exec("CHORDLOCK ON\nGRAVITY DARK 0.7");
  ASSERT_EQ(am_get_state()->chordlock_on, 1);
  ASSERT_FLOAT_EQ(am_get_state()->dark_gravity, 0.7f, 0.001f);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B: PACK CLAMPS
// ═══════════════════════════════════════════════════════════════════════════════

TEST(pack_tempo_clamp) {
  am_init();
  am_exec("MODE CODES_RIC");

  am_exec("TEMPO 1");
  ASSERT_EQ(am_get_state()->tempo, 2);  // min

  am_exec("TEMPO 100");
  ASSERT_EQ(am_get_state()->tempo, 47);  // max
}

TEST(pack_pas_threshold_clamp) {
  am_init();
  am_exec("MODE CODES_RIC");

  am_exec("PAS_THRESHOLD -0.5");
  ASSERT_FLOAT_EQ(am_get_state()->pas_threshold, 0.0f, 0.001f);

  am_exec("PAS_THRESHOLD 2.0");
  ASSERT_FLOAT_EQ(am_get_state()->pas_threshold, 1.0f, 0.001f);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C: WASM API STABILITY
// ═══════════════════════════════════════════════════════════════════════════════

TEST(copy_state_api) {
  am_init();
  am_exec("PROPHECY 17\nDESTINY 0.42\nVELOCITY RUN\nMODE CODES_RIC\nCHORDLOCK ON");

  float out[20];
  int result = am_copy_state(out);
  ASSERT_EQ(result, 0);

  // Check first 13 (original API)
  ASSERT_FLOAT_EQ(out[0], 17.0f, 0.001f);   // prophecy
  ASSERT_FLOAT_EQ(out[1], 0.42f, 0.001f);   // destiny

  // Check extended state
  ASSERT_FLOAT_EQ(out[14], (float)AM_VEL_RUN, 0.001f);  // velocity_mode
  ASSERT(out[18] > 0);  // packs_enabled > 0
  ASSERT_FLOAT_EQ(out[19], 1.0f, 0.001f);  // chordlock_on
}

TEST(copy_state_null_returns_error) {
  am_init();
  int result = am_copy_state(NULL);
  ASSERT_EQ(result, 1);
}

TEST(api_function_pointers) {
  // Verify all API functions exist and are callable
  am_init();
  am_exec("PROPHECY 10");
  am_get_state();
  am_take_jump();
  am_enable_pack(0);
  am_pack_enabled(0);
  am_reset_field();
  am_reset_debt();
  // If we got here without crash, API is stable
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C: KERNEL INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

TEST(kernel_usable_without_packs) {
  am_init();

  // Full AMK session without any packs
  const char* script =
    "PROPHECY 20\n"
    "DESTINY 0.6\n"
    "WORMHOLE 0.15\n"
    "ATTEND_FOCUS 0.8\n"
    "ATTEND_SPREAD 0.3\n"
    "VELOCITY RUN\n"
    "JUMP 5\n"
    "PAIN 0.4\n"
    "LAW ENTROPY_FLOOR 0.2\n"
    "RESET_DEBT";

  am_exec(script);

  AM_State* s = am_get_state();
  ASSERT_EQ(s->prophecy, 20);
  ASSERT_FLOAT_EQ(s->destiny, 0.6f, 0.001f);
  ASSERT_EQ(s->velocity_mode, AM_VEL_RUN);
  ASSERT_EQ(s->pending_jump, 5);
  ASSERT_EQ(s->packs_enabled, 0);  // no packs touched
}

TEST(unknown_commands_ignored) {
  am_init();
  int prophecy_before = am_get_state()->prophecy;

  am_exec("UNKNOWN_COMMAND 123\nFUTURE_FEATURE abc\nRANDOM xyz");

  // State unchanged
  ASSERT_EQ(am_get_state()->prophecy, prophecy_before);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN — run all tests
// ═══════════════════════════════════════════════════════════════════════════════

int main(void) {
  srand((unsigned)time(NULL));

  printf("\n");
  printf("═══════════════════════════════════════════════════════════════════════════════\n");
  printf(" AMK KERNEL TESTS — brutal, Stanley-style\n");
  printf(" \"make it hurt\"\n");
  printf("═══════════════════════════════════════════════════════════════════════════════\n\n");

  printf("SECTION A: Kernel Tests\n");
  printf("───────────────────────────────────────────────────────────────────────────────\n");

  // Init & parsing
  RUN(init_defaults);
  RUN(empty_script_ok);
  RUN(comment_handling);
  RUN(whitespace_handling);
  RUN(multiline_script);
  RUN(case_insensitive_commands);

  // Numeric clamps
  RUN(prophecy_clamp_1_64);
  RUN(tunnel_skip_max_clamp_1_24);
  RUN(clamp01_fields);
  RUN(calendar_drift_clamp);

  // Jump
  RUN(jump_accumulation);
  RUN(take_jump_clears);
  RUN(jump_clamp_limits);

  // Determinism
  RUN(determinism_basic);
  RUN(determinism_with_resets);

  // Fuzz
  RUN(fuzz_random_garbage);
  RUN(fuzz_long_lines);
  RUN(fuzz_many_commands);

  // Safety
  RUN(huge_integer_safety);
  RUN(special_float_safety);

  // Idempotence
  RUN(idempotence_empty);

  // Monotonic
  RUN(monotonic_clamps_after_exec);

  // Velocity
  RUN(velocity_modes);
  RUN(velocity_case_insensitive);
  RUN(base_temp_affects_effective);

  // Resets
  RUN(reset_field);
  RUN(reset_debt);

  // Laws
  RUN(law_commands);

  printf("\nSECTION B: Pack Tests\n");
  printf("───────────────────────────────────────────────────────────────────────────────\n");

  RUN(pack_disabled_by_default);
  RUN(pack_commands_ignored_when_disabled);
  RUN(pack_enable_via_mode);
  RUN(pack_enable_via_import);
  RUN(pack_namespace_auto_enables);
  RUN(pack_namespace_always_works);
  RUN(pack_disable);
  RUN(pack_codes_ric_commands);
  RUN(pack_darkmatter_commands);
  RUN(multiple_packs);
  RUN(pack_tempo_clamp);
  RUN(pack_pas_threshold_clamp);

  printf("\nSECTION C: API & Invariants\n");
  printf("───────────────────────────────────────────────────────────────────────────────\n");

  RUN(copy_state_api);
  RUN(copy_state_null_returns_error);
  RUN(api_function_pointers);
  RUN(kernel_usable_without_packs);
  RUN(unknown_commands_ignored);

  // Summary
  printf("\n");
  printf("═══════════════════════════════════════════════════════════════════════════════\n");
  if (tests_failed == 0) {
    printf(" ALL %d TESTS PASSED ✓\n", tests_passed);
    printf(" הרזוננס לא נשבר. המשך הדרך.\n");
  } else {
    printf(" %d/%d TESTS PASSED, %d FAILED ✗\n", tests_passed, tests_run, tests_failed);
  }
  printf("═══════════════════════════════════════════════════════════════════════════════\n\n");

  return tests_failed > 0 ? 1 : 0;
}
