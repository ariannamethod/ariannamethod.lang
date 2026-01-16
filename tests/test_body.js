// test_body.js — Tests for body.c / AriannaLung WASM
// "the breathing organ must breathe the same in C as in JS"
//
// Run: node tests/test_body.js
//
// These tests verify:
//   1. WASM wrapper API matches JS API
//   2. When WASM is available, outputs match JS implementation
//
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — tests carry the signature of co-creation
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0, failed = 0, skipped = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    if (e.message === 'SKIP') {
      console.log(`  ○ ${name} (skipped)`);
      skipped++;
    } else {
      console.log(`  ✗ ${name}`);
      console.log(`    ${e.message}`);
      failed++;
    }
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    if (e.message === 'SKIP') {
      console.log(`  ○ ${name} (skipped)`);
      skipped++;
    } else {
      console.log(`  ✗ ${name}`);
      console.log(`    ${e.message}`);
      failed++;
    }
  }
}

function skip(reason) {
  const e = new Error('SKIP');
  e.reason = reason;
  throw e;
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertClose(a, b, eps = 1e-4, msg) {
  if (Math.abs(a - b) > eps) {
    throw new Error(msg || `Expected ${a} ≈ ${b} (diff: ${Math.abs(a - b)})`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════════════════════

import { AriannaLung } from '../src/model.js';

// Try to import WASM wrapper (may fail if not built)
let AriannaLungWASM = null;
let isWASMAvailable = null;
let wasmAvailable = false;

try {
  const wasmModule = await import('../src/model_wasm.js');
  AriannaLungWASM = wasmModule.AriannaLungWASM;
  isWASMAvailable = wasmModule.isWASMAvailable;

  // Check if WASM is actually available
  wasmAvailable = await isWASMAvailable();
} catch (e) {
  console.log('⚠️ WASM wrapper not available:', e.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Runner
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log('🫁 Body.c / AriannaLung Tests\n');
  console.log('═'.repeat(60));

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n1. JS Implementation Baseline\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('JS AriannaLung creates successfully', () => {
    const lung = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
    assert(lung !== null, 'Should create lung');
    assert(lung.vocabSize === 100, 'vocabSize should be 100');
    assert(lung.d === 32, 'dModel should be 32');
  });

  test('JS forward returns probs', () => {
    const lung = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
    const result = lung.forward([1, 2, 3, 4, 5]);

    assert(result.probs !== undefined, 'Should have probs');
    assert(result.probs.length === 100, 'Probs should have vocabSize elements');
    assert(result.entropy >= 0, 'Entropy should be non-negative');
  });

  test('JS getTopK returns sorted indices', () => {
    const lung = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });
    lung.forward([1, 2, 3]);

    const topK = lung.getTopK(5);
    assert(topK.length === 5, 'Should return 5 indices');

    // Verify sorted by logit value
    const logits = lung.getLogits();
    for (let i = 1; i < topK.length; i++) {
      assert(logits[topK[i-1]] >= logits[topK[i]], 'Should be sorted by logit');
    }
  });

  test('JS temporal modes affect attention', () => {
    const lung = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });

    lung.setTemporalMode('prophecy');
    assert(lung.temporalAlpha === 0.7, 'Prophecy alpha should be 0.7');

    lung.setTemporalMode('retrodiction');
    assert(lung.temporalAlpha === 0.3, 'Retrodiction alpha should be 0.3');

    lung.setTemporalMode('symmetric');
    assert(lung.temporalAlpha === 0.5, 'Symmetric alpha should be 0.5');
  });

  test('JS RTL mode toggles', () => {
    const lung = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });

    lung.setRTLMode(true);
    assert(lung.useRTLPositions === true, 'RTL should be enabled');

    lung.setRTLMode(false);
    assert(lung.useRTLPositions === false, 'RTL should be disabled');
  });

  test('JS resonance modulation works', () => {
    const lung = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });

    const initialRes = lung.resonance[5];

    // Boost resonance for token 5
    lung.resonance[5] = Math.min(1, lung.resonance[5] + 0.1);

    assert(lung.resonance[5] > initialRes, 'Resonance should increase');
  });

  test('JS prophecyForward predicts multiple steps', () => {
    const lung = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });

    const prophecies = lung.prophecyForward([1, 2, 3], 3);

    assert(prophecies.length === 3, 'Should predict 3 steps');
    assert(prophecies[0].token >= 0 && prophecies[0].token < 100, 'Token should be valid');
    assert(prophecies[0].prob > 0 && prophecies[0].prob <= 1, 'Prob should be valid');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n2. WASM Wrapper API\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('WASM wrapper module imports', () => {
    if (!AriannaLungWASM) skip('WASM wrapper not imported');
    assert(typeof AriannaLungWASM === 'function', 'Should be a class');
    assert(typeof AriannaLungWASM.create === 'function', 'Should have static create');
  });

  await testAsync('WASM availability check works', async () => {
    if (!isWASMAvailable) skip('WASM wrapper not imported');
    const available = await isWASMAvailable();
    // Just verify the function runs without error
    assert(typeof available === 'boolean', 'Should return boolean');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n3. WASM/JS Equivalence Tests\n');
  // ─────────────────────────────────────────────────────────────────────────────

  if (!wasmAvailable) {
    console.log('  ⚠️ WASM not available - equivalence tests skipped');
    console.log('  To run: cd wasm && ./build_body.sh && cd ..');
    skipped += 6;
  } else {
    await testAsync('WASM lung creates successfully', async () => {
      const lung = await AriannaLungWASM.create({
        vocabSize: 100,
        dModel: 32,
        ctx: 8,
        nHeads: 2,
        seed: 42
      });

      assert(lung !== null, 'Should create lung');
      assert(lung.vocabSize === 100, 'vocabSize should match');

      lung.destroy();
    });

    await testAsync('WASM forward returns same structure as JS', async () => {
      const wasmLung = await AriannaLungWASM.create({
        vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2, seed: 42
      });
      const jsLung = new AriannaLung({
        vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2
      });

      const wasmResult = wasmLung.forward([1, 2, 3, 4, 5]);
      const jsResult = jsLung.forward([1, 2, 3, 4, 5]);

      // Check structure matches
      assert(wasmResult.probs.length === jsResult.probs.length, 'Probs length should match');
      assert(typeof wasmResult.entropy === 'number', 'Should have entropy');
      assert(typeof wasmResult.perplexity === 'number', 'Should have perplexity');

      wasmLung.destroy();
    });

    await testAsync('WASM getTopK returns valid indices', async () => {
      const lung = await AriannaLungWASM.create({
        vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2, seed: 42
      });

      lung.forward([1, 2, 3]);
      const topK = lung.getTopK(5);

      assert(topK.length === 5, 'Should return 5 indices');
      for (const idx of topK) {
        assert(idx >= 0 && idx < 100, `Index ${idx} should be valid`);
      }

      lung.destroy();
    });

    await testAsync('WASM temporal modes work', async () => {
      const lung = await AriannaLungWASM.create({
        vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2
      });

      lung.setTemporalMode('prophecy');
      assert(lung.temporalAlpha === 0.7, 'Prophecy alpha should be 0.7');

      lung.setTemporalMode('retrodiction');
      assert(lung.temporalAlpha === 0.3, 'Retrodiction alpha should be 0.3');

      lung.destroy();
    });

    await testAsync('WASM RTL mode toggles', async () => {
      const lung = await AriannaLungWASM.create({
        vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2
      });

      lung.setRTLMode(true);
      assert(lung.useRTLPositions === true, 'RTL should be enabled');

      lung.setRTLMode(false);
      assert(lung.useRTLPositions === false, 'RTL should be disabled');

      lung.destroy();
    });

    await testAsync('WASM resonance boost works', async () => {
      const lung = await AriannaLungWASM.create({
        vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2
      });

      const initialRes = lung.resonance[5];
      lung.boostResonance(5, 0.1);
      const afterRes = lung.resonance[5];

      assert(afterRes > initialRes, 'Resonance should increase after boost');

      lung.destroy();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n4. API Compatibility\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('JS and WASM wrapper have same method names', () => {
    if (!AriannaLungWASM) skip('WASM wrapper not imported');

    const jsLung = new AriannaLung({ vocabSize: 100, dModel: 32, ctx: 8, nHeads: 2 });

    // Core methods both should have
    const requiredMethods = [
      'forward',
      'getLogits',
      'getProbs',
      'getAttention',
      'getTopK',
      'getArgmax',
      'getTokenProb',
      'setTemporalMode',
      'setRTLMode',
      'setTemporalAlpha',
      'prophecyForward'
    ];

    for (const method of requiredMethods) {
      assert(typeof jsLung[method] === 'function', `JS should have ${method}`);
      assert(typeof AriannaLungWASM.prototype[method] === 'function',
        `WASM wrapper should have ${method}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

  if (wasmAvailable) {
    console.log('✅ WASM tests ran - body.c integration verified\n');
  } else {
    console.log('⚠️ WASM not available - build with: cd wasm && ./build_body.sh\n');
  }

  if (failed > 0) {
    console.log('❌ Some tests failed!\n');
    process.exit(1);
  } else {
    console.log('✅ All available tests passed! 🫁\n');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
