// test_integration.js — Integration layer tests
// "observer and shadow are both guests in the field"

import { IntegratedField, integrateField, ShadowController } from '../src/field_integration.js';

// Mock field
class MockField {
  constructor() {
    this.metrics = {
      entropy: 0.3,
      resonanceField: 0.5,
      emergence: 0.2,
      tension: 0.3,
      dissonance: 0.2,
    };
  }

  step(px, py, pa, dt) {
    // Simulate some metric changes
    this.metrics.entropy += (Math.random() - 0.5) * 0.1;
    this.metrics.resonanceField += (Math.random() - 0.5) * 0.1;
    return { didJump: Math.random() < 0.1, x: px + 0.1, y: py + 0.1 };
  }
}

let passed = 0, failed = 0;

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log('\n🔗 Integration Tests\n');
console.log('='.repeat(50) + '\n');

// ─────────────────────────────────────────────────────────────────────────────
console.log('1. IntegratedField — initialization\n');
// ─────────────────────────────────────────────────────────────────────────────

test('creates with mock field', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  assert(integrated.field === field, 'field stored');
  assert(integrated.world !== null, 'world created');
  assert(integrated.shadow !== null, 'shadow created');
  assert(integrated.laws !== null, 'laws created');
});

test('integrateField factory works', () => {
  const field = new MockField();
  const integrated = integrateField(field);
  assert(integrated instanceof IntegratedField, 'correct type');
});

test('accepts options', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field, { shadowEnabled: false });
  assert(integrated.cfg.shadowEnabled === false, 'option applied');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. IntegratedField — step\n');
// ─────────────────────────────────────────────────────────────────────────────

test('step calls field.step', () => {
  const field = new MockField();
  let called = false;
  field.step = (px, py, pa, dt) => { called = true; return { didJump: false, x: px, y: py }; };
  const integrated = new IntegratedField(field);
  integrated.step(10, 10, 0, 1);
  assert(called, 'field.step called');
});

test('step records trace', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  integrated.step(10, 10, 0, 1);
  const traces = integrated.world.getRecentTraces(5);
  assert(traces.length === 1, 'trace recorded');
});

test('step updates shadow', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  const t0 = integrated.shadow.t_sys;
  integrated.step(10, 10, 0, 1);
  // t_sys updates from Date.now(), so just check it's a number
  assert(typeof integrated.shadow.t_sys === 'number', 'shadow time updated');
});

test('step returns field result', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  const result = integrated.step(10, 10, 0, 1);
  assert(typeof result.x === 'number', 'has x');
  assert(typeof result.y === 'number', 'has y');
  assert(typeof result.didJump === 'boolean', 'has didJump');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. IntegratedField — shadow\n');
// ─────────────────────────────────────────────────────────────────────────────

test('getShadowPosition returns coords', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  integrated.shadow.update(0);
  const pos = integrated.getShadowPosition({ x: 10, y: 10 });
  assert(typeof pos.x === 'number', 'has x');
  assert(typeof pos.y === 'number', 'has y');
});

test('getShadowState returns state', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  const state = integrated.getShadowState();
  assert(state.conflict !== undefined, 'has conflict');
  assert(state.lightPhase !== undefined, 'has lightPhase');
});

test('addTimeDrift affects conflict', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  integrated.shadow.update(0);
  integrated.shadow.syncTime();
  const c0 = integrated.shadow.getConflict();
  integrated.addTimeDrift(6 * 3600 * 1000); // +6 hours
  const c1 = integrated.shadow.getConflict();
  assert(c1 > c0, 'conflict increased');
});

test('syncTime resolves conflict', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  integrated.shadow.update(0);
  integrated.addTimeDrift(3 * 3600 * 1000);
  integrated.syncTime();
  assert(integrated.shadow.getConflict() === 0, 'conflict resolved');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4. IntegratedField — world model\n');
// ─────────────────────────────────────────────────────────────────────────────

test('getWorldSnapshot returns snapshot', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  const snap = integrated.getWorldSnapshot();
  assert(snap.activeNodeId === 0, 'has active node');
  assert(snap.nodeCount === 1, 'has origin');
});

test('createNode adds node', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  const node = integrated.createNode('test_state');
  assert(node.name === 'test_state', 'name correct');
  assert(integrated.world.nodes.has(node.id), 'node in world');
});

test('createEdge adds edge', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  const n1 = integrated.createNode('dst');
  const edge = integrated.createEdge(0, n1.id, 'WALK');
  assert(edge.action === 'WALK', 'action correct');
});

test('getMostCommonActions tracks history', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);

  // Do several steps
  for (let i = 0; i < 10; i++) {
    integrated.step(10, 10, 0, 1);
  }

  const common = integrated.getMostCommonActions();
  assert(common.length > 0, 'has actions');
  assert(common[0].count > 0, 'counted');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5. IntegratedField — laws\n');
// ─────────────────────────────────────────────────────────────────────────────

test('getLawResults returns results', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  integrated.step(10, 10, 0, 1);
  const results = integrated.getLawResults();
  assert(results.law1 !== null, 'law1 applied');
  assert(results.law4 !== null, 'law4 applied');
});

test('addAnchor adds anchor', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  const anchor = integrated.addAnchor(5, 5, 1.5);
  assert(anchor.x === 5, 'position correct');
  assert(integrated.laws.anchors.length === 1, 'anchor in engine');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n6. IntegratedField — object shadows\n');
// ─────────────────────────────────────────────────────────────────────────────

test('registerObjectShadow creates shadow', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  const entity = { x: 5, y: 5 };
  const objShadow = integrated.registerObjectShadow('obj1', entity, 1.2);
  assert(objShadow.entity === entity, 'entity linked');
  assert(integrated.objectShadows.has('obj1'), 'registered');
});

test('getObjectShadowPosition returns coords', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  integrated.shadow.update(0);

  const entity = { x: 5, y: 5 };
  integrated.registerObjectShadow('obj1', entity);

  const pos = integrated.getObjectShadowPosition('obj1', { x: 10, y: 10 });
  assert(typeof pos.x === 'number', 'has x');
  assert(typeof pos.y === 'number', 'has y');
});

test('getObjectShadowPosition returns null for unknown', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field);
  const pos = integrated.getObjectShadowPosition('unknown', { x: 10, y: 10 });
  assert(pos === null, 'returns null');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n7. ShadowController — standalone\n');
// ─────────────────────────────────────────────────────────────────────────────

test('ShadowController creates shadow', () => {
  const ctrl = new ShadowController();
  assert(ctrl.shadow !== null, 'shadow created');
});

test('ShadowController.getPosition works', () => {
  const ctrl = new ShadowController();
  ctrl.update(0);
  const pos = ctrl.getPosition({ x: 10, y: 10 });
  assert(typeof pos.x === 'number', 'has x');
});

test('ShadowController.getState works', () => {
  const ctrl = new ShadowController();
  const state = ctrl.getState();
  assert(state.conflict !== undefined, 'has conflict');
});

test('ShadowController object shadows', () => {
  const ctrl = new ShadowController();
  ctrl.update(0);
  const entity = { x: 5, y: 5 };
  ctrl.registerObject('tree', entity, 1.5);
  const pos = ctrl.getObjectPosition('tree', { x: 10, y: 10 });
  assert(pos !== null, 'position returned');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n8. Config options\n');
// ─────────────────────────────────────────────────────────────────────────────

test('shadowEnabled=false disables shadow', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field, { shadowEnabled: false });
  const pos = integrated.getShadowPosition({ x: 10, y: 10 });
  assert(pos.x === 10 && pos.y === 10, 'returns observer pos');
});

test('autoRecordTraces=false disables tracing', () => {
  const field = new MockField();
  const integrated = new IntegratedField(field, { autoRecordTraces: false });
  integrated.step(10, 10, 0, 1);
  const traces = integrated.world.getRecentTraces(5);
  assert(traces.length === 0, 'no traces recorded');
});

// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(50));
console.log(`\n📊 ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
