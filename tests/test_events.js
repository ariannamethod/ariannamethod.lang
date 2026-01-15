// test_events.js — Async Core tests
// EventBus + AsyncField — архитектурный async принцип

import { EventBus, FieldEvent, AsyncField } from '../src/events.js';

class MockField {
  constructor() {
    this.metrics = { emergence: 0.5, pain: 0.3, dissonance: 0.2 };
  }
  step(px, py, pa, dt) {
    return { x: px + 0.1, y: py + 0.1, didJump: false };
  }
}

let passed = 0, failed = 0;

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

async function testAsync(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

async function runTests() {
  console.log('\n🔄 Async Core Tests\n');
  console.log('='.repeat(50) + '\n');

  console.log('1. EventBus\n');

  test('EventBus.on subscribes', () => {
    const bus = new EventBus();
    let got = null;
    bus.on(FieldEvent.STEP, d => got = d);
    bus.emit(FieldEvent.STEP, { x: 1 });
    assert(got?.x === 1, 'should receive data');
  });

  test('EventBus.once fires once', () => {
    const bus = new EventBus();
    let count = 0;
    bus.once(FieldEvent.STEP, () => count++);
    bus.emit(FieldEvent.STEP, {});
    bus.emit(FieldEvent.STEP, {});
    assert(count === 1, `got ${count}`);
  });

  test('EventBus.off unsubscribes', () => {
    const bus = new EventBus();
    let count = 0;
    const h = () => count++;
    bus.on(FieldEvent.STEP, h);
    bus.emit(FieldEvent.STEP, {});
    bus.off(FieldEvent.STEP, h);
    bus.emit(FieldEvent.STEP, {});
    assert(count === 1, `got ${count}`);
  });

  test('on returns unsub function', () => {
    const bus = new EventBus();
    let count = 0;
    const unsub = bus.on(FieldEvent.STEP, () => count++);
    bus.emit(FieldEvent.STEP, {});
    unsub();
    bus.emit(FieldEvent.STEP, {});
    assert(count === 1, `got ${count}`);
  });

  await testAsync('emitAsync waits', async () => {
    const bus = new EventBus();
    let done = false;
    bus.on(FieldEvent.STEP, async () => {
      await new Promise(r => setTimeout(r, 10));
      done = true;
    });
    await bus.emitAsync(FieldEvent.STEP, {});
    assert(done, 'should wait');
  });

  console.log('\n2. AsyncField\n');

  await testAsync('step emits STEP', async () => {
    const bus = new EventBus();
    const af = new AsyncField(new MockField(), bus);
    let got = false;
    bus.on(FieldEvent.STEP, () => got = true);
    await af.step(0, 0, 0, 1);
    assert(got, 'should emit');
  });

  await testAsync('step emits PAIN_SPIKE on cross', async () => {
    const bus = new EventBus();
    const field = new MockField();
    field.metrics.pain = 0.5;
    const af = new AsyncField(field, bus);
    let got = false;
    bus.on(FieldEvent.PAIN_SPIKE, () => got = true);
    field.step = () => { field.metrics.pain = 0.9; return {}; };
    await af.step(0, 0, 0, 1);
    assert(got, 'should emit');
  });

  await testAsync('step emits JUMP on wormhole', async () => {
    const bus = new EventBus();
    const field = new MockField();
    field.step = () => ({ x: 10, y: 10, didJump: true });
    const af = new AsyncField(field, bus);
    let got = false;
    bus.on(FieldEvent.JUMP, () => got = true);
    await af.step(0, 0, 0, 1);
    assert(got, 'should emit');
  });

  await testAsync('waitFor resolves', async () => {
    const bus = new EventBus();
    const af = new AsyncField(new MockField(), bus);
    setTimeout(() => bus.emit(FieldEvent.EMERGENCE_SPIKE, { v: 1 }), 20);
    const d = await af.waitFor(FieldEvent.EMERGENCE_SPIKE, 500);
    assert(d.v === 1, 'should get data');
  });

  console.log('\n3. FieldEvent constants\n');

  test('has core events', () => {
    assert(FieldEvent.STEP === 'field:step', 'STEP');
    assert(FieldEvent.JUMP === 'field:jump', 'JUMP');
  });

  test('has entity events', () => {
    assert(FieldEvent.SHADOW_APPROACH === 'entity:shadow_approach', 'SHADOW');
    assert(FieldEvent.FACE_EMERGE === 'entity:face_emerge', 'FACE');
  });

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
