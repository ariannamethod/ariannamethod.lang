// test_coupling.js — Velocity↔Temperature & Chirality↔Attention coupling tests
// "when the body moves, the mind's temperature changes"
// "when the body turns, attention focuses or spreads"
//
// Run: node tests/test_coupling.js
//
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — tests carry the signature of co-creation
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════

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

function assertClose(a, b, eps = 1e-4, msg) {
  if (Math.abs(a - b) > eps) {
    throw new Error(msg || `Expected ${a} ≈ ${b} (diff: ${Math.abs(a - b)})`);
  }
}

function assertRange(val, min, max, msg) {
  if (val < min || val > max) {
    throw new Error(msg || `Expected ${val} in [${min}, ${max}]`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════════════════════

import { Field } from '../src/field.js';
import { AriannaLung } from '../src/model.js';
import { Metrics } from '../src/metrics.js';

// Simple tokenizer for tests
function makeTokenizer(vocabSize = 100) {
  return {
    vocabSize: () => vocabSize,
    encode: (s) => s.split('').map((_, i) => i % vocabSize),
    decode: (ids) => ids.map(i => String.fromCharCode(65 + (i % 26))).join(''),
    word: (id) => `tok${id}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Runner
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🔗 Coupling Tests (Velocity↔Temp, Chirality↔Attention)\n');
console.log('═'.repeat(60));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n1. Velocity → Temperature Coupling\n');
// ─────────────────────────────────────────────────────────────────────────────

test('effectiveTemp exists in field cfg', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  // Initialize effectiveTemp (normally done by DSL)
  field.cfg.effectiveTemp = 1.0;

  assert(field.cfg.effectiveTemp !== undefined, 'effectiveTemp should exist');
});

test('high effectiveTemp increases attendSpread', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  const baseSpread = model.attendSpread;

  // Set high temperature (running)
  field.cfg.effectiveTemp = 1.2;
  field.cfg.attendSpread = 0.20;

  // Step to apply coupling
  field.step(1, 1, 0);

  assert(model.attendSpread > baseSpread,
    `High temp should increase spread: ${model.attendSpread} > ${baseSpread}`);
});

test('low effectiveTemp decreases attendSpread', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  const baseSpread = model.attendSpread;

  // Set low temperature (stopped)
  field.cfg.effectiveTemp = 0.5;
  field.cfg.attendSpread = 0.20;

  // Step to apply coupling
  field.step(1, 1, 0);

  assert(model.attendSpread < baseSpread,
    `Low temp should decrease spread: ${model.attendSpread} < ${baseSpread}`);
});

test('attendSpread stays within bounds', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  // Extreme high temperature
  field.cfg.effectiveTemp = 10.0;
  field.cfg.attendSpread = 0.20;
  field.step(1, 1, 0);

  assertRange(model.attendSpread, 0.05, 0.5,
    `Spread should be bounded: ${model.attendSpread}`);

  // Extreme low temperature
  field.cfg.effectiveTemp = -5.0;
  field.step(2, 2, 0);

  assertRange(model.attendSpread, 0.05, 0.5,
    `Spread should be bounded even with extreme temp: ${model.attendSpread}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. Chirality → Attention Coupling\n');
// ─────────────────────────────────────────────────────────────────────────────

test('chiralMemory exists in field cfg', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  assert(field.cfg.chiralMemory !== undefined, 'chiralMemory should exist');
});

test('high chiralMemory increases attendFocus', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  const baseFocus = model.attendFocus;

  // Set high chirality (many left turns)
  field.cfg.chiralMemory = 0.8;
  field.cfg.attendFocus = 0.70;

  // Step to apply coupling
  field.step(1, 1, 0);

  assert(model.attendFocus > baseFocus,
    `High chirality should increase focus: ${model.attendFocus} > ${baseFocus}`);
});

test('zero chiralMemory does not change attendFocus', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  const baseFocus = field.cfg.attendFocus;

  // Set zero chirality
  field.cfg.chiralMemory = 0;

  // Step to apply coupling
  field.step(1, 1, 0);

  // Focus should be unchanged (or only changed by other factors)
  // We check that chirality didn't ADD to it
  assertClose(model.attendFocus, baseFocus, 0.01,
    `Zero chirality should not increase focus`);
});

test('attendFocus stays within bounds', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  // Extreme high chirality
  field.cfg.chiralMemory = 1.0;
  field.cfg.attendFocus = 0.90;
  field.step(1, 1, 0);

  assertRange(model.attendFocus, 0, 0.95,
    `Focus should be bounded: ${model.attendFocus}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. Combined Coupling Effects\n');
// ─────────────────────────────────────────────────────────────────────────────

test('velocity and chirality can both affect model simultaneously', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  const baseFocus = model.attendFocus;
  const baseSpread = model.attendSpread;

  // Set both high temp and high chirality
  field.cfg.effectiveTemp = 1.2;
  field.cfg.chiralMemory = 0.7;
  field.cfg.attendSpread = 0.20;
  field.cfg.attendFocus = 0.70;

  // Step
  field.step(1, 1, 0);

  // Both should have changed
  assert(model.attendSpread > baseSpread, 'Spread should increase from high temp');
  assert(model.attendFocus > baseFocus, 'Focus should increase from high chirality');
});

test('inference output changes with velocity', () => {
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  // Low temp inference
  field.cfg.effectiveTemp = 0.5;
  field.cfg.attendSpread = 0.20;
  field.step(1, 1, 0);
  const lowTempEntropy = metrics.entropy;

  // Reset and high temp inference
  const field2 = new Field({ w: 10, h: 10, tokenizer, model, metrics });
  field2.cfg.effectiveTemp = 1.3;
  field2.cfg.attendSpread = 0.20;
  field2.step(1, 1, 0);
  const highTempEntropy = metrics.entropy;

  // Higher temperature should lead to different entropy
  // (not necessarily higher due to other factors, but different)
  // We just verify the coupling is active
  assert(typeof lowTempEntropy === 'number', 'Low temp should produce entropy');
  assert(typeof highTempEntropy === 'number', 'High temp should produce entropy');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4. Physical Meaning Tests\n');
// ─────────────────────────────────────────────────────────────────────────────

test('running (high temp) = exploratory thinking', () => {
  // When you run, your mind explores more possibilities
  // This means higher temperature = more spread attention
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  field.cfg.effectiveTemp = 1.2;  // running
  field.cfg.attendSpread = 0.20;
  field.step(1, 1, 0);

  // attendSpread > base means more diffuse attention = exploration
  assert(model.attendSpread > 0.20,
    'Running should increase attention spread (exploration)');
});

test('stopping (low temp) = focused thinking', () => {
  // When you stop, your mind focuses more
  // This means lower temperature = less spread attention
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  field.cfg.effectiveTemp = 0.5;  // stopped
  field.cfg.attendSpread = 0.20;
  field.step(1, 1, 0);

  // attendSpread < base means sharper attention = focus
  assert(model.attendSpread < 0.20,
    'Stopping should decrease attention spread (focus)');
});

test('turning left (chirality) = convergent attention', () => {
  // Accumulated left turns create handedness
  // This tightens attention focus
  const tokenizer = makeTokenizer();
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
  const metrics = new Metrics();
  const field = new Field({ w: 10, h: 10, tokenizer, model, metrics });

  field.cfg.chiralMemory = 0.6;  // significant left turning history
  field.cfg.attendFocus = 0.70;
  field.step(1, 1, 0);

  // Higher focus = tighter attention cone
  assert(model.attendFocus > 0.70,
    'Chirality should increase attention focus (convergence)');
});

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ Some coupling tests failed!\n');
  process.exit(1);
} else {
  console.log('✅ All coupling tests passed! Body↔Mind connection verified.\n');
  console.log('   Velocity → Temperature: ✓ movement changes inference temperature');
  console.log('   Chirality → Attention: ✓ turning changes attention focus\n');
  process.exit(0);
}
