// test_bridge.js — Tests for two-brain bridge (arianna.c ↔ body.c integration)
// "one brain sees walls, one feels rivers — together they dream"
//
// Run: node tests/test_bridge.js

import { Bridge, Signals, MoodRouter, Mood, MOOD_NAMES, MOOD_PROFILES, NUM_MOODS, UNIFORM_MIX_VALUE } from '../src/bridge.js';

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertClose(a, b, eps = 0.01, msg) {
  if (Math.abs(a - b) > eps) {
    throw new Error(msg || `Expected ${a} ≈ ${b} (diff: ${Math.abs(a - b)})`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock metrics and field for testing
// ═══════════════════════════════════════════════════════════════════════════════

function mockMetrics(overrides = {}) {
  return {
    arousal: 0.5,
    entropy: 2.0,
    tension: 0.5,
    resonanceField: 0.5,
    presencePulse: 0.5,
    dissonance: 0.5,
    ...overrides
  };
}

function mockField(overrides = {}) {
  return {
    cfg: {
      attendFocus: 0.7,
      chiralMemory: 0.0,
      ...overrides
    },
    model: {
      temporalAlpha: 0.5
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🧠 Bridge Tests (Two-Brain Integration)\n');
console.log('═'.repeat(60));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n1. Signals Extraction\n');
// ─────────────────────────────────────────────────────────────────────────────

test('Signals initializes with default values', () => {
  const sig = new Signals();
  assert(sig.arousal === 0.5, 'arousal should be 0.5');
  assert(sig.entropy === 0.5, 'entropy should be 0.5');
  assert(sig.tension === 0.5, 'tension should be 0.5');
});

test('Signals.fromMetrics extracts correctly', () => {
  const sig = new Signals();
  const metrics = mockMetrics({ arousal: 0.8, tension: 0.9 });
  const field = mockField();

  sig.fromMetrics(metrics, field);

  assert(sig.arousal === 0.8, 'arousal should be 0.8');
  assert(sig.tension === 0.9, 'tension should be 0.9');
});

test('Signals normalizes entropy to 0-1 range', () => {
  const sig = new Signals();
  const metrics = mockMetrics({ entropy: 4.0 });  // max entropy
  sig.fromMetrics(metrics, mockField());

  assert(sig.entropy === 1.0, 'entropy should normalize to 1.0');
});

test('Signals.toArray returns Float32Array', () => {
  const sig = new Signals();
  const arr = sig.toArray();

  assert(arr instanceof Float32Array, 'should be Float32Array');
  assert(arr.length === 8, 'should have 8 elements');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. Mood Router\n');
// ─────────────────────────────────────────────────────────────────────────────

test('MoodRouter initializes with uniform mix', () => {
  const router = new MoodRouter();

  assert(router.mix.length === NUM_MOODS, `should have ${NUM_MOODS} moods`);
  assertClose(router.mix[0], UNIFORM_MIX_VALUE, 0.001, 'mix should be uniform');
});

test('MoodRouter.route computes mix from signals', () => {
  const router = new MoodRouter();
  const sig = new Signals();
  sig.arousal = 1.0;
  sig.tension = 1.0;
  sig.entropy = 0.3;

  router.route(sig);

  // INTENSE mood should be activated by high arousal + tension
  assert(router.dominant !== undefined, 'should have dominant mood');
});

test('High arousal activates INTENSE mood', () => {
  const router = new MoodRouter(0.5);  // lower temperature = sharper
  const sig = new Signals();
  sig.arousal = 1.0;
  sig.tension = 1.0;

  // Run multiple times to overcome momentum
  for (let i = 0; i < 20; i++) router.route(sig);

  assert(router.dominant === Mood.INTENSE,
    `Expected INTENSE (${Mood.INTENSE}), got ${MOOD_NAMES[router.dominant]}`);
});

test('High entropy activates CREATIVE mood', () => {
  const router = new MoodRouter(0.5);
  const sig = new Signals();
  sig.entropy = 1.0;
  sig.novelty = 1.0;
  sig.arousal = 0.3;

  for (let i = 0; i < 20; i++) router.route(sig);

  assert(router.dominant === Mood.CREATIVE,
    `Expected CREATIVE (${Mood.CREATIVE}), got ${MOOD_NAMES[router.dominant]}`);
});

test('Low arousal excludes INTENSE mood', () => {
  const router = new MoodRouter(0.5);
  const sig = new Signals();
  sig.arousal = 0.0;
  sig.tension = 0.0;
  sig.entropy = 0.0;

  for (let i = 0; i < 20; i++) router.route(sig);

  // Low arousal should NOT activate INTENSE (which needs high arousal)
  assert(router.dominant !== Mood.INTENSE,
    `INTENSE should not activate with low arousal, got ${MOOD_NAMES[router.dominant]}`);
});

test('MoodRouter.getBlendedProfile returns valid profile', () => {
  const router = new MoodRouter();
  router.route(new Signals());

  const profile = router.getBlendedProfile();

  assert(profile.glowColor.length === 3, 'glowColor should have 3 components');
  assert(typeof profile.glowIntensity === 'number', 'glowIntensity should be number');
  assert(typeof profile.jitterMult === 'number', 'jitterMult should be number');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. Bridge Integration\n');
// ─────────────────────────────────────────────────────────────────────────────

test('Bridge creates successfully', () => {
  const bridge = new Bridge();
  assert(bridge.signals instanceof Signals, 'should have signals');
  assert(bridge.moodRouter instanceof MoodRouter, 'should have moodRouter');
});

test('Bridge.update processes metrics', () => {
  const bridge = new Bridge();
  const metrics = mockMetrics({ arousal: 0.9 });
  const field = mockField();

  bridge.update(metrics, field);

  assert(bridge.profile !== null, 'should have profile after update');
  assert(bridge.signals.arousal === 0.9, 'signals should reflect metrics');
});

test('Bridge.getVisualEffects returns valid FX', () => {
  const bridge = new Bridge();
  bridge.update(mockMetrics(), mockField());

  const fx = bridge.getVisualEffects();

  assert(fx.glowColor.length === 3, 'should have glowColor');
  assert(typeof fx.glowIntensity === 'number', 'should have glowIntensity');
  assert(typeof fx.jitterMult === 'number', 'should have jitterMult');
  assert(typeof fx.dominantMood === 'string', 'should have dominantMood name');
});

test('Bridge.getMoodDisplay returns string', () => {
  const bridge = new Bridge();
  bridge.update(mockMetrics(), mockField());

  const display = bridge.getMoodDisplay();

  assert(typeof display === 'string', 'should return string');
  assert(display.includes('['), 'should be formatted with brackets');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4. Mood Profiles\n');
// ─────────────────────────────────────────────────────────────────────────────

test('All 8 moods have profiles', () => {
  for (let m = 0; m < 8; m++) {
    assert(MOOD_PROFILES[m] !== undefined, `Mood ${m} should have profile`);
    assert(MOOD_PROFILES[m].glowColor, `Mood ${m} should have glowColor`);
  }
});

test('CREATIVE mood has rainbow flag', () => {
  assert(MOOD_PROFILES[Mood.CREATIVE].rainbow === true,
    'CREATIVE should have rainbow');
});

test('RECURSIVE mood has echo flag', () => {
  assert(MOOD_PROFILES[Mood.RECURSIVE].echo === true,
    'RECURSIVE should have echo');
});

test('LIMINAL mood has fog flag', () => {
  assert(MOOD_PROFILES[Mood.LIMINAL].fog === true,
    'LIMINAL should have fog');
});

test('RESONANT mood has pulse flag', () => {
  assert(MOOD_PROFILES[Mood.RESONANT].pulse === true,
    'RESONANT should have pulse');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ Some tests failed!\n');
  process.exit(1);
} else {
  console.log('✅ All bridge tests passed! Two brains connected.\n');
  console.log('   Signals: metrics → standardized signals ✓');
  console.log('   MoodRouter: signals → mood mix ✓');
  console.log('   Bridge: mood → visual effects ✓\n');
  process.exit(0);
}
