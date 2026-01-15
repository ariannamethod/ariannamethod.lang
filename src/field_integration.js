// field_integration.js — Integration layer for World Model, Observer Shadow, Laws
//
// This is the SPINE that connects:
// - Field (probability geometry)
// - WorldState (internal geography)
// - ObserverShadow (meta-observer with time conflict)
// - LawEngine (5 invariants)
//
// Both observer and shadow are GUESTS in the field.
// The field doesn't obey laws — the field IS laws.
//
// ═══════════════════════════════════════════════════════════════════════════════

import { WorldState, WorldTrace } from './world.js';
import { ObserverShadow, ObjectShadow } from './observer_shadow.js';
import { LawEngine } from './laws.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATED FIELD — wraps Field with world model + shadow + laws
// ═══════════════════════════════════════════════════════════════════════════════

export class IntegratedField {
  constructor(field, options = {}) {
    this.field = field;

    // World Model — internal geography
    this.world = new WorldState();

    // Observer Shadow — meta-observer
    this.shadow = new ObserverShadow();

    // Law Engine — 5 invariants
    this.laws = new LawEngine();

    // Object shadows (for entities)
    this.objectShadows = new Map();

    // Config
    this.cfg = {
      autoUpdateShadow: true,
      autoApplyLaws: true,
      autoRecordTraces: true,
      shadowEnabled: true,
      ...options,
    };

    // Previous state for delta tracking
    this._prevAction = null;
    this._prevMetrics = null;
  }

  /**
   * Main step — wraps field.step with world model + shadow + laws
   */
  step(px, py, pa, dt) {
    // 1. Update shadow time
    if (this.cfg.shadowEnabled) {
      this.shadow.update(dt);
    }

    // 2. Call underlying field step
    const result = this.field.step(px, py, pa, dt);

    // 3. Determine action from result
    const action = this._inferAction(result, pa);

    // 4. Record trace in world model
    if (this.cfg.autoRecordTraces) {
      this._recordTrace(action, result);
    }

    // 5. Apply laws to current node
    if (this.cfg.autoApplyLaws) {
      this._applyLaws({ x: px, y: py }, dt);
    }

    // 6. Update shadow variance from traces
    if (this.cfg.shadowEnabled && this.cfg.autoUpdateShadow) {
      const traces = this.world.getRecentTraces(10);
      this.shadow.updateVariance(traces);
    }

    // Store for next step
    this._prevAction = action;
    this._prevMetrics = this._captureMetrics();

    return result;
  }

  /**
   * Get shadow position for current observer position
   */
  getShadowPosition(observerPos) {
    if (!this.cfg.shadowEnabled) return observerPos;
    return this.shadow.getPosition(observerPos);
  }

  /**
   * Get shadow state (for HUD/debug)
   */
  getShadowState() {
    return this.shadow.getState();
  }

  /**
   * Get world state snapshot
   */
  getWorldSnapshot() {
    return this.world.getSnapshot();
  }

  /**
   * Get law engine results
   */
  getLawResults() {
    return this.laws.getResults();
  }

  /**
   * Add anchor at position (stabilizes tension)
   */
  addAnchor(x, y, strength = 1.0) {
    return this.laws.addAnchor(x, y, strength);
  }

  /**
   * Register object shadow for entity
   */
  registerObjectShadow(entityId, entity, scale = 1.0) {
    const objShadow = new ObjectShadow(entity, scale);
    this.objectShadows.set(entityId, objShadow);
    return objShadow;
  }

  /**
   * Get object shadow position
   */
  getObjectShadowPosition(entityId, observerPos) {
    const objShadow = this.objectShadows.get(entityId);
    if (!objShadow) return null;
    return objShadow.getPosition(this.shadow, observerPos);
  }

  /**
   * Introduce time conflict (for testing/gameplay)
   */
  addTimeDrift(deltaMs) {
    this.shadow.addTimeDrift(deltaMs);
  }

  /**
   * Sync shadow time to system time (resolve conflict)
   */
  syncTime() {
    this.shadow.syncTime();
  }

  /**
   * Create new world node (internal regime)
   */
  createNode(name) {
    return this.world.addNode(name);
  }

  /**
   * Create transition between nodes
   */
  createEdge(srcId, dstId, action) {
    return this.world.addEdge(srcId, dstId, action);
  }

  /**
   * Get most common actions (for analysis)
   */
  getMostCommonActions(limit = 10) {
    return this.world.getMostCommonActions(limit);
  }

  /**
   * Get total drift growth (for analysis)
   */
  getTotalDriftGrowth() {
    return this.world.getTotalDriftGrowth();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  _inferAction(result, angle) {
    // Infer action type from field result
    if (result.didJump) {
      return 'WORMHOLE';
    }

    // Discretize angle to 8 directions
    const dir = Math.floor(((angle + Math.PI) / (Math.PI / 4)) % 8);
    const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    return `WALK_${dirs[dir]}`;
  }

  _recordTrace(action, result) {
    const activeNode = this.world.getActiveNode();
    if (!activeNode) return;

    // Compute deltas from field metrics
    const deltas = this._computeDeltas();

    // Record trace
    const trace = this.world.recordTrace(
      activeNode.id,
      activeNode.id,  // same node for now (no node transitions yet)
      action,
      deltas
    );

    // Update node metrics from deltas
    activeNode.entropy += deltas.d_entropy;
    activeNode.coherence += deltas.d_coherence;
    activeNode.novelty += deltas.d_novelty;
    activeNode.tension += deltas.d_tension;
    activeNode.drift += deltas.d_drift;

    return trace;
  }

  _computeDeltas() {
    const m = this.field.metrics;
    const prev = this._prevMetrics;

    if (!m || !prev) {
      return {
        d_entropy: 0,
        d_coherence: 0,
        d_novelty: 0,
        d_tension: 0,
        d_drift: 0,
      };
    }

    return {
      d_entropy: (m.entropy || 0) - (prev.entropy || 0),
      d_coherence: (m.resonanceField || 0) - (prev.resonanceField || 0),
      d_novelty: (m.emergence || 0) - (prev.emergence || 0),
      d_tension: (m.tension || 0) - (prev.tension || 0),
      d_drift: (m.dissonance || 0) - (prev.dissonance || 0),
    };
  }

  _captureMetrics() {
    const m = this.field.metrics;
    if (!m) return {};

    return {
      entropy: m.entropy,
      resonanceField: m.resonanceField,
      emergence: m.emergence,
      tension: m.tension,
      dissonance: m.dissonance,
    };
  }

  _applyLaws(position, dt) {
    const activeNode = this.world.getActiveNode();
    if (!activeNode) return;

    // Get recent traces for loop detection
    const traces = this.world.getRecentTraces(10);

    // Apply all laws
    this.laws.applyAll(activeNode, traces, position, dt);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY — create integrated field from existing field
// ═══════════════════════════════════════════════════════════════════════════════

export function integrateField(field, options = {}) {
  return new IntegratedField(field, options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE SHADOW CONTROLLER — for cases where you just want shadow
// ═══════════════════════════════════════════════════════════════════════════════

export class ShadowController {
  constructor() {
    this.shadow = new ObserverShadow();
    this.objectShadows = new Map();
  }

  update(dt) {
    this.shadow.update(dt);
  }

  getPosition(observerPos) {
    return this.shadow.getPosition(observerPos);
  }

  getState() {
    return this.shadow.getState();
  }

  addTimeDrift(deltaMs) {
    this.shadow.addTimeDrift(deltaMs);
  }

  syncTime() {
    this.shadow.syncTime();
  }

  registerObject(id, entity, scale = 1.0) {
    const obj = new ObjectShadow(entity, scale);
    this.objectShadows.set(id, obj);
    return obj;
  }

  getObjectPosition(id, observerPos) {
    const obj = this.objectShadows.get(id);
    if (!obj) return null;
    return obj.getPosition(this.shadow, observerPos);
  }
}
