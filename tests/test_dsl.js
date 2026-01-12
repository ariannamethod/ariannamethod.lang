// test_dsl.js — DSL parsing and command tests (brutal, like Stanley)
// "make it hurt. make it true."
//
// Run: node tests/test_dsl.js
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
    throw new Error(msg || `Expected ${a} ≈ ${b}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DSL Parser (simulated from dsl.js)
// ═══════════════════════════════════════════════════════════════════════════════

function clamp01(x) { 
  x = Number.isFinite(x) ? x : 0; 
  return Math.max(0, Math.min(1, x)); 
}

function clamp(x, a, b) { 
  x = Number.isFinite(x) ? x : a; 
  return Math.max(a, Math.min(b, x)); 
}

function clampInt(x, a, b) { 
  x = Number.isFinite(x) ? x : a; 
  return Math.max(a, Math.min(b, x | 0)); 
}

// Simple DSL parser for testing
function parseDSL(script, cfg) {
  const lines = String(script).split("\n");
  
  for (let raw of lines) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ").trim();
    const C = cmd.toUpperCase();

    if (C === "PROPHECY") {
      cfg.prophecy = clampInt(parseInt(arg, 10), 1, 64);
    } else if (C === "DESTINY") {
      cfg.destiny = clamp01(parseFloat(arg));
    } else if (C === "WORMHOLE") {
      cfg.wormhole = clamp01(parseFloat(arg));
    } else if (C === "CALENDAR_DRIFT") {
      cfg.calendarDrift = parseFloat(arg) || 0;
    } else if (C === "ATTEND_FOCUS") {
      cfg.attendFocus = clamp01(parseFloat(arg));
    } else if (C === "ATTEND_SPREAD") {
      cfg.attendSpread = clamp01(parseFloat(arg));
    } else if (C === "TUNNEL_THRESHOLD") {
      cfg.tunnelThreshold = clamp01(parseFloat(arg));
    } else if (C === "TUNNEL_CHANCE") {
      cfg.tunnelChance = clamp01(parseFloat(arg));
    } else if (C === "TUNNEL_SKIP_MAX") {
      cfg.tunnelSkipMax = clampInt(parseInt(arg, 10), 1, 24);
    } else if (C === "PAIN") {
      cfg.pain = clamp01(parseFloat(arg));
    } else if (C === "TENSION") {
      cfg.tension = clamp01(parseFloat(arg));
    } else if (C === "DISSONANCE") {
      cfg.dissonance = clamp01(parseFloat(arg));
    } else if (C === "JUMP") {
      cfg.pendingJump = (cfg.pendingJump || 0) + (parseInt(arg, 10) || 0);
    }
    // unknown commands are IGNORED (this is intentional!)
  }
  
  return cfg;
}

async function runTests() {
  console.log('\n📜 DSL Parser Tests\n');
  console.log('═'.repeat(60));

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n1. Basic Parsing\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('parses PROPHECY command', () => {
    const cfg = parseDSL('PROPHECY 12', {});
    assert(cfg.prophecy === 12, `Expected 12, got ${cfg.prophecy}`);
  });

  test('parses DESTINY command', () => {
    const cfg = parseDSL('DESTINY 0.75', {});
    assertClose(cfg.destiny, 0.75);
  });

  test('parses WORMHOLE command', () => {
    const cfg = parseDSL('WORMHOLE 0.33', {});
    assertClose(cfg.wormhole, 0.33);
  });

  test('parses ATTEND_FOCUS command', () => {
    const cfg = parseDSL('ATTEND_FOCUS 0.85', {});
    assertClose(cfg.attendFocus, 0.85);
  });

  test('parses ATTEND_SPREAD command', () => {
    const cfg = parseDSL('ATTEND_SPREAD 0.15', {});
    assertClose(cfg.attendSpread, 0.15);
  });

  test('parses TUNNEL_THRESHOLD command', () => {
    const cfg = parseDSL('TUNNEL_THRESHOLD 0.65', {});
    assertClose(cfg.tunnelThreshold, 0.65);
  });

  test('parses TUNNEL_CHANCE command', () => {
    const cfg = parseDSL('TUNNEL_CHANCE 0.30', {});
    assertClose(cfg.tunnelChance, 0.30);
  });

  test('parses TUNNEL_SKIP_MAX command', () => {
    const cfg = parseDSL('TUNNEL_SKIP_MAX 10', {});
    assert(cfg.tunnelSkipMax === 10, `Expected 10, got ${cfg.tunnelSkipMax}`);
  });

  test('parses CALENDAR_DRIFT command', () => {
    const cfg = parseDSL('CALENDAR_DRIFT 11', {});
    assertClose(cfg.calendarDrift, 11);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n2. Clamping\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('PROPHECY clamped to [1, 64]', () => {
    let cfg = parseDSL('PROPHECY 0', {});
    assert(cfg.prophecy === 1, 'Should clamp 0 to 1');
    
    cfg = parseDSL('PROPHECY 100', {});
    assert(cfg.prophecy === 64, 'Should clamp 100 to 64');
    
    cfg = parseDSL('PROPHECY -5', {});
    assert(cfg.prophecy === 1, 'Should clamp -5 to 1');
  });

  test('DESTINY clamped to [0, 1]', () => {
    let cfg = parseDSL('DESTINY 1.5', {});
    assertClose(cfg.destiny, 1.0, 1e-6, 'Should clamp to 1');
    
    cfg = parseDSL('DESTINY -0.5', {});
    assertClose(cfg.destiny, 0.0, 1e-6, 'Should clamp to 0');
  });

  test('TUNNEL_SKIP_MAX clamped to [1, 24]', () => {
    let cfg = parseDSL('TUNNEL_SKIP_MAX 50', {});
    assert(cfg.tunnelSkipMax === 24, 'Should clamp to 24');
    
    cfg = parseDSL('TUNNEL_SKIP_MAX 0', {});
    assert(cfg.tunnelSkipMax === 1, 'Should clamp to 1');
  });

  test('PAIN clamped to [0, 1]', () => {
    let cfg = parseDSL('PAIN 2.0', {});
    assertClose(cfg.pain, 1.0);
    
    cfg = parseDSL('PAIN -1.0', {});
    assertClose(cfg.pain, 0.0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n3. Comments & Whitespace\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('ignores comment lines', () => {
    const cfg = parseDSL(`
      # This is a comment
      PROPHECY 7
      # Another comment
    `, {});
    assert(cfg.prophecy === 7, 'Should parse non-comment lines');
  });

  test('ignores empty lines', () => {
    const cfg = parseDSL(`

      DESTINY 0.5

    `, {});
    assertClose(cfg.destiny, 0.5);
  });

  test('handles leading/trailing whitespace', () => {
    const cfg = parseDSL('   PROPHECY 8   ', {});
    assert(cfg.prophecy === 8, 'Should handle whitespace');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n4. Unknown Commands (MUST be ignored)\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('ignores unknown commands', () => {
    const cfg = parseDSL(`
      PROPHECY 7
      FUTURE_COMMAND 123
      DESTINY 0.5
      IMAGINARY_OPERATOR something
    `, { prophecy: 1, destiny: 0 });
    
    assert(cfg.prophecy === 7, 'Known command should work');
    assertClose(cfg.destiny, 0.5, 1e-6, 'Known command should work');
    assert(cfg.FUTURE_COMMAND === undefined, 'Unknown should be ignored');
  });

  test('wormholes/timetravel as free text is ignored (not crash)', () => {
    // User types "wormholes" or "timetravel" — should not crash
    const cfg = parseDSL(`
      wormholes
      timetravel
      PROPHECY 7
    `, {});
    
    assert(cfg.prophecy === 7, 'Should still parse valid commands');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n5. Case Insensitivity\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('commands are case insensitive', () => {
    let cfg = parseDSL('prophecy 7', {});
    assert(cfg.prophecy === 7, 'lowercase should work');
    
    cfg = parseDSL('Prophecy 8', {});
    assert(cfg.prophecy === 8, 'Mixed case should work');
    
    cfg = parseDSL('PROPHECY 9', {});
    assert(cfg.prophecy === 9, 'UPPERCASE should work');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n6. Multi-line Scripts\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('parses multi-line script', () => {
    const cfg = parseDSL(`
      # Arianna Method DSL
      PROPHECY 7
      DESTINY 0.35
      CALENDAR_DRIFT 11
      WORMHOLE 0.12
      ATTEND_FOCUS 0.70
      ATTEND_SPREAD 0.20
      TUNNEL_THRESHOLD 0.55
      TUNNEL_CHANCE 0.22
    `, {});
    
    assert(cfg.prophecy === 7, 'PROPHECY');
    assertClose(cfg.destiny, 0.35, 1e-6, 'DESTINY');
    assertClose(cfg.calendarDrift, 11, 1e-6, 'CALENDAR_DRIFT');
    assertClose(cfg.wormhole, 0.12, 1e-6, 'WORMHOLE');
    assertClose(cfg.attendFocus, 0.70, 1e-6, 'ATTEND_FOCUS');
    assertClose(cfg.attendSpread, 0.20, 1e-6, 'ATTEND_SPREAD');
    assertClose(cfg.tunnelThreshold, 0.55, 1e-6, 'TUNNEL_THRESHOLD');
    assertClose(cfg.tunnelChance, 0.22, 1e-6, 'TUNNEL_CHANCE');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n7. JUMP Accumulation\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('JUMP accumulates', () => {
    const cfg = parseDSL(`
      JUMP +5
      JUMP +3
      JUMP -2
    `, { pendingJump: 0 });
    
    assert(cfg.pendingJump === 6, `Expected 6, got ${cfg.pendingJump}`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n8. Bad Input Handling\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('handles NaN gracefully', () => {
    const cfg = parseDSL('DESTINY notanumber', {});
    assertClose(cfg.destiny, 0, 1e-6, 'NaN should become 0');
  });

  test('handles empty arg gracefully', () => {
    const cfg = parseDSL('PROPHECY', { prophecy: 5 });
    // parseInt('', 10) is NaN, clampInt handles it
    assert(cfg.prophecy === 1, 'Empty should clamp to min');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n9. Determinism\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('same script produces same state', () => {
    const script = `
      PROPHECY 7
      DESTINY 0.35
      WORMHOLE 0.12
    `;
    
    const cfg1 = parseDSL(script, {});
    const cfg2 = parseDSL(script, {});
    
    assert(cfg1.prophecy === cfg2.prophecy, 'prophecy should match');
    assert(cfg1.destiny === cfg2.destiny, 'destiny should match');
    assert(cfg1.wormhole === cfg2.wormhole, 'wormhole should match');
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
