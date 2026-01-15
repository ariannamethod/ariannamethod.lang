// events.js — Async Core for ariannamethod.lang
// "the field breathes async"
//
// Архитектурный принцип: lang async изнутри.
// Это НЕ внешние наблюдатели — это сам field emit events.
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES — typed events for field state changes
// ═══════════════════════════════════════════════════════════════════════════════

export const FieldEvent = {
  // Core field events
  STEP: 'field:step',
  JUMP: 'field:jump',
  TUNNEL: 'field:tunnel',

  // Metrics thresholds
  PAIN_SPIKE: 'field:pain_spike',
  EMERGENCE_SPIKE: 'field:emergence_spike',
  DISSONANCE_HIGH: 'field:dissonance_high',

  // Entity events
  SHADOW_APPROACH: 'entity:shadow_approach',
  FACE_EMERGE: 'entity:face_emerge',

  // Dark matter events
  SCAR_DEPOSIT: 'darkmatter:scar',
  INJECTION_ACCEPTED: 'inject:accept',
  INJECTION_REJECTED: 'inject:reject',

  // Temporal events
  TEMPORAL_MODE_CHANGE: 'temporal:mode',
  CALENDAR_CONFLICT: 'temporal:conflict',
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT BUS — minimal pub/sub core
// ═══════════════════════════════════════════════════════════════════════════════

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    return this.on(event, wrapper);
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx > -1) handlers.splice(idx, 1);
    }
  }

  emit(event, data = {}) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(h => h(data));
  }

  async emitAsync(event, data = {}) {
    const handlers = this.listeners.get(event) || [];
    await Promise.all(handlers.map(h => h(data)));
  }

  clear() {
    this.listeners.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASYNC FIELD — promisified wrapper, field emits events изнутри
// ═══════════════════════════════════════════════════════════════════════════════

export class AsyncField {
  constructor(field, bus) {
    this.field = field;
    this.bus = bus;
  }

  async step(px, py, angle, dt) {
    const before = this.field.metrics ? { ...this.field.metrics } : {};
    const result = this.field.step(px, py, angle, dt);
    const after = this.field.metrics ? { ...this.field.metrics } : {};

    this.bus.emit(FieldEvent.STEP, { before, after, result });

    if (after.pain > 0.7 && (before.pain || 0) <= 0.7) {
      this.bus.emit(FieldEvent.PAIN_SPIKE, { pain: after.pain });
    }

    if (after.emergence > 0.6 && (before.emergence || 0) <= 0.6) {
      this.bus.emit(FieldEvent.EMERGENCE_SPIKE, { emergence: after.emergence });
    }

    if (result?.didJump) {
      this.bus.emit(FieldEvent.JUMP, { from: { x: px, y: py }, to: result });
    }

    return result;
  }

  waitFor(event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.bus.off(event, handler);
        reject(new Error(`Timeout waiting for ${event}`));
      }, timeout);

      const handler = (data) => {
        clearTimeout(timer);
        this.bus.off(event, handler);
        resolve(data);
      };

      this.bus.on(event, handler);
    });
  }
}
