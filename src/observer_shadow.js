// observer_shadow.js — Observer Shadow Layer for ariannamethod.lang
//
// The shadow is NOT a second person.
// The shadow is the EXTERNALIZED FUNCTION OF OBSERVATION.
// It watches the observer, not the world.
// For the field: both observer and shadow are GUESTS.
//
// Key mechanics:
// - t_sys = system time (field's clock)
// - t_obs = observer time (can drift, jump, disagree)
// - Δt = time conflict — bigger = stranger/more autonomous shadow
// - Same transitions in probability geometry, different coordinates in render
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVER SHADOW — meta-observer anchored in time
// ═══════════════════════════════════════════════════════════════════════════════

export class ObserverShadow {
  constructor() {
    // Two clocks
    this.sessionStart = Date.now();
    this.t_sys = 0;           // system time (ms from session start)
    this.t_obs = 0;           // observer time (can diverge)

    // Shadow kinematics
    this.phase = 0;           // 0-1 (day cycle)
    this.angle = 0;           // 0-2π
    this.direction = { x: 1, y: 0 };
    this.length = 1.5;
    this.jitter = 0;

    // Shadow variance (personality from observer patterns)
    this.echo = 0.2;          // reflects observer's pattern
    this.friction = 0.2;      // resists quick changes
    this.patience = 0.2;      // holds pattern before decay
    this.mirror = 0.2;        // amplifies observer loops

    // Constants
    this.DAY_MS = 86400000;   // 24 hours in ms
    this.Lmin = 0.6;          // min shadow length
    this.Lmax = 3.0;          // max shadow length
    this.k_len = 0.5;         // conflict length multiplier
    this.tau = 21600000;      // 6 hours — conflict normalization constant
    this.j0 = 0;              // base jitter
    this.j1 = 0.08;           // conflict jitter multiplier
  }

  /**
   * Update shadow state from time
   */
  update(dt) {
    // Update system time
    this.t_sys = Date.now() - this.sessionStart;

    // Observer time (for now same as system; divergence via setObserverTime)
    // In future: can drift from user actions, timezone, etc.

    // Compute phase (0-1 day cycle)
    this.phase = (this.t_sys % this.DAY_MS) / this.DAY_MS;
    this.angle = 2 * Math.PI * this.phase;

    // Direction from angle (rotating over day)
    this.direction.x = Math.cos(this.angle);
    this.direction.y = Math.sin(this.angle);

    // Time conflict
    const deltaT = Math.abs(this.t_obs - this.t_sys);
    const conflict = Math.min(deltaT / this.tau, 1);

    // Length: longer at low light, affected by conflict
    // cos gives: phase 0 (midnight) -> light 0, phase 0.5 (noon) -> light 1
    const light = 0.5 - 0.5 * Math.cos(this.angle);
    const base_len = this.Lmin + (this.Lmax - this.Lmin) * (1 - light);
    this.length = base_len * (1 + this.k_len * conflict);

    // Jitter: increases with conflict
    this.jitter = this.j0 + this.j1 * conflict;
  }

  /**
   * Get shadow position given observer position
   * S(t) = O(t) + dir * len + jitter
   */
  getPosition(observer) {
    const jitterX = (Math.random() - 0.5) * 2 * this.jitter;
    const jitterY = (Math.random() - 0.5) * 2 * this.jitter;

    return {
      x: observer.x + this.direction.x * this.length + jitterX,
      y: observer.y + this.direction.y * this.length + jitterY,
    };
  }

  /**
   * Get current time conflict (0-1)
   */
  getConflict() {
    const deltaT = Math.abs(this.t_obs - this.t_sys);
    return Math.min(deltaT / this.tau, 1);
  }

  /**
   * Get light phase (discrete bucket)
   */
  getLightPhase() {
    if (this.phase < 0.20 || this.phase >= 0.80) return 'night';
    if (this.phase < 0.30) return 'dawn';
    if (this.phase < 0.70) return 'day';
    return 'dusk';
  }

  /**
   * Set observer time (for testing/simulating time conflict)
   */
  setObserverTime(ms) {
    this.t_obs = ms;
  }

  /**
   * Sync observer time to system time (resolve conflict)
   */
  syncTime() {
    this.t_obs = this.t_sys;
  }

  /**
   * Add time drift (observer perceives different time)
   */
  addTimeDrift(deltaMs) {
    this.t_obs += deltaMs;
  }

  /**
   * Update variance from observer behavior traces
   */
  updateVariance(traces) {
    if (!traces || traces.length < 5) return;

    const recent = traces.slice(-10);

    // Count action switches
    let switches = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].action !== recent[i - 1].action) switches++;
    }
    const switchRate = switches / recent.length;

    // Count loops (repeated actions)
    const actionCounts = {};
    recent.forEach(t => {
      actionCounts[t.action] = (actionCounts[t.action] || 0) + 1;
    });
    const maxRepeat = Math.max(...Object.values(actionCounts));
    const loopScore = maxRepeat / recent.length;

    // Stability: low switches = high stability
    const stability = 1 - switchRate;

    // Coherence gain (sum of d_coherence)
    const coherenceGain = recent.reduce((s, t) => s + (t.d_coherence || 0), 0);

    // Update variance (slowly, bounded)
    const alpha = 0.05;
    this.friction = clamp(this.friction + alpha * (switchRate - 0.3), 0, 1);
    this.mirror = clamp(this.mirror + alpha * loopScore, 0, 1);
    this.patience = clamp(this.patience + alpha * stability, 0, 1);
    this.echo = clamp(this.echo + alpha * coherenceGain, 0, 1);
  }

  /**
   * Get shadow state for debugging/HUD
   */
  getState() {
    return {
      t_sys: this.t_sys,
      t_obs: this.t_obs,
      conflict: this.getConflict(),
      phase: this.phase,
      lightPhase: this.getLightPhase(),
      length: this.length,
      jitter: this.jitter,
      variance: {
        echo: this.echo,
        friction: this.friction,
        patience: this.patience,
        mirror: this.mirror,
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECT SHADOW — shadow for entities (walls, houses, faces, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

export class ObjectShadow {
  constructor(entity, shadowScale = 1.0) {
    this.entity = entity;
    this.shadowScale = shadowScale;
    this.mode = 'normal';     // normal | split | warped | occluded
  }

  /**
   * Get object shadow position
   * Uses observer shadow direction/length, modified by proximity occlusion
   */
  getPosition(observerShadow, observerPos) {
    const dir = observerShadow.direction;
    const len = observerShadow.length * this.shadowScale;

    const basePos = {
      x: this.entity.x + dir.x * len,
      y: this.entity.y + dir.y * len,
    };

    // Proximity occlusion: when observer is close, shadow shortens
    const dist = Math.hypot(
      this.entity.x - observerPos.x,
      this.entity.y - observerPos.y
    );
    const R = 5;              // occlusion radius
    const k_occ = 0.5;        // occlusion strength

    if (dist < R) {
      const prox = 1 - dist / R;
      const damping = 1 - k_occ * prox;

      // Apply damping to shadow offset from entity
      const offsetX = (basePos.x - this.entity.x) * damping;
      const offsetY = (basePos.y - this.entity.y) * damping;

      basePos.x = this.entity.x + offsetX;
      basePos.y = this.entity.y + offsetY;

      this.mode = 'occluded';
    } else {
      this.mode = 'normal';
    }

    return basePos;
  }

  /**
   * Set shadow scale (e.g., from entity "mass" or dark matter)
   */
  setScale(scale) {
    this.shadowScale = clamp(scale, 0.1, 5.0);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
