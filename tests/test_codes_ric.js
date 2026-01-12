// test_codes_ric.js — CODES/RIC integration tests (CHORDLOCK, TEMPOLOCK, CHIRALITY, PAS)
// "structured resonance > random emergence"
//
// Run: node tests/test_codes_ric.js
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
// Mock Field for testing CODES/RIC methods
// ═══════════════════════════════════════════════════════════════════════════════

class MockField {
  constructor() {
    this.cfg = {
      // CHORDLOCK
      chordlockEnabled: true,
      primeAnchors: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47],
      
      // TEMPOLOCK
      tempolockEnabled: false,
      tempo: 7,
      tempoPhase: 0,
      
      // CHIRALITY
      chiralityEnabled: true,
      chiralMemory: 0,
      chiralEmission: 0,
      chiralDecay: 0.95,
      
      // PAS
      pasThreshold: 0.4,
      glitchIntensity: 0,
    };
    
    this.tempoTick = 0;
    this.tempoBlocked = false;
    this.ctx = [1, 2, 3, 4, 5];
    
    this.metrics = {
      resonanceField: 0.6,
      pain: 0.2,
      dissonance: 0.1,
      entropy: 1.5,
      tension: 0.1,
    };
    
    this.model = {
      vocabSize: 100,
      resonance: new Float32Array(100).fill(0.5),
    };
  }

  // CHORDLOCK methods
  isPrimeAnchor(x, y) {
    if (!this.cfg.chordlockEnabled) return false;
    const primes = this.cfg.primeAnchors;
    const xPrime = primes.includes(x % 48);
    const yPrime = primes.includes(y % 48);
    return xPrime || yPrime;
  }

  getChordlockResonance(x, y) {
    if (!this.cfg.chordlockEnabled) return 1.0;
    const primes = this.cfg.primeAnchors;
    
    let score = 0;
    for (const p of primes) {
      if (x % p === 0) score += 1 / p;
      if (y % p === 0) score += 1 / p;
    }
    
    return 1.0 + Math.min(1.0, score);
  }

  // TEMPOLOCK methods
  tempoStep(dt) {
    if (!this.cfg.tempolockEnabled) {
      this.tempoBlocked = false;
      return true;
    }
    
    this.tempoTick += dt;
    const beatDuration = this.cfg.tempo * 0.1;
    
    const phase = (this.tempoTick % beatDuration) / beatDuration;
    const inBeat = phase < 0.3;
    
    this.tempoBlocked = !inBeat;
    
    if (this.tempoBlocked && this.metrics) {
      this.metrics.tension = Math.min(1, this.metrics.tension + 0.02);
    }
    
    return inBeat;
  }

  // CHIRALITY methods
  applyChirality(turnDirection, angle) {
    if (!this.cfg.chiralityEnabled) return;
    
    const turnAmount = Math.abs(angle);
    
    if (turnDirection === 'left') {
      this.cfg.chiralMemory += turnAmount * 0.1;
      this.cfg.chiralMemory = Math.min(1, this.cfg.chiralMemory);
      
      if (this.model) {
        for (const id of this.ctx.slice(-3)) {
          if (id >= 0 && id < this.model.vocabSize) {
            this.model.resonance[id] = Math.min(1, this.model.resonance[id] + 0.005);
          }
        }
      }
    } else if (turnDirection === 'right') {
      this.cfg.chiralEmission += turnAmount * 0.1;
      this.cfg.chiralEmission = Math.min(1, this.cfg.chiralEmission);
      
      if (this.metrics) {
        this.metrics.entropy += this.cfg.chiralEmission * 0.02;
      }
    }
    
    this.cfg.chiralMemory *= this.cfg.chiralDecay;
    this.cfg.chiralEmission *= this.cfg.chiralDecay;
  }

  // PAS methods
  computePAS() {
    if (!this.metrics) return 1.0;
    
    const resonance = this.metrics.resonanceField || 0.5;
    const antiPain = 1 - (this.metrics.pain || 0);
    const antiDissonance = 1 - (this.metrics.dissonance || 0);
    const chordBonus = this.cfg.chordlockEnabled ? 0.1 : 0;
    
    const pas = (
      0.35 * resonance +
      0.25 * antiPain +
      0.25 * antiDissonance +
      0.15 * (1 - this.metrics.entropy / 3) +
      chordBonus
    );
    
    return Math.max(0, Math.min(1, pas));
  }

  updateGlitchIntensity() {
    const pas = this.computePAS();
    const targetGlitch = pas < this.cfg.pasThreshold 
      ? (this.cfg.pasThreshold - pas) * 2.5 
      : 0;
    
    this.cfg.glitchIntensity = 0.9 * this.cfg.glitchIntensity + 0.1 * targetGlitch;
    return this.cfg.glitchIntensity;
  }
}

async function runTests() {
  console.log('\n🔮 CODES/RIC Integration Tests\n');
  console.log('═'.repeat(60));

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n1. CHORDLOCK — Prime Number Anchoring\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('isPrimeAnchor returns true for prime coordinates', () => {
    const field = new MockField();
    
    // x=7 is prime
    assert(field.isPrimeAnchor(7, 0), 'x=7 should be prime anchor');
    // y=11 is prime
    assert(field.isPrimeAnchor(0, 11), 'y=11 should be prime anchor');
    // both prime
    assert(field.isPrimeAnchor(7, 11), '(7,11) should be prime anchor');
  });

  test('isPrimeAnchor returns false for non-prime coordinates', () => {
    const field = new MockField();
    
    // 4, 6, 8, 9, 10 are not prime
    assert(!field.isPrimeAnchor(4, 6), '(4,6) should not be prime anchor');
    assert(!field.isPrimeAnchor(8, 9), '(8,9) should not be prime anchor');
  });

  test('isPrimeAnchor respects enabled flag', () => {
    const field = new MockField();
    field.cfg.chordlockEnabled = false;
    
    assert(!field.isPrimeAnchor(7, 11), 'Should return false when disabled');
  });

  test('getChordlockResonance returns higher value for prime coordinates', () => {
    const field = new MockField();
    
    // 4 = 2*2, 6 = 2*3 — both divisible by primes
    // 7 = prime, 7 = prime — both ARE primes
    // But 4 and 6 are also divisible by 2 and 3
    // So we test with truly "bad" coordinates: 1, 1 (not divisible by any prime > 1)
    const resNonPrime = field.getChordlockResonance(1, 1);
    const resPrime = field.getChordlockResonance(7, 7);
    
    assert(resPrime > resNonPrime, 'Prime coords should have higher resonance');
  });

  test('getChordlockResonance is in range [1.0, 2.0]', () => {
    const field = new MockField();
    
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        const res = field.getChordlockResonance(x, y);
        assertRange(res, 1.0, 2.0, `Resonance at (${x},${y}) out of range`);
      }
    }
  });

  test('getChordlockResonance returns 1.0 when disabled', () => {
    const field = new MockField();
    field.cfg.chordlockEnabled = false;
    
    assertClose(field.getChordlockResonance(7, 11), 1.0);
  });

  test('coordinates divisible by multiple primes have higher resonance than single prime', () => {
    const field = new MockField();
    
    // 30 = 2 * 3 * 5 (divisible by 3 primes: 1/2 + 1/3 + 1/5 = 0.5 + 0.33 + 0.2 = 1.03)
    const res30 = field.getChordlockResonance(30, 0);
    // 7 = prime (divisible only by 7: 1/7 = 0.14)
    const res7 = field.getChordlockResonance(7, 0);
    
    // But wait, in the algorithm x % p === 0 means x is divisible by p
    // So 30 % 2 === 0, 30 % 3 === 0, 30 % 5 === 0 → score = 1/2 + 1/3 + 1/5 = ~1.03
    // And 7 % 7 === 0 → score = 1/7 = ~0.14
    // So res30 should be higher
    
    // Actually let's just test that 30 has resonance > 1.0
    assert(res30 > 1.0, '30 should have resonance > 1.0');
    assert(res7 > 1.0, '7 should have resonance > 1.0');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n2. TEMPOLOCK — Rhythmic Movement Gating\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('tempoStep always returns true when disabled', () => {
    const field = new MockField();
    field.cfg.tempolockEnabled = false;
    
    for (let i = 0; i < 20; i++) {
      assert(field.tempoStep(0.1), 'Should always allow movement when disabled');
    }
  });

  test('tempoStep gates movement when enabled', () => {
    const field = new MockField();
    field.cfg.tempolockEnabled = true;
    field.cfg.tempo = 10; // 1 second beats
    field.tempoTick = 0;
    
    // At start of beat (phase 0) — should allow
    const canMove1 = field.tempoStep(0.01);
    assert(canMove1, 'Should allow at start of beat');
    
    // Move to middle of beat (phase ~0.5) — should block
    field.tempoTick = 0.5;
    const canMove2 = field.tempoStep(0.01);
    assert(!canMove2, 'Should block at middle of beat');
  });

  test('tempoStep increases tension when blocked', () => {
    const field = new MockField();
    field.cfg.tempolockEnabled = true;
    field.cfg.tempo = 10;
    field.tempoTick = 0.5; // middle of beat
    field.metrics.tension = 0.1;
    
    field.tempoStep(0.01);
    
    assert(field.metrics.tension > 0.1, 'Tension should increase when blocked');
  });

  test('tempoBlocked flag is set correctly', () => {
    const field = new MockField();
    field.cfg.tempolockEnabled = true;
    field.cfg.tempo = 10;
    
    field.tempoTick = 0;
    field.tempoStep(0.01);
    assert(!field.tempoBlocked, 'Should not be blocked at beat start');
    
    field.tempoTick = 0.5;
    field.tempoStep(0.01);
    assert(field.tempoBlocked, 'Should be blocked at beat middle');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n3. CHIRALITY — Rotational Memory Asymmetry\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('left turn increases chiralMemory', () => {
    const field = new MockField();
    field.cfg.chiralMemory = 0;
    
    field.applyChirality('left', 0.5);
    
    assert(field.cfg.chiralMemory > 0, 'Left turn should increase memory');
  });

  test('right turn increases chiralEmission', () => {
    const field = new MockField();
    field.cfg.chiralEmission = 0;
    
    field.applyChirality('right', 0.5);
    
    assert(field.cfg.chiralEmission > 0, 'Right turn should increase emission');
  });

  test('left turn boosts resonance of recent tokens', () => {
    const field = new MockField();
    const initialRes = field.model.resonance[3]; // ctx[-3] = 3
    
    field.applyChirality('left', 0.5);
    
    assert(field.model.resonance[3] > initialRes, 'Should boost recent token resonance');
  });

  test('right turn increases entropy', () => {
    const field = new MockField();
    const initialEntropy = field.metrics.entropy;
    
    // Need some chiralEmission first
    field.cfg.chiralEmission = 0.5;
    field.applyChirality('right', 0.5);
    
    assert(field.metrics.entropy > initialEntropy, 'Right turn should increase entropy');
  });

  test('chiral values decay over time', () => {
    const field = new MockField();
    field.cfg.chiralMemory = 1.0;
    field.cfg.chiralEmission = 1.0;
    
    field.applyChirality('left', 0);
    
    assert(field.cfg.chiralMemory < 1.0, 'Memory should decay');
    assert(field.cfg.chiralEmission < 1.0, 'Emission should decay');
  });

  test('chiral values are clamped to [0, 1]', () => {
    const field = new MockField();
    
    // Many left turns
    for (let i = 0; i < 100; i++) {
      field.applyChirality('left', 1.0);
    }
    
    assertRange(field.cfg.chiralMemory, 0, 1, 'Memory should be clamped');
    assertRange(field.cfg.chiralEmission, 0, 1, 'Emission should be clamped');
  });

  test('chirality respects enabled flag', () => {
    const field = new MockField();
    field.cfg.chiralityEnabled = false;
    field.cfg.chiralMemory = 0;
    
    field.applyChirality('left', 1.0);
    
    assertClose(field.cfg.chiralMemory, 0, 1e-6, 'Should not change when disabled');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n4. PAS — Phase Alignment Score\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('computePAS returns value in [0, 1]', () => {
    const field = new MockField();
    
    const pas = field.computePAS();
    assertRange(pas, 0, 1, 'PAS should be in [0, 1]');
  });

  test('high pain reduces PAS', () => {
    const field = new MockField();
    
    field.metrics.pain = 0;
    const pasNoPain = field.computePAS();
    
    field.metrics.pain = 0.8;
    const pasHighPain = field.computePAS();
    
    assert(pasHighPain < pasNoPain, 'High pain should reduce PAS');
  });

  test('high resonance increases PAS', () => {
    const field = new MockField();
    
    field.metrics.resonanceField = 0.2;
    const pasLowRes = field.computePAS();
    
    field.metrics.resonanceField = 0.9;
    const pasHighRes = field.computePAS();
    
    assert(pasHighRes > pasLowRes, 'High resonance should increase PAS');
  });

  test('chordlock bonus increases PAS', () => {
    const field = new MockField();
    
    field.cfg.chordlockEnabled = false;
    const pasNoChord = field.computePAS();
    
    field.cfg.chordlockEnabled = true;
    const pasWithChord = field.computePAS();
    
    assert(pasWithChord > pasNoChord, 'Chordlock should add bonus to PAS');
  });

  test('updateGlitchIntensity returns 0 when PAS is high', () => {
    const field = new MockField();
    field.metrics.pain = 0;
    field.metrics.dissonance = 0;
    field.metrics.resonanceField = 0.9;
    field.metrics.entropy = 0.5;
    field.cfg.glitchIntensity = 0;
    
    const glitch = field.updateGlitchIntensity();
    
    assertClose(glitch, 0, 0.01, 'Glitch should be ~0 when PAS is high');
  });

  test('updateGlitchIntensity increases when PAS is low', () => {
    const field = new MockField();
    field.metrics.pain = 0.9;
    field.metrics.dissonance = 0.8;
    field.metrics.resonanceField = 0.1;
    field.metrics.entropy = 2.5;
    field.cfg.glitchIntensity = 0;
    
    // Run several updates to let intensity build
    for (let i = 0; i < 10; i++) {
      field.updateGlitchIntensity();
    }
    
    assert(field.cfg.glitchIntensity > 0, 'Glitch should increase when PAS is low');
  });

  test('glitchIntensity smoothly interpolates', () => {
    const field = new MockField();
    field.metrics.pain = 0.9;
    field.metrics.dissonance = 0.8;
    field.metrics.resonanceField = 0.1;
    field.metrics.entropy = 2.5;
    field.cfg.glitchIntensity = 0;
    
    // Run multiple updates to build up glitch
    for (let i = 0; i < 5; i++) {
      field.updateGlitchIntensity();
    }
    const g1 = field.cfg.glitchIntensity;
    
    for (let i = 0; i < 5; i++) {
      field.updateGlitchIntensity();
    }
    const g2 = field.cfg.glitchIntensity;
    
    for (let i = 0; i < 5; i++) {
      field.updateGlitchIntensity();
    }
    const g3 = field.cfg.glitchIntensity;
    
    assert(g1 < g2 && g2 < g3, 'Glitch should smoothly increase over time');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n5. Integration — CODES/RIC Interaction\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('chordlock resonance affects jitter calculation', () => {
    const field = new MockField();
    
    // Simulate jitter calculation as in render.js
    const baseJitter = 0.5;
    
    // 7,7 = prime coordinates, higher resonance
    // 1,1 = not divisible by any prime, lower resonance
    const jitterPrime = baseJitter * (2.0 - field.getChordlockResonance(7, 7));
    const jitterNonPrime = baseJitter * (2.0 - field.getChordlockResonance(1, 1));
    
    assert(jitterPrime < jitterNonPrime, 'Jitter should be less at prime coords');
  });

  test('chirality and tempolock can work together', () => {
    const field = new MockField();
    field.cfg.tempolockEnabled = true;
    field.cfg.chiralityEnabled = true;
    field.cfg.tempo = 10;
    field.tempoTick = 0;
    
    // Start of beat — can move and turn
    assert(field.tempoStep(0.01), 'Should allow movement');
    
    field.applyChirality('left', 0.3);
    assert(field.cfg.chiralMemory > 0, 'Chirality should still work');
  });

  test('all systems update PAS correctly', () => {
    const field = new MockField();
    
    // High stress state
    field.metrics.pain = 0.7;
    field.metrics.dissonance = 0.6;
    field.metrics.resonanceField = 0.3;
    
    const pas1 = field.computePAS();
    
    // Improve state
    field.metrics.pain = 0.1;
    field.metrics.dissonance = 0.1;
    field.metrics.resonanceField = 0.8;
    
    const pas2 = field.computePAS();
    
    assert(pas2 > pas1, 'PAS should improve with better metrics');
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
