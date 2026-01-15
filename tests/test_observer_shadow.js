// test_observer_shadow.js — Observer Shadow Layer tests
// "the shadow is the externalized function of observation"

import { ObserverShadow, ObjectShadow } from '../src/observer_shadow.js';

let passed = 0, failed = 0;

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log('\n👤 Observer Shadow Tests\n');
console.log('='.repeat(50) + '\n');

// ─────────────────────────────────────────────────────────────────────────────
console.log('1. ObserverShadow — initialization\n');
// ─────────────────────────────────────────────────────────────────────────────

test('has two clocks', () => {
  const shadow = new ObserverShadow();
  assert(typeof shadow.t_sys === 'number', 't_sys');
  assert(typeof shadow.t_obs === 'number', 't_obs');
});

test('has kinematics', () => {
  const shadow = new ObserverShadow();
  assert(typeof shadow.phase === 'number', 'phase');
  assert(typeof shadow.angle === 'number', 'angle');
  assert(typeof shadow.length === 'number', 'length');
  assert(typeof shadow.jitter === 'number', 'jitter');
  assert(shadow.direction.x !== undefined, 'direction.x');
});

test('has variance (personality)', () => {
  const shadow = new ObserverShadow();
  assert(typeof shadow.echo === 'number', 'echo');
  assert(typeof shadow.friction === 'number', 'friction');
  assert(typeof shadow.patience === 'number', 'patience');
  assert(typeof shadow.mirror === 'number', 'mirror');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. ObserverShadow — time mechanics\n');
// ─────────────────────────────────────────────────────────────────────────────

test('update computes phase from t_sys', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  assert(shadow.phase >= 0 && shadow.phase <= 1, 'phase in [0,1]');
});

test('getConflict returns 0 when synced', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  shadow.syncTime();
  assert(shadow.getConflict() === 0, 'conflict = 0');
});

test('getConflict increases with time drift', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  shadow.addTimeDrift(3 * 3600 * 1000); // +3 hours
  const conflict = shadow.getConflict();
  assert(conflict > 0, 'conflict > 0');
  assert(conflict < 1, 'conflict < 1 (3h < 6h tau)');
});

test('getConflict saturates at 1', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  shadow.addTimeDrift(12 * 3600 * 1000); // +12 hours
  const conflict = shadow.getConflict();
  assert(conflict === 1, 'conflict saturates at 1');
});

test('setObserverTime allows direct control', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  const before = shadow.t_obs;
  shadow.setObserverTime(99999);
  assert(shadow.t_obs === 99999, 'observer time set');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. ObserverShadow — kinematics\n');
// ─────────────────────────────────────────────────────────────────────────────

test('direction is unit vector', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  const len = Math.hypot(shadow.direction.x, shadow.direction.y);
  assert(Math.abs(len - 1) < 0.001, `direction length = ${len}`);
});

test('length varies with light phase', () => {
  const shadow = new ObserverShadow();

  // Simulate noon (phase ~0.5)
  shadow.sessionStart = Date.now() - 12 * 3600 * 1000;
  shadow.update(0);
  const noonLen = shadow.length;

  // Simulate midnight (phase ~0)
  shadow.sessionStart = Date.now();
  shadow.update(0);
  const midnightLen = shadow.length;

  // Shadow should be longer at night
  assert(midnightLen > noonLen || Math.abs(midnightLen - noonLen) < 0.5,
    `midnight=${midnightLen}, noon=${noonLen}`);
});

test('jitter increases with conflict', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  shadow.syncTime();
  const j0 = shadow.jitter;

  shadow.addTimeDrift(6 * 3600 * 1000); // +6 hours (= tau)
  shadow.update(0);
  const j1 = shadow.jitter;

  assert(j1 > j0, `jitter increased: ${j0} -> ${j1}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4. ObserverShadow — position\n');
// ─────────────────────────────────────────────────────────────────────────────

test('getPosition returns coords', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  const pos = shadow.getPosition({ x: 10, y: 10 });
  assert(typeof pos.x === 'number', 'x');
  assert(typeof pos.y === 'number', 'y');
});

test('shadow position differs from observer', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  const obs = { x: 10, y: 10 };
  const pos = shadow.getPosition(obs);
  const dist = Math.hypot(pos.x - obs.x, pos.y - obs.y);
  assert(dist > 0.5, `shadow offset = ${dist}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5. ObserverShadow — light phase\n');
// ─────────────────────────────────────────────────────────────────────────────

test('getLightPhase returns valid phase', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  const phase = shadow.getLightPhase();
  assert(['night', 'dawn', 'day', 'dusk'].includes(phase), `phase = ${phase}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n6. ObserverShadow — variance update\n');
// ─────────────────────────────────────────────────────────────────────────────

test('updateVariance changes from traces', () => {
  const shadow = new ObserverShadow();
  const initialFriction = shadow.friction;

  // Simulate traces with many switches
  const traces = [];
  for (let i = 0; i < 10; i++) {
    traces.push({ action: i % 2 === 0 ? 'A' : 'B', d_coherence: 0.01 });
  }

  shadow.updateVariance(traces);
  // Friction should change (either direction is fine, just testing it moves)
  assert(shadow.friction !== initialFriction || shadow.mirror !== 0.2,
    'variance should update');
});

test('updateVariance handles empty traces', () => {
  const shadow = new ObserverShadow();
  shadow.updateVariance([]);
  shadow.updateVariance(null);
  assert(true, 'no crash');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n7. ObjectShadow\n');
// ─────────────────────────────────────────────────────────────────────────────

test('ObjectShadow has entity and scale', () => {
  const entity = { x: 5, y: 5 };
  const objShadow = new ObjectShadow(entity, 1.2);
  assert(objShadow.entity === entity, 'entity');
  assert(objShadow.shadowScale === 1.2, 'scale');
});

test('ObjectShadow getPosition returns coords', () => {
  const entity = { x: 5, y: 5 };
  const objShadow = new ObjectShadow(entity);
  const obsShadow = new ObserverShadow();
  obsShadow.update(0);

  const pos = objShadow.getPosition(obsShadow, { x: 10, y: 10 });
  assert(typeof pos.x === 'number', 'x');
  assert(typeof pos.y === 'number', 'y');
});

test('ObjectShadow occludes when observer close', () => {
  const entity = { x: 5, y: 5 };
  const objShadow = new ObjectShadow(entity);
  const obsShadow = new ObserverShadow();
  obsShadow.update(0);

  // Observer far
  const posFar = objShadow.getPosition(obsShadow, { x: 20, y: 20 });
  const distFar = Math.hypot(posFar.x - entity.x, posFar.y - entity.y);

  // Observer close
  const posClose = objShadow.getPosition(obsShadow, { x: 6, y: 6 });
  const distClose = Math.hypot(posClose.x - entity.x, posClose.y - entity.y);

  assert(distClose < distFar, `close=${distClose}, far=${distFar}`);
});

test('ObjectShadow mode changes on occlusion', () => {
  const entity = { x: 5, y: 5 };
  const objShadow = new ObjectShadow(entity);
  const obsShadow = new ObserverShadow();
  obsShadow.update(0);

  objShadow.getPosition(obsShadow, { x: 20, y: 20 });
  assert(objShadow.mode === 'normal', 'far = normal');

  objShadow.getPosition(obsShadow, { x: 5, y: 5 });
  assert(objShadow.mode === 'occluded', 'close = occluded');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n8. ObserverShadow — getState\n');
// ─────────────────────────────────────────────────────────────────────────────

test('getState returns complete snapshot', () => {
  const shadow = new ObserverShadow();
  shadow.update(0);
  const state = shadow.getState();

  assert(typeof state.t_sys === 'number', 't_sys');
  assert(typeof state.conflict === 'number', 'conflict');
  assert(typeof state.phase === 'number', 'phase');
  assert(typeof state.lightPhase === 'string', 'lightPhase');
  assert(state.variance !== undefined, 'variance');
});

// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(50));
console.log(`\n📊 ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
