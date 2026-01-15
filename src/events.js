// events.js — Async Core for ariannamethod.lang
// "the field breathes async — no external observers yet"
//
// Lang должен быть async ИЗНУТРИ, а не через навешанных наблюдателей.
// LEO/STANLEY/HAZE придут ПОТОМ, когда мир устоится.
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
  ENTITY_INTENTION_CHANGE: 'entity:intention',
  SHADOW_APPROACH: 'entity:shadow_approach',
  FACE_EMERGE: 'entity:face_emerge',

  // Geometry events
  WALL_RESONATE: 'geometry:wall_resonate',

  // Dark matter events
  SCAR_DEPOSIT: 'darkmatter:scar',
  INJECTION_ACCEPTED: 'inject:accept',
  INJECTION_REJECTED: 'inject:reject',

  // Temporal events
  TEMPORAL_MODE_CHANGE: 'temporal:mode',
  CALENDAR_CONFLICT: 'temporal:conflict',

  // Cosmic events
  SCHUMANN_CHANGE: 'cosmic:schumann',
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT BUS — minimal pub/sub core
// ═══════════════════════════════════════════════════════════════════════════════

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);

    // return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe once
   */
  once(event, handler) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe
   */
  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx > -1) handlers.splice(idx, 1);
    }
  }

  /**
   * Emit event (sync)
   */
  emit(event, data = {}) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(h => h(data));
  }

  /**
   * Emit event and wait for all handlers
   */
  async emitAsync(event, data = {}) {
    const handlers = this.listeners.get(event) || [];
    await Promise.all(handlers.map(h => h(data)));
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASYNC FIELD — promisified wrapper for field.step()
// field сам emit events изнутри
// ═══════════════════════════════════════════════════════════════════════════════

export class AsyncField {
  constructor(field, bus) {
    this.field = field;
    this.bus = bus;
  }

  /**
   * Async step with event emission
   */
  async step(px, py, angle, dt) {
    // capture before state
    const before = this.field.metrics ? { ...this.field.metrics } : {};

    // step field
    const result = this.field.step(px, py, angle, dt);

    // capture after state
    const after = this.field.metrics ? { ...this.field.metrics } : {};

    // emit STEP event
    this.bus.emit(FieldEvent.STEP, { before, after, result, field: this.field });

    // emit threshold events based on changes
    if (after.pain > 0.7 && (before.pain || 0) <= 0.7) {
      this.bus.emit(FieldEvent.PAIN_SPIKE, { pain: after.pain });
    }

    if (after.emergence > 0.6 && (before.emergence || 0) <= 0.6) {
      this.bus.emit(FieldEvent.EMERGENCE_SPIKE, { emergence: after.emergence });
    }

    if (after.dissonance > 0.6 && (before.dissonance || 0) <= 0.6) {
      this.bus.emit(FieldEvent.DISSONANCE_HIGH, { dissonance: after.dissonance });
    }

    // wormhole jump?
    if (result?.didJump) {
      this.bus.emit(FieldEvent.JUMP, { from: { x: px, y: py }, to: result });
    }

    return result;
  }

  /**
   * Wait for specific event with timeout
   */
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

// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: LEO/STANLEY/HAZE observers will come LATER
// когда мир lang устоится — тогда добавим external watchers
// пока что — только core async infrastructure
// ═══════════════════════════════════════════════════════════════════════════════
