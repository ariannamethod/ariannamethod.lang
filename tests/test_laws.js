// test_laws.js — Five Invariants tests
// "the field doesn't obey laws — the field IS laws"

import {
  enforceLaw1_EntropyCoherence,
  maxCoherenceFor,
  maxEntropyFor,
  enforceLaw2_NoveltyPrice,
  getTensionFromNovelty,
  enforceLaw3_TensionStabilization,
  getEquilibriumTension,
  enforceLaw4_DriftFromLoops,
  getTransitionResistance,
  enforceLaw5_Anchors,
  createAnchor,
  LawEngine,
} from '../src/laws.js';

let passed = 0, failed = 0;

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

// Mock node
function makeNode(overrides = {}) {
  return {
    entropy: 0.3,
    coherence: 0.4,
    novelty: 0.2,
    tension: 0.3,
    drift: 0.1,
    ...overrides,
  };
}

// Mock traces
function makeTraces(actions) {
  return actions.map(a => ({ action: a }));
}

console.log('\n⚖️  Laws Tests\n');
console.log('='.repeat(50) + '\n');

// ─────────────────────────────────────────────────────────────────────────────
console.log('1. Law 1: Entropy vs Coherence\n');
// ─────────────────────────────────────────────────────────────────────────────

test('valid state passes through', () => {
  const node = makeNode({ entropy: 0.3, coherence: 0.4 });
  const result = enforceLaw1_EntropyCoherence(node);
  assert(!result.enforced, 'should not enforce');
  assert(result.overflow === 0, 'no overflow');
});

test('overflow gets normalized', () => {
  const node = makeNode({ entropy: 0.7, coherence: 0.6 });
  const result = enforceLaw1_EntropyCoherence(node);
  assert(result.enforced, 'should enforce');
  assert(node.entropy + node.coherence <= 1.001, `sum = ${node.entropy + node.coherence}`);
});

test('maxCoherenceFor returns complement', () => {
  assert(maxCoherenceFor(0.3) === 0.7, 'max coh for 0.3');
  assert(maxCoherenceFor(1.0) === 0, 'max coh for 1');
  assert(maxCoherenceFor(0) === 1, 'max coh for 0');
});

test('maxEntropyFor returns complement', () => {
  assert(maxEntropyFor(0.4) === 0.6, 'max ent for 0.4');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. Law 2: Novelty Price\n');
// ─────────────────────────────────────────────────────────────────────────────

test('novelty adds tension', () => {
  const node = makeNode({ novelty: 0.5, tension: 0.2 });
  const result = enforceLaw2_NoveltyPrice(node, 1);
  assert(node.tension > 0.2, 'tension increased');
  assert(result.tensionAdded > 0, 'recorded increase');
});

test('zero novelty adds no tension', () => {
  const node = makeNode({ novelty: 0, tension: 0.3 });
  const result = enforceLaw2_NoveltyPrice(node, 1);
  assert(result.tensionAdded === 0, 'no tension added');
});

test('tension caps at 1', () => {
  const node = makeNode({ novelty: 1.0, tension: 0.95 });
  enforceLaw2_NoveltyPrice(node, 10);
  assert(node.tension === 1, 'capped at 1');
});

test('getTensionFromNovelty returns rate', () => {
  const t = getTensionFromNovelty(0.5);
  assert(t > 0 && t < 1, `tension = ${t}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. Law 3: Tension Stabilization\n');
// ─────────────────────────────────────────────────────────────────────────────

test('tension decays over time', () => {
  const node = makeNode({ tension: 0.8, coherence: 0.5 });
  const result = enforceLaw3_TensionStabilization(node, 1);
  assert(node.tension < 0.8, 'tension decreased');
  assert(result.tensionDecayed > 0, 'recorded decay');
});

test('higher coherence = faster decay', () => {
  const nodeLow = makeNode({ tension: 0.5, coherence: 0.1 });
  const nodeHigh = makeNode({ tension: 0.5, coherence: 0.9 });

  const r1 = enforceLaw3_TensionStabilization(nodeLow, 1);
  const r2 = enforceLaw3_TensionStabilization(nodeHigh, 1);

  assert(r2.decayRate > r1.decayRate, 'high coh faster decay');
});

test('tension does not go negative', () => {
  const node = makeNode({ tension: 0.01 });
  enforceLaw3_TensionStabilization(node, 100);
  assert(node.tension >= 0, 'non-negative');
});

test('getEquilibriumTension computes balance', () => {
  // Low novelty -> equilibrium in range
  const eq = getEquilibriumTension(0.05, 0.5);
  assert(eq > 0 && eq < 1, `equilibrium = ${eq}`);

  // High novelty -> saturates at 1
  const eq2 = getEquilibriumTension(0.8, 0.3);
  assert(eq2 === 1, 'high novelty saturates');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4. Law 4: Drift from Loops\n');
// ─────────────────────────────────────────────────────────────────────────────

test('no loops = no drift increase', () => {
  const node = makeNode({ drift: 0.1 });
  const traces = makeTraces(['A', 'B', 'C', 'D']);
  const result = enforceLaw4_DriftFromLoops(node, traces, 0);
  assert(result.loopCount === 0, 'no loops');
});

test('repeated actions increase drift', () => {
  const node = makeNode({ drift: 0.1 });
  const traces = makeTraces(['A', 'A', 'A', 'A']);
  const result = enforceLaw4_DriftFromLoops(node, traces, 0);
  assert(result.loopCount === 3, 'three repeats');
  assert(result.loopDrift > 0, 'drift added');
});

test('drift decays over time', () => {
  const node = makeNode({ drift: 0.5 });
  const traces = makeTraces(['A', 'B', 'C']);  // no loops
  const result = enforceLaw4_DriftFromLoops(node, traces, 10);
  assert(result.decayed > 0, 'decay happened');
});

test('drift bounded [0, 1]', () => {
  const node = makeNode({ drift: 0.99 });
  const traces = makeTraces(['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A']);
  enforceLaw4_DriftFromLoops(node, traces, 0);
  assert(node.drift <= 1, 'max 1');

  const node2 = makeNode({ drift: 0.01 });
  enforceLaw4_DriftFromLoops(node2, [], 100);
  assert(node2.drift >= 0, 'min 0');
});

test('getTransitionResistance is quadratic', () => {
  const r1 = getTransitionResistance(0.5);
  const r2 = getTransitionResistance(1.0);
  assert(Math.abs(r1 - 0.25) < 0.01, 'r(0.5) = 0.25');
  assert(Math.abs(r2 - 1.0) < 0.01, 'r(1) = 1');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5. Law 5: Anchors\n');
// ─────────────────────────────────────────────────────────────────────────────

test('no anchors = no effect', () => {
  const node = makeNode({ tension: 0.5 });
  const result = enforceLaw5_Anchors(node, [], { x: 0, y: 0 });
  assert(result.totalInfluence === 0, 'no influence');
  assert(node.tension === 0.5, 'unchanged');
});

test('nearby anchor reduces tension', () => {
  const node = makeNode({ tension: 0.5 });
  const anchors = [createAnchor(0, 0, 1.0)];
  const result = enforceLaw5_Anchors(node, anchors, { x: 0.5, y: 0 });
  assert(result.totalInfluence > 0, 'has influence');
  assert(node.tension < 0.5, 'tension reduced');
});

test('far anchor has no effect', () => {
  const node = makeNode({ tension: 0.5 });
  const anchors = [createAnchor(0, 0, 1.0)];
  const result = enforceLaw5_Anchors(node, anchors, { x: 100, y: 100 });
  assert(result.totalInfluence === 0, 'no influence');
  assert(node.tension === 0.5, 'unchanged');
});

test('createAnchor bounds strength', () => {
  const a1 = createAnchor(0, 0, 5);
  assert(a1.strength === 2, 'max 2');

  const a2 = createAnchor(0, 0, -1);
  assert(a2.strength === 0, 'min 0');
});

test('multiple anchors stack', () => {
  const node = makeNode({ tension: 0.8 });
  const anchors = [
    createAnchor(0, 0, 1.0),
    createAnchor(1, 0, 1.0),
  ];
  const result = enforceLaw5_Anchors(node, anchors, { x: 0.5, y: 0 });
  assert(result.totalInfluence > 1, 'stacked influence');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n6. LawEngine\n');
// ─────────────────────────────────────────────────────────────────────────────

test('LawEngine applies all laws', () => {
  const engine = new LawEngine();
  const node = makeNode({ entropy: 0.3, coherence: 0.4, novelty: 0.3, tension: 0.5 });
  const traces = makeTraces(['A', 'B', 'C']);

  const results = engine.applyAll(node, traces, { x: 0, y: 0 }, 1);

  assert(results.law1 !== null, 'law1 applied');
  assert(results.law2 !== null, 'law2 applied');
  assert(results.law3 !== null, 'law3 applied');
  assert(results.law4 !== null, 'law4 applied');
  assert(results.law5 !== null, 'law5 applied');
});

test('LawEngine.addAnchor works', () => {
  const engine = new LawEngine();
  const anchor = engine.addAnchor(5, 5, 1.5);
  assert(engine.anchors.length === 1, 'anchor added');
  assert(anchor.x === 5, 'position');
});

test('LawEngine.pruneAnchors removes old', () => {
  const engine = new LawEngine();
  const a1 = engine.addAnchor(0, 0, 1);
  a1.createdAt = Date.now() - 100000;  // old
  const a2 = engine.addAnchor(1, 1, 1);  // new

  engine.pruneAnchors(50000);
  assert(engine.anchors.length === 1, 'one remains');
  assert(engine.anchors[0] === a2, 'new one kept');
});

test('LawEngine.isValid checks all constraints', () => {
  const engine = new LawEngine();

  const valid = makeNode();
  assert(engine.isValid(valid), 'valid node');

  const invalid1 = makeNode({ entropy: 0.8, coherence: 0.8 });
  assert(!engine.isValid(invalid1), 'entropy+coherence > 1');

  const invalid2 = makeNode({ drift: -0.1 });
  assert(!engine.isValid(invalid2), 'negative metric');

  const invalid3 = makeNode({ tension: 1.5 });
  assert(!engine.isValid(invalid3), 'metric > 1');
});

test('LawEngine.getResults returns copy', () => {
  const engine = new LawEngine();
  const node = makeNode();
  engine.applyAll(node, [], { x: 0, y: 0 }, 1);

  const r1 = engine.getResults();
  const r2 = engine.getResults();
  assert(r1 !== r2, 'different objects');
  assert(r1.law1.enforced === r2.law1.enforced, 'same values');
});

// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(50));
console.log(`\n📊 ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
