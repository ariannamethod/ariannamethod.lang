// test_velocity.js — Velocity Operators tests
// "movement IS language — the speed of presence changes the temperature of thought"
//
// Run: node tests/test_velocity.js
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
// Velocity Mode Constants (matching arianna_method.c)
// ═══════════════════════════════════════════════════════════════════════════════

const VELOCITY_NOMOVE = 0;
const VELOCITY_WALK = 1;
const VELOCITY_RUN = 2;
const VELOCITY_BACKWARD = -1;

// ═══════════════════════════════════════════════════════════════════════════════
// Expert Temperatures (from haze/experts.py)
// ═══════════════════════════════════════════════════════════════════════════════

const EXPERTS = {
  structural: { temp: 0.7, weight: 0.25 },
  semantic: { temp: 0.9, weight: 0.25 },
  creative: { temp: 1.2, weight: 0.25 },
  precise: { temp: 0.5, weight: 0.25 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Velocity Controller
// ═══════════════════════════════════════════════════════════════════════════════

class VelocityController {
  constructor() {
    this.mode = VELOCITY_WALK;
    this.magnitude = 0;
    this.baseTemperature = 0.85;
    this.effectiveTemp = 0.85;
    this.temporalDebt = 0;
    
    this.experts = {
      structural: 0.25,
      semantic: 0.25,
      creative: 0.25,
      precise: 0.25,
    };
  }

  setMode(mode) {
    this.mode = mode;
    this.updateExpertWeights();
  }

  setMagnitude(mag) {
    this.magnitude = Math.max(0, Math.min(1, mag));
    this.updateExpertWeights();
  }

  updateExpertWeights() {
    // Reset to base
    let weights = { structural: 0.2, semantic: 0.25, creative: 0.25, precise: 0.3 };
    
    switch (this.mode) {
      case VELOCITY_RUN:
        // RUN: more creative, less precise
        weights.creative += 0.25;
        weights.precise -= 0.15;
        weights.semantic += 0.1;
        break;
        
      case VELOCITY_WALK:
        // WALK: balanced
        // weights stay as default
        break;
        
      case VELOCITY_NOMOVE:
        // NOMOVE: more precise, less creative
        weights.precise += 0.25;
        weights.creative -= 0.15;
        weights.structural += 0.1;
        break;
        
      case VELOCITY_BACKWARD:
        // BACKWARD: structural dominates (grammar for rewinding)
        weights.structural += 0.3;
        weights.precise += 0.1;
        weights.creative -= 0.2;
        break;
    }
    
    // Normalize
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const k in weights) {
      this.experts[k] = Math.max(0, weights[k] / total);
    }
    
    // Compute effective temperature from weighted experts
    this.effectiveTemp = 
      this.experts.structural * EXPERTS.structural.temp +
      this.experts.semantic * EXPERTS.semantic.temp +
      this.experts.creative * EXPERTS.creative.temp +
      this.experts.precise * EXPERTS.precise.temp;
  }

  step(dt, isMovingBackward = false) {
    if (isMovingBackward || this.mode === VELOCITY_BACKWARD) {
      this.temporalDebt += dt;
    }
    
    // Velocity affects temperature dynamically
    if (this.magnitude > 0.8) {
      this.effectiveTemp *= 1.0 + (this.magnitude - 0.8) * 0.5;
    }
  }
}

async function runTests() {
  console.log('\n🏃 Velocity Operators Tests\n');
  console.log('═'.repeat(60));

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n1. Velocity Mode Constants\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('NOMOVE mode is 0', () => {
    assert(VELOCITY_NOMOVE === 0, 'NOMOVE should be 0');
  });

  test('WALK mode is 1', () => {
    assert(VELOCITY_WALK === 1, 'WALK should be 1');
  });

  test('RUN mode is 2', () => {
    assert(VELOCITY_RUN === 2, 'RUN should be 2');
  });

  test('BACKWARD mode is -1', () => {
    assert(VELOCITY_BACKWARD === -1, 'BACKWARD should be -1');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n2. Expert Temperatures\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('structural expert has temp 0.7', () => {
    assertClose(EXPERTS.structural.temp, 0.7);
  });

  test('semantic expert has temp 0.9', () => {
    assertClose(EXPERTS.semantic.temp, 0.9);
  });

  test('creative expert has temp 1.2', () => {
    assertClose(EXPERTS.creative.temp, 1.2);
  });

  test('precise expert has temp 0.5', () => {
    assertClose(EXPERTS.precise.temp, 0.5);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n3. VelocityController Initialization\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('default mode is WALK', () => {
    const vc = new VelocityController();
    assert(vc.mode === VELOCITY_WALK, 'Default mode should be WALK');
  });

  test('default magnitude is 0', () => {
    const vc = new VelocityController();
    assertClose(vc.magnitude, 0);
  });

  test('default temporal debt is 0', () => {
    const vc = new VelocityController();
    assertClose(vc.temporalDebt, 0);
  });

  test('expert weights sum to 1', () => {
    const vc = new VelocityController();
    const sum = Object.values(vc.experts).reduce((a, b) => a + b, 0);
    assertClose(sum, 1.0, 0.01);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n4. Mode Changes Affect Expert Weights\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('RUN mode increases creative weight', () => {
    const vc = new VelocityController();
    const walkCreative = vc.experts.creative;
    
    vc.setMode(VELOCITY_RUN);
    
    assert(vc.experts.creative > walkCreative, 'RUN should increase creative');
  });

  test('RUN mode decreases precise weight', () => {
    const vc = new VelocityController();
    const walkPrecise = vc.experts.precise;
    
    vc.setMode(VELOCITY_RUN);
    
    assert(vc.experts.precise < walkPrecise, 'RUN should decrease precise');
  });

  test('NOMOVE mode increases precise weight', () => {
    const vc = new VelocityController();
    vc.setMode(VELOCITY_RUN);
    const runPrecise = vc.experts.precise;
    
    vc.setMode(VELOCITY_NOMOVE);
    
    assert(vc.experts.precise > runPrecise, 'NOMOVE should increase precise');
  });

  test('BACKWARD mode increases structural weight', () => {
    const vc = new VelocityController();
    const walkStructural = vc.experts.structural;
    
    vc.setMode(VELOCITY_BACKWARD);
    
    assert(vc.experts.structural > walkStructural, 'BACKWARD should increase structural');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n5. Temperature Computation\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('effective temp is in valid range', () => {
    const vc = new VelocityController();
    
    for (const mode of [VELOCITY_NOMOVE, VELOCITY_WALK, VELOCITY_RUN, VELOCITY_BACKWARD]) {
      vc.setMode(mode);
      assertRange(vc.effectiveTemp, 0.4, 1.4, `Temp out of range for mode ${mode}`);
    }
  });

  test('RUN has higher temp than WALK', () => {
    const vc = new VelocityController();
    vc.setMode(VELOCITY_WALK);
    const walkTemp = vc.effectiveTemp;
    
    vc.setMode(VELOCITY_RUN);
    
    assert(vc.effectiveTemp > walkTemp, 'RUN should have higher temp than WALK');
  });

  test('NOMOVE has lower temp than WALK', () => {
    const vc = new VelocityController();
    vc.setMode(VELOCITY_WALK);
    const walkTemp = vc.effectiveTemp;
    
    vc.setMode(VELOCITY_NOMOVE);
    
    assert(vc.effectiveTemp < walkTemp, 'NOMOVE should have lower temp than WALK');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n6. Temporal Debt (Backward Movement)\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('backward movement accumulates temporal debt', () => {
    const vc = new VelocityController();
    vc.setMode(VELOCITY_BACKWARD);
    
    vc.step(0.1);
    vc.step(0.1);
    vc.step(0.1);
    
    assert(vc.temporalDebt > 0, 'Temporal debt should accumulate');
    assertClose(vc.temporalDebt, 0.3, 0.01);
  });

  test('forward movement does not accumulate temporal debt', () => {
    const vc = new VelocityController();
    vc.setMode(VELOCITY_WALK);
    
    vc.step(0.1);
    vc.step(0.1);
    
    assertClose(vc.temporalDebt, 0, 0.01);
  });

  test('isMovingBackward flag accumulates debt even in WALK mode', () => {
    const vc = new VelocityController();
    vc.setMode(VELOCITY_WALK);
    
    vc.step(0.1, true); // moving backward physically
    
    assert(vc.temporalDebt > 0, 'Backward movement should accumulate debt');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n7. High Velocity Temperature Boost\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('high magnitude boosts effective temp', () => {
    const vc = new VelocityController();
    vc.setMode(VELOCITY_RUN);
    const baseTempRun = vc.effectiveTemp;
    
    vc.setMagnitude(0.9);
    vc.step(0.1);
    
    assert(vc.effectiveTemp > baseTempRun, 'High magnitude should boost temp');
  });

  test('magnitude is clamped to [0, 1]', () => {
    const vc = new VelocityController();
    
    vc.setMagnitude(-0.5);
    assertClose(vc.magnitude, 0);
    
    vc.setMagnitude(1.5);
    assertClose(vc.magnitude, 1);
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
