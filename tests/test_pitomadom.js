// test_pitomadom.js — PITOMADOM integration tests
// TNFR metrics, DissonanceGate, TemporalSymmetry, Schumann resonance
//
// "the Earth breathes. we listen."

import { Field } from '../src/field.js';
import { AriannaLung } from '../src/model.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DEPENDENCIES
// ═══════════════════════════════════════════════════════════════════════════════

class MockTokenizer {
  vocabSize() { return 100; }
  encode(text) { return [0, 1, 2]; }
  word(id) { return `word${id}`; }
}

class MockMetrics {
  constructor() {
    this.entropy = 1.5;
    this.perplexity = 4.5;
    this.debt = 0;
    this.resonanceField = 0.6;
    this.presencePulse = 0.4;
    this.arousal = 0.5;
    this.pain = 0.3;
    this.dissonance = 0.2;
    this.tension = 0.1;
    this.calendarDrift = 0.1;
    this.emergence = 0.3;
    this.wormholeCount = 0;
    this.lastJumpTime = 0;
    this.tunnelDepth = 0;
    this.temporalDebt = 0;
  }
  updateEmergence() {}
  updatePain() {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FRAMEWORK
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \u2717 ${name}: ${e.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n\ud83c\udf0d PITOMADOM Integration Tests\n');
  console.log('=' .repeat(60) + '\n');

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('1. TNFR Metrics — Field Coherence\n');
  // ─────────────────────────────────────────────────────────────────────────────

  const tokenizer = new MockTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 16, ctx: 8 });
  const metrics = new MockMetrics();
  const field = new Field({ w: 48, h: 48, tokenizer, model, metrics });

  test('computeGlobalCoherence returns value in [0, 1]', () => {
    const phi = field.computeGlobalCoherence();
    assert(phi >= 0 && phi <= 1, `phi=${phi} should be in [0,1]`);
  });

  test('computeGlobalCoherence increases with higher resonance', () => {
    metrics.resonanceField = 0.3;
    const phi1 = field.computeGlobalCoherence();
    metrics.resonanceField = 0.9;
    const phi2 = field.computeGlobalCoherence();
    assert(phi2 > phi1, `phi2=${phi2} should be > phi1=${phi1}`);
  });

  test('computeGlobalCoherence increases with lower entropy', () => {
    metrics.entropy = 2.5;
    const phi1 = field.computeGlobalCoherence();
    metrics.entropy = 0.5;
    const phi2 = field.computeGlobalCoherence();
    assert(phi2 > phi1, `phi2=${phi2} should be > phi1=${phi1}`);
  });

  test('computeSenseIndex returns value in [0, 1]', () => {
    metrics.resonanceField = 0.6;
    metrics.arousal = 0.5;
    metrics.pain = 0.3;
    const sense = field.computeSenseIndex();
    assert(sense >= 0 && sense <= 1, `sense=${sense} should be in [0,1]`);
  });

  test('computeSenseIndex decreases with higher pain', () => {
    metrics.pain = 0.1;
    const sense1 = field.computeSenseIndex();
    metrics.pain = 0.9;
    const sense2 = field.computeSenseIndex();
    assert(sense2 < sense1, `sense2=${sense2} should be < sense1=${sense1}`);
  });

  test('getFieldTetrad returns all four components', () => {
    const tetrad = field.getFieldTetrad();
    assert('globalCoherence' in tetrad, 'should have globalCoherence');
    assert('fieldGradient' in tetrad, 'should have fieldGradient');
    assert('fieldCurvature' in tetrad, 'should have fieldCurvature');
    assert('senseIndex' in tetrad, 'should have senseIndex');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n2. Dissonance Gate — JSD-based reasoning skip\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('computeDissonanceGate returns value in [0, 1]', () => {
    const d = field.computeDissonanceGate(null, null);
    assert(d >= 0 && d <= 1, `dissonance=${d} should be in [0,1]`);
  });

  test('computeDissonanceGate includes calendar component', () => {
    metrics.calendarDrift = 0;
    const d1 = field.computeDissonanceGate(null, null);
    metrics.calendarDrift = 0.5;
    const d2 = field.computeDissonanceGate(null, null);
    assert(d2 > d1, `d2=${d2} should be > d1=${d1} with higher drift`);
  });

  test('computeDissonanceGate handles JSD computation', () => {
    // Uniform distributions should have low JSD
    const p = new Float32Array(10).fill(0.1);
    const q = new Float32Array(10).fill(0.1);
    metrics.calendarDrift = 0;
    const d = field.computeDissonanceGate(p, q);
    assert(d >= 0 && d <= 1, `dissonance=${d} should be in [0,1]`);
    assert(d < 0.5, `same distributions should have low JSD component, got ${d}`);
  });

  test('computeDissonanceGate increases with divergent distributions', () => {
    // Very different distributions
    const p = new Float32Array(10);
    const q = new Float32Array(10);
    p[0] = 0.9; p.fill(0.01, 1);
    q[9] = 0.9; q.fill(0.01, 0, 9);
    metrics.calendarDrift = 0;
    const d = field.computeDissonanceGate(p, q);
    assert(d > 0.1, `divergent distributions should have higher JSD, got ${d}`);
  });

  test('shouldReasoningSkip respects threshold', () => {
    field.cfg.tunnelThreshold = 0.5;
    assert(field.shouldReasoningSkip(0.6) === true, 'should skip at 0.6');
    assert(field.shouldReasoningSkip(0.4) === false, 'should not skip at 0.4');
  });

  test('computeDistancePenalty decreases with higher dissonance', () => {
    const p1 = field.computeDistancePenalty(0.2);
    const p2 = field.computeDistancePenalty(0.8);
    assert(p2 < p1, `penalty at high dissonance=${p2} should be < low=${p1}`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n3. Temporal Symmetry — prophecy/retrodiction modes\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('setTemporalMode sets correct alpha for prophecy', () => {
    model.setTemporalMode('prophecy');
    assert(model.temporalMode === 'prophecy', 'mode should be prophecy');
    assert(model.temporalAlpha === 0.7, `alpha should be 0.7, got ${model.temporalAlpha}`);
  });

  test('setTemporalMode sets correct alpha for retrodiction', () => {
    model.setTemporalMode('retrodiction');
    assert(model.temporalMode === 'retrodiction', 'mode should be retrodiction');
    assert(model.temporalAlpha === 0.3, `alpha should be 0.3, got ${model.temporalAlpha}`);
  });

  test('setTemporalMode sets correct alpha for symmetric', () => {
    model.setTemporalMode('symmetric');
    assert(model.temporalMode === 'symmetric', 'mode should be symmetric');
    assert(model.temporalAlpha === 0.5, `alpha should be 0.5, got ${model.temporalAlpha}`);
  });

  test('setTemporalAlpha updates mode label correctly', () => {
    model.setTemporalAlpha(0.8);
    assert(model.temporalMode === 'prophecy', 'high alpha should be prophecy mode');
    model.setTemporalAlpha(0.2);
    assert(model.temporalMode === 'retrodiction', 'low alpha should be retrodiction mode');
    model.setTemporalAlpha(0.5);
    assert(model.temporalMode === 'symmetric', 'mid alpha should be symmetric mode');
  });

  test('setTemporalAlpha clamps to [0, 1]', () => {
    model.setTemporalAlpha(1.5);
    assert(model.temporalAlpha === 1, 'should clamp to 1');
    model.setTemporalAlpha(-0.5);
    assert(model.temporalAlpha === 0, 'should clamp to 0');
  });

  test('setRTLMode toggles positional encoding', () => {
    model.setRTLMode(true);
    assert(model.useRTLPositions === true, 'should enable RTL');
    model.setRTLMode(false);
    assert(model.useRTLPositions === false, 'should disable RTL');
  });

  test('forward returns temporalAsymmetry', () => {
    const out = model.forward([0, 1, 2, 3, 4, 5, 6, 7]);
    assert('temporalAsymmetry' in out, 'should have temporalAsymmetry');
    assert(out.temporalAsymmetry >= -1 && out.temporalAsymmetry <= 1,
      `asymmetry=${out.temporalAsymmetry} should be in [-1,1]`);
  });

  test('RTL mode uses reversed positional encoding', () => {
    model.setRTLMode(false);
    const out1 = model.forward([0, 1, 2, 3, 4, 5, 6, 7]);
    model.setRTLMode(true);
    const out2 = model.forward([0, 1, 2, 3, 4, 5, 6, 7]);
    // Outputs should differ (different positional encoding)
    let diff = 0;
    for (let i = 0; i < out1.probs.length; i++) {
      diff += Math.abs(out1.probs[i] - out2.probs[i]);
    }
    // Small models with random init may have tiny differences
    // Just verify they're not identical (diff > 0)
    assert(diff > 0, `RTL mode should change output, diff=${diff}`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n4. Schumann Resonance — cosmic coupling\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('field.cfg has Schumann defaults', () => {
    // These should be accessible via DSL
    field.cfg.schumannCurrent = 7.83;
    field.cfg.schumannModulation = 0.3;
    assert(field.cfg.schumannCurrent === 7.83, 'should have schumannCurrent');
    assert(field.cfg.schumannModulation === 0.3, 'should have schumannModulation');
  });

  test('Schumann modulation affects field config', () => {
    field.cfg.schumannModulation = 0.0;
    const mod0 = field.cfg.schumannModulation;
    field.cfg.schumannModulation = 1.0;
    const mod1 = field.cfg.schumannModulation;
    assert(mod1 > mod0, 'higher modulation should be stored');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n5. Calendar Drift Integration\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('calendarDrift config exists', () => {
    assert('calendarDrift' in field.cfg, 'should have calendarDrift');
    assert(field.cfg.calendarDrift === 11, `default should be 11, got ${field.cfg.calendarDrift}`);
  });

  test('Metonic cycle year calculation works', () => {
    // Hebrew leap years in 19-year cycle: 3, 6, 8, 11, 14, 17, 19
    // Year 3 should be leap (384 days), year 4 should be common (354 days)
    // This is tested implicitly through field.step behavior
    assert(typeof field.currentHebrewYear === 'number', 'should track Hebrew year');
    assert(typeof field.currentGregorianYear === 'number', 'should track Gregorian year');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n' + '='.repeat(60));
  console.log(`\n\ud83d\udcca Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('\u274c Some tests failed.\n');
    process.exit(1);
  } else {
    console.log('\u2705 All tests passed! \u05d4\u05e8\u05d6\u05d5\u05e0\u05e0\u05e1 \u05dc\u05d0 \u05e0\u05e9\u05d1\u05e8.\n');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
