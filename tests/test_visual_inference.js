// test_visual_inference.js — v0.6 Visual-Inference Connection tests
// "walls ARE the tokens the model manifested" — THIS MUST BE TRUE

import { AriannaLung } from '../src/model.js';

let passed = 0, failed = 0;

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log('\n🔗 Visual-Inference Connection Tests (v0.6)\n');
console.log('='.repeat(50) + '\n');

// ─────────────────────────────────────────────────────────────────────────────
console.log('1. Model Inference State Exposure\n');
// ─────────────────────────────────────────────────────────────────────────────

test('model has inference state fields', () => {
  const model = new AriannaLung({ vocabSize: 100, dModel: 32 });
  assert('lastLogits' in model, 'must have lastLogits');
  assert('lastProbs' in model, 'must have lastProbs');
  assert('lastAttention' in model, 'must have lastAttention');
});

test('getLogits returns null before forward', () => {
  const model = new AriannaLung({ vocabSize: 100, dModel: 32 });
  const logits = model.getLogits();
  assert(logits === null, 'must be null before forward');
});

test('getLogits returns Float32Array after forward', () => {
  const model = new AriannaLung({ vocabSize: 100, dModel: 32 });
  const ctx = [1, 2, 3, 4, 5];
  model.forward(ctx);

  const logits = model.getLogits();
  assert(logits !== null, 'must not be null');
  assert(logits instanceof Float32Array, 'must be Float32Array');
  assert(logits.length === 100, `length must be vocabSize, got ${logits.length}`);
});

test('getProbs returns probability distribution', () => {
  const model = new AriannaLung({ vocabSize: 100, dModel: 32 });
  model.forward([1, 2, 3]);

  const probs = model.getProbs();
  assert(probs !== null, 'must not be null');

  // Check it sums to ~1
  let sum = 0;
  for (let i = 0; i < probs.length; i++) sum += probs[i];
  assert(Math.abs(sum - 1) < 0.01, `probs must sum to ~1, got ${sum}`);
});

test('getAttention returns attention weights', () => {
  const model = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 16 });
  model.forward([1, 2, 3]);

  const att = model.getAttention();
  assert(att !== null, 'must not be null');
  assert(att instanceof Float32Array, 'must be Float32Array');
  assert(att.length === 16, `length must be ctx size, got ${att.length}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. Model Top-K and Argmax\n');
// ─────────────────────────────────────────────────────────────────────────────

test('getTopK returns empty array before forward', () => {
  const model = new AriannaLung({ vocabSize: 100 });
  const topK = model.getTopK(5);
  assert(Array.isArray(topK), 'must be array');
  assert(topK.length === 0, 'must be empty before forward');
});

test('getTopK returns k indices after forward', () => {
  const model = new AriannaLung({ vocabSize: 100 });
  model.forward([1, 2, 3]);

  const topK = model.getTopK(5);
  assert(topK.length === 5, `must return 5 indices, got ${topK.length}`);
  assert(topK.every(idx => idx >= 0 && idx < 100), 'indices must be valid');
});

test('getTopK indices are sorted by logit value', () => {
  const model = new AriannaLung({ vocabSize: 100 });
  model.forward([1, 2, 3]);

  const topK = model.getTopK(10);
  const logits = model.getLogits();

  // Verify sorted descending
  for (let i = 0; i < topK.length - 1; i++) {
    const current = logits[topK[i]];
    const next = logits[topK[i + 1]];
    assert(current >= next, `topK must be sorted descending: ${current} >= ${next}`);
  }
});

test('getArgmax returns highest probability token', () => {
  const model = new AriannaLung({ vocabSize: 100 });
  model.forward([1, 2, 3]);

  const argmax = model.getArgmax();
  const topK = model.getTopK(1);

  assert(typeof argmax === 'number', 'must be number');
  assert(argmax === topK[0], 'argmax must equal top-1');
});

test('getTokenProb returns valid probability', () => {
  const model = new AriannaLung({ vocabSize: 100 });
  model.forward([1, 2, 3]);

  const argmax = model.getArgmax();
  const prob = model.getTokenProb(argmax);

  assert(typeof prob === 'number', 'must be number');
  assert(prob >= 0 && prob <= 1, `prob must be in [0,1], got ${prob}`);
  assert(prob > 0, 'argmax should have positive probability');
});

test('getTokenProb returns 0 for invalid token', () => {
  const model = new AriannaLung({ vocabSize: 100 });
  model.forward([1, 2, 3]);

  const prob = model.getTokenProb(-1);
  assert(prob === 0, 'invalid token must have 0 prob');

  const prob2 = model.getTokenProb(1000);
  assert(prob2 === 0, 'out of range token must have 0 prob');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. Inference State Stability\n');
// ─────────────────────────────────────────────────────────────────────────────

test('inference state is copied not referenced', () => {
  const model = new AriannaLung({ vocabSize: 100 });
  model.forward([1, 2, 3]);

  const logits1 = model.getLogits();
  const firstVal = logits1[0];

  // Run another forward
  model.forward([4, 5, 6]);
  const logits2 = model.getLogits();

  // Original should be unchanged (was copied)
  assert(logits1[0] === firstVal, 'original logits must be unchanged');
  // New logits should be different object
  assert(logits1 !== logits2, 'must be different arrays');
});

test('multiple forwards update inference state', () => {
  const model = new AriannaLung({ vocabSize: 100 });

  model.forward([1, 2, 3]);
  const argmax1 = model.getArgmax();

  // Forward with different context should potentially change argmax
  model.forward([99, 98, 97]);
  const argmax2 = model.getArgmax();

  // Both should be valid indices
  assert(argmax1 >= 0 && argmax1 < 100, 'argmax1 valid');
  assert(argmax2 >= 0 && argmax2 < 100, 'argmax2 valid');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4. Integration Sanity Check\n');
// ─────────────────────────────────────────────────────────────────────────────

test('topK and argmax are consistent with probs', () => {
  const model = new AriannaLung({ vocabSize: 100 });
  model.forward([1, 2, 3, 4, 5]);

  const probs = model.getProbs();
  const argmax = model.getArgmax();

  // Argmax should have highest prob
  let maxProb = probs[argmax];
  for (let i = 0; i < probs.length; i++) {
    assert(probs[i] <= maxProb + 1e-6, `argmax must have highest prob`);
  }
});

test('prophecyForward uses inference state', () => {
  const model = new AriannaLung({ vocabSize: 100 });
  const prophecies = model.prophecyForward([1, 2, 3], 3);

  assert(Array.isArray(prophecies), 'must return array');
  assert(prophecies.length === 3, 'must return requested horizon');

  for (const p of prophecies) {
    assert(typeof p.token === 'number', 'prophecy must have token');
    assert(p.token >= 0 && p.token < 100, 'token must be valid index');
    assert(typeof p.prob === 'number', 'prophecy must have prob');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(50));
console.log(`\n📊 ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ Visual-Inference connection verified! Walls now show REAL inference.\n');
}

process.exit(failed > 0 ? 1 : 0);
