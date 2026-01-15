// test_events.js — Async Core tests
// только EventBus + AsyncField — без external observers
//
// LEO/STANLEY/HAZE тесты придут ПОТОМ, когда мир устоится

import { EventBus, FieldEvent, AsyncField } from '../src/events.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK FIELD
// ═══════════════════════════════════════════════════════════════════════════════

class MockField {
  constructor() {
    this.metrics = {
      emergence: 0.5,
      pain: 0.3,
      dissonance: 0.2,
    };
  }
  step(px, py, pa, dt) {
    return { x: px + 0.1, y: py + 0.1, didJump: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FRAMEWORK
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \u2717 ${name}: ${e.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \u2717 ${name}: ${e.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n\ud83d\udd04 Async Core Tests\n');
  console.log('='.repeat(60) + '\n');

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('1. EventBus — pub/sub core\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('EventBus can be instantiated', () => {
    const bus = new EventBus();
    assert(bus.listeners instanceof Map, 'should have listeners Map');
  });

  test('EventBus.on subscribes to events', () => {
    const bus = new EventBus();
    let received = null;

    bus.on(FieldEvent.STEP, (data) => {
      received = data;
    });

    bus.emit(FieldEvent.STEP, { test: true });
    assert(received !== null, 'handler should be called');
    assert(received.test === true, 'data should be passed');
  });

  test('EventBus.once fires only once', () => {
    const bus = new EventBus();
    let count = 0;

    bus.once(FieldEvent.STEP, () => count++);

    bus.emit(FieldEvent.STEP, {});
    bus.emit(FieldEvent.STEP, {});

    assert(count === 1, `should fire once, got ${count}`);
  });

  test('EventBus.off unsubscribes', () => {
    const bus = new EventBus();
    let count = 0;
    const handler = () => count++;

    bus.on(FieldEvent.STEP, handler);
    bus.emit(FieldEvent.STEP, {});

    bus.off(FieldEvent.STEP, handler);
    bus.emit(FieldEvent.STEP, {});

    assert(count === 1, `should only fire before off, got ${count}`);
  });

  test('EventBus.on returns unsubscribe function', () => {
    const bus = new EventBus();
    let count = 0;

    const unsub = bus.on(FieldEvent.STEP, () => count++);
    bus.emit(FieldEvent.STEP, {});

    unsub();
    bus.emit(FieldEvent.STEP, {});

    assert(count === 1, `should only fire before unsub, got ${count}`);
  });

  await testAsync('EventBus.emitAsync waits for handlers', async () => {
    const bus = new EventBus();
    let resolved = false;

    bus.on(FieldEvent.STEP, async () => {
      await new Promise(r => setTimeout(r, 20));
      resolved = true;
    });

    await bus.emitAsync(FieldEvent.STEP, {});
    assert(resolved === true, 'should wait for async handler');
  });

  test('EventBus.clear removes all listeners', () => {
    const bus = new EventBus();
    bus.on(FieldEvent.STEP, () => {});
    bus.on(FieldEvent.JUMP, () => {});

    bus.clear();

    assert(bus.listeners.size === 0, 'should have no listeners');
  });

  test('EventBus handles multiple listeners', () => {
    const bus = new EventBus();
    const calls = [];

    bus.on(FieldEvent.STEP, () => calls.push('a'));
    bus.on(FieldEvent.STEP, () => calls.push('b'));
    bus.on(FieldEvent.STEP, () => calls.push('c'));

    bus.emit(FieldEvent.STEP, {});

    assert(calls.length === 3, 'should call all handlers');
    assert(calls.join('') === 'abc', 'should call in order');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n2. AsyncField — promisified wrapper\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('AsyncField wraps field with event bus', () => {
    const bus = new EventBus();
    const field = new MockField();
    const asyncField = new AsyncField(field, bus);

    assert(asyncField.field === field, 'should wrap field');
    assert(asyncField.bus === bus, 'should have event bus');
  });

  await testAsync('AsyncField.step emits STEP event', async () => {
    const bus = new EventBus();
    const field = new MockField();
    const asyncField = new AsyncField(field, bus);

    let stepReceived = false;
    bus.on(FieldEvent.STEP, () => { stepReceived = true; });

    await asyncField.step(0, 0, 0, 1);

    assert(stepReceived === true, 'should emit STEP event');
  });

  await testAsync('AsyncField.step emits PAIN_SPIKE on threshold cross', async () => {
    const bus = new EventBus();
    const field = new MockField();
    field.metrics.pain = 0.5; // below threshold
    const asyncField = new AsyncField(field, bus);

    let painReceived = false;
    bus.on(FieldEvent.PAIN_SPIKE, () => { painReceived = true; });

    // first step - pain still below
    await asyncField.step(0, 0, 0, 1);
    assert(painReceived === false, 'should not emit yet');

    // simulate pain spike
    field.step = () => {
      field.metrics.pain = 0.9; // now above threshold
      return { x: 0.1, y: 0.1 };
    };

    await asyncField.step(0, 0, 0, 1);
    assert(painReceived === true, 'should emit PAIN_SPIKE');
  });

  await testAsync('AsyncField.step emits EMERGENCE_SPIKE on threshold cross', async () => {
    const bus = new EventBus();
    const field = new MockField();
    field.metrics.emergence = 0.4; // below threshold
    const asyncField = new AsyncField(field, bus);

    let emergenceReceived = false;
    bus.on(FieldEvent.EMERGENCE_SPIKE, () => { emergenceReceived = true; });

    // simulate emergence spike
    field.step = () => {
      field.metrics.emergence = 0.8;
      return { x: 0.1, y: 0.1 };
    };

    await asyncField.step(0, 0, 0, 1);
    assert(emergenceReceived === true, 'should emit EMERGENCE_SPIKE');
  });

  await testAsync('AsyncField.step emits JUMP on wormhole', async () => {
    const bus = new EventBus();
    const field = new MockField();
    field.step = () => ({ x: 10, y: 10, didJump: true });
    const asyncField = new AsyncField(field, bus);

    let jumpReceived = false;
    bus.on(FieldEvent.JUMP, (data) => {
      jumpReceived = true;
      assert(data.to.x === 10, 'should have destination');
    });

    await asyncField.step(0, 0, 0, 1);
    assert(jumpReceived === true, 'should emit JUMP');
  });

  await testAsync('AsyncField.waitFor resolves on event', async () => {
    const bus = new EventBus();
    const field = new MockField();
    const asyncField = new AsyncField(field, bus);

    const waitPromise = asyncField.waitFor(FieldEvent.EMERGENCE_SPIKE, 1000);

    // emit after short delay
    setTimeout(() => {
      bus.emit(FieldEvent.EMERGENCE_SPIKE, { value: 0.9 });
    }, 50);

    const data = await waitPromise;
    assert(data.value === 0.9, 'should receive event data');
  });

  await testAsync('AsyncField.waitFor rejects on timeout', async () => {
    const bus = new EventBus();
    const field = new MockField();
    const asyncField = new AsyncField(field, bus);

    try {
      await asyncField.waitFor(FieldEvent.EMERGENCE_SPIKE, 50);
      assert(false, 'should have thrown');
    } catch (e) {
      assert(e.message.includes('Timeout'), 'should timeout');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n3. FieldEvent — event type constants\n');
  // ─────────────────────────────────────────────────────────────────────────────

  test('FieldEvent has core events', () => {
    assert(FieldEvent.STEP === 'field:step', 'should have STEP');
    assert(FieldEvent.JUMP === 'field:jump', 'should have JUMP');
    assert(FieldEvent.TUNNEL === 'field:tunnel', 'should have TUNNEL');
  });

  test('FieldEvent has threshold events', () => {
    assert(FieldEvent.PAIN_SPIKE === 'field:pain_spike', 'should have PAIN_SPIKE');
    assert(FieldEvent.EMERGENCE_SPIKE === 'field:emergence_spike', 'should have EMERGENCE_SPIKE');
    assert(FieldEvent.DISSONANCE_HIGH === 'field:dissonance_high', 'should have DISSONANCE_HIGH');
  });

  test('FieldEvent has entity events', () => {
    assert(FieldEvent.SHADOW_APPROACH === 'entity:shadow_approach', 'should have SHADOW_APPROACH');
    assert(FieldEvent.FACE_EMERGE === 'entity:face_emerge', 'should have FACE_EMERGE');
  });

  test('FieldEvent has dark matter events', () => {
    assert(FieldEvent.SCAR_DEPOSIT === 'darkmatter:scar', 'should have SCAR_DEPOSIT');
    assert(FieldEvent.INJECTION_ACCEPTED === 'inject:accept', 'should have INJECTION_ACCEPTED');
    assert(FieldEvent.INJECTION_REJECTED === 'inject:reject', 'should have INJECTION_REJECTED');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n' + '='.repeat(60));
  console.log(`\n\ud83d\udcca Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('\u274c Some tests failed.\n');
    process.exit(1);
  } else {
    console.log('\u2705 Async core ready. LEO/STANLEY/HAZE придут потом.\n');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
