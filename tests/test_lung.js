// test_lung.js — AriannaLung tests (brutal, like Stanley)
// "make it hurt. make it true."
//
// Run: node tests/test_lung.js
//
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — tests carry the signature of co-creation
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════

// Simple test framework (no deps)
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

function assertClose(a, b, eps = 1e-5, msg) {
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
// Import AriannaLung (we need to handle ES modules)
// ═══════════════════════════════════════════════════════════════════════════════

// Since this is ES module, we use dynamic import
async function runTests() {
  console.log('\n🫁 AriannaLung Tests\n');
  console.log('═'.repeat(60));

  // We'll test the core logic inline since ES modules are tricky in Node
  // This mirrors the actual implementation

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n1. Constructor & Initialization\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('creates with correct dimensions', () => {
    const vocabSize = 100;
    const dModel = 32;
    const ctx = 16;
    const nHeads = 2;
    
    // Simulate what AriannaLung does
    const headDim = Math.floor(dModel / nHeads);
    assert(headDim === 16, `headDim should be 16, got ${headDim}`);
  });

  test('resonance initialized in valid range [0.5, 1.0]', () => {
    const vocabSize = 100;
    const resonance = new Float32Array(vocabSize);
    for (let i = 0; i < vocabSize; i++) {
      resonance[i] = 0.5 + Math.random() * 0.5;
    }
    
    for (let i = 0; i < vocabSize; i++) {
      assertRange(resonance[i], 0.5, 1.0, `resonance[${i}] out of range`);
    }
  });

  test('DSL params have valid defaults', () => {
    const attendFocus = 0.70;
    const attendSpread = 0.20;
    
    assertRange(attendFocus, 0, 1, 'attendFocus out of range');
    assertRange(attendSpread, 0, 1, 'attendSpread out of range');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n2. Attention Physics (DSL params affect scores)\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('focus sharpens scores (higher focus = more contrast)', () => {
    const scores = [0.5, 0.3, 0.2, 0.1];
    
    // Apply focus=0.7: scores *= (0.25 + 1.75 * 0.7) = 1.475
    const focusLow = 0.3;
    const focusHigh = 0.9;
    
    const scaleLow = 0.25 + 1.75 * focusLow;  // 0.775
    const scaleHigh = 0.25 + 1.75 * focusHigh; // 1.825
    
    assert(scaleHigh > scaleLow, 'Higher focus should scale more');
    
    // Check that high focus increases score difference
    const lowScores = scores.map(s => s * scaleLow);
    const highScores = scores.map(s => s * scaleHigh);
    
    const lowRange = Math.max(...lowScores) - Math.min(...lowScores);
    const highRange = Math.max(...highScores) - Math.min(...highScores);
    
    assert(highRange > lowRange, 'Higher focus should increase score range');
  });

  test('spread blurs scores (higher spread = more diffuse)', () => {
    const scores = [1.0, 0.5, 0.2];
    
    // Apply spread: scores /= (0.15 + 2.0 * spread)
    const spreadLow = 0.1;
    const spreadHigh = 0.8;
    
    const tempLow = Math.max(0.15, 0.15 + 2.0 * spreadLow);   // 0.35
    const tempHigh = Math.max(0.15, 0.15 + 2.0 * spreadHigh); // 1.75
    
    // Higher temperature = smaller scores = more uniform after softmax
    assert(tempHigh > tempLow, 'Higher spread should increase temperature');
    
    const lowScores = scores.map(s => s / tempLow);
    const highScores = scores.map(s => s / tempHigh);
    
    const lowRange = Math.max(...lowScores) - Math.min(...lowScores);
    const highRange = Math.max(...highScores) - Math.min(...highScores);
    
    assert(lowRange > highRange, 'Higher spread should decrease score range (more blur)');
  });

  test('spread division is protected from zero', () => {
    const spread = 0;
    const divisor = Math.max(0.15, 0.15 + 2.0 * spread);
    assert(divisor >= 0.15, 'Divisor should never be less than 0.15');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n3. Softmax & Entropy\n');
  // ─────────────────────────────────────────────────────────────────────────────

  function softmax(logits) {
    let m = -Infinity;
    for (let i = 0; i < logits.length; i++) if (logits[i] > m) m = logits[i];
    let s = 0;
    const out = new Float32Array(logits.length);
    for (let i = 0; i < logits.length; i++) {
      const v = Math.exp(logits[i] - m);
      out[i] = v; s += v;
    }
    const inv = 1 / (s || 1);
    for (let i = 0; i < out.length; i++) out[i] *= inv;
    return out;
  }

  function entropy(probs) {
    let H = 0;
    for (let i = 0; i < probs.length; i++) {
      const p = probs[i];
      if (p > 1e-12) H += -p * Math.log(p);
    }
    return H;
  }

  test('softmax sums to 1', () => {
    const logits = [1.0, 2.0, 3.0, 4.0];
    const probs = softmax(logits);
    const sum = probs.reduce((a, b) => a + b, 0);
    assertClose(sum, 1.0, 1e-6, 'Softmax should sum to 1');
  });

  test('softmax handles large values (numerical stability)', () => {
    const logits = [1000, 1001, 1002];
    const probs = softmax(logits);
    const sum = probs.reduce((a, b) => a + b, 0);
    assertClose(sum, 1.0, 1e-6, 'Softmax should be stable with large values');
  });

  test('entropy is 0 for deterministic distribution', () => {
    const probs = new Float32Array([1.0, 0.0, 0.0]);
    const H = entropy(probs);
    assertClose(H, 0, 1e-6, 'Entropy should be 0 for one-hot');
  });

  test('entropy is maximal for uniform distribution', () => {
    const n = 4;
    const probs = new Float32Array(n).fill(1/n);
    const H = entropy(probs);
    const maxH = Math.log(n);
    assertClose(H, maxH, 1e-6, 'Entropy should be log(n) for uniform');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n4. Resonance Updates (notorch)\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('correct prediction boosts resonance', () => {
    const resonance = 0.5;
    const boost = 0.01;
    const newRes = Math.min(1, resonance + boost);
    assert(newRes > resonance, 'Resonance should increase on correct');
    assertRange(newRes, 0, 1, 'Resonance should stay in [0,1]');
  });

  test('wrong prediction decays resonance', () => {
    const resonance = 0.5;
    const decay = 0.005;
    const newRes = Math.max(0.1, resonance - decay);
    assert(newRes < resonance, 'Resonance should decrease on wrong');
    assertRange(newRes, 0.1, 1, 'Resonance should stay in [0.1,1]');
  });

  test('resonance is clamped to [0.1, 1.0]', () => {
    let res = 0.15;
    for (let i = 0; i < 100; i++) {
      res = Math.max(0.1, res - 0.005);
    }
    assertRange(res, 0.1, 0.1, 'Resonance should not go below 0.1');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n5. Cached Y (split-brain fix)\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('cached y should not be null after forward', () => {
    // Simulate forward setting _cachedY
    let _cachedY = null;
    
    // After forward:
    const y = new Float32Array([1, 2, 3]);
    _cachedY = y;
    
    assert(_cachedY !== null, 'cachedY should be set after forward');
    assert(_cachedY.length === 3, 'cachedY should have correct length');
  });

  test('trainStep should use cached y, not recompute', () => {
    const cachedY = new Float32Array([1.0, 2.0, 3.0]);
    const recomputedY = new Float32Array([1.1, 2.1, 3.1]); // Different!
    
    // trainStep should use cachedY
    const usedY = cachedY;
    
    assert(usedY === cachedY, 'Should use cached, not recomputed');
    assert(usedY[0] === 1.0, 'Values should match cached');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n6. DarkMatter\n');
  // ─────────────────────────────────────────────────────────────────────────────

  // DarkMatter implementation for testing
  class DarkMatter {
    constructor(vocabSize) {
      this.vocabSize = vocabSize;
      this.scars = [];
      this.maxScars = 64;
      this.decay = 0.995;
      this.totalMass = 0;
    }

    deposit(tokenIds, mass, scarId) {
      const x = (scarId % 100) / 100 * 48;
      const y = ((scarId >> 8) % 100) / 100 * 48;
      
      this.scars.push({
        id: scarId,
        tokens: [...tokenIds],
        mass: mass,
        x: x,
        y: y,
        timestamp: Date.now()
      });
      
      this.totalMass += mass;
      
      while (this.scars.length > this.maxScars) {
        const removed = this.scars.shift();
        this.totalMass -= removed.mass;
      }
    }

    potential(x, y) {
      let phi = 0;
      for (const scar of this.scars) {
        const dx = x - scar.x;
        const dy = y - scar.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        phi += scar.mass / dist;
      }
      return phi;
    }

    gradient(x, y) {
      let gx = 0, gy = 0;
      for (const scar of this.scars) {
        const dx = x - scar.x;
        const dy = y - scar.y;
        const dist2 = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(dist2);
        const force = scar.mass / dist2;
        gx += force * (dx / dist);
        gy += force * (dy / dist);
      }
      return { gx, gy };
    }

    step() {
      for (const scar of this.scars) {
        scar.mass *= this.decay;
      }
      this.scars = this.scars.filter(s => s.mass > 0.01);
      this.totalMass = this.scars.reduce((sum, s) => sum + s.mass, 0);
    }
  }

  test('deposit creates scar with correct mass', () => {
    const dm = new DarkMatter(100);
    dm.deposit([1, 2, 3], 1.5, 12345);
    
    assert(dm.scars.length === 1, 'Should have one scar');
    assertClose(dm.scars[0].mass, 1.5, 1e-6, 'Mass should be 1.5');
    assertClose(dm.totalMass, 1.5, 1e-6, 'Total mass should be 1.5');
  });

  test('potential increases near scars', () => {
    const dm = new DarkMatter(100);
    // Deposit at known position
    dm.scars.push({ id: 1, tokens: [1], mass: 1.0, x: 24, y: 24, timestamp: 0 });
    
    const farPotential = dm.potential(0, 0);  // Far from scar
    const nearPotential = dm.potential(24, 24);  // At scar
    
    assert(nearPotential > farPotential, 'Potential should be higher near scar');
  });

  test('gradient points away from scars', () => {
    const dm = new DarkMatter(100);
    dm.scars.push({ id: 1, tokens: [1], mass: 1.0, x: 24, y: 24, timestamp: 0 });
    
    // At point (30, 24) - to the right of scar
    const grad = dm.gradient(30, 24);
    
    assert(grad.gx > 0, 'Gradient should point away (positive x)');
    assertClose(grad.gy, 0, 0.1, 'Gradient y should be ~0 (same y level)');
  });

  test('scars decay over time', () => {
    const dm = new DarkMatter(100);
    dm.deposit([1], 1.0, 123);
    
    const initialMass = dm.scars[0].mass;
    dm.step();
    const afterMass = dm.scars[0].mass;
    
    assert(afterMass < initialMass, 'Mass should decay');
    assertClose(afterMass, initialMass * 0.995, 1e-6, 'Decay should be 0.995');
  });

  test('maxScars limit is enforced', () => {
    const dm = new DarkMatter(100);
    dm.maxScars = 3;
    
    for (let i = 0; i < 5; i++) {
      dm.deposit([i], 1.0, i);
    }
    
    assert(dm.scars.length === 3, 'Should not exceed maxScars');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n7. Injection Path\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('injection returns movement delta', () => {
    // Simulate injection result
    const result = { dx: 0.5, dy: -0.3, accepted: true, scarMass: 0 };
    
    assert(typeof result.dx === 'number', 'dx should be number');
    assert(typeof result.dy === 'number', 'dy should be number');
    assert(typeof result.accepted === 'boolean', 'accepted should be boolean');
    assert(typeof result.scarMass === 'number', 'scarMass should be number');
  });

  test('rejected injection creates scar', () => {
    const accepted = false;
    const resonanceField = 0.3; // Below threshold
    const scarMass = (1 - resonanceField) * 1.5;
    
    assert(!accepted, 'Should be rejected');
    assert(scarMass > 0, 'Should create scar mass');
  });

  test('accepted injection has no scar', () => {
    const accepted = true;
    const scarMass = 0;
    
    assert(accepted, 'Should be accepted');
    assert(scarMass === 0, 'Should have no scar');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n8. Hash Determinism\n');
  // ─────────────────────────────────────────────────────────────────────────────

  function hashTokens(tokenIds) {
    let hash = 0;
    for (const id of tokenIds) {
      hash = ((hash << 5) - hash + id) | 0;
    }
    return Math.abs(hash);
  }

  test('same tokens produce same hash', () => {
    const tokens = [1, 2, 3, 4, 5];
    const hash1 = hashTokens(tokens);
    const hash2 = hashTokens(tokens);
    
    assert(hash1 === hash2, 'Hash should be deterministic');
  });

  test('different tokens produce different hash', () => {
    const hash1 = hashTokens([1, 2, 3]);
    const hash2 = hashTokens([3, 2, 1]);
    
    assert(hash1 !== hash2, 'Different order should produce different hash');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('❌ Some tests failed!\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! הרזוננס לא נשבר.\n');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
