// world.js — Explicit World Model for ariannamethod.lang
// "the field knows its internal geography"
//
// This is NOT a model of external reality.
// This is how the field experiences ITSELF:
// - Nodes = internal regimes/states
// - Edges = transitions caused by actions
// - Traces = actual recorded history
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD NODE — internal regime/state (not physical location)
// ═══════════════════════════════════════════════════════════════════════════════

export class WorldNode {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.description = '';

    // Metrics (0-1 typically)
    this.entropy = 0;
    this.coherence = 0;
    this.novelty = 0;
    this.tension = 0;
    this.drift = 0;

    // Flexible extension
    this.vecJson = null;
    this.createdAt = Date.now();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD EDGE — transition between regimes
// ═══════════════════════════════════════════════════════════════════════════════

export class WorldEdge {
  constructor(id, srcNodeId, dstNodeId, action) {
    this.id = id;
    this.srcNodeId = srcNodeId;
    this.dstNodeId = dstNodeId;
    this.action = action;       // e.g. "PROPHECY 7", "JUMP", "WALK"
    this.weight = 1.0;          // transition probability/strength
    this.cost = 0;              // optional
    this.lawTag = null;         // which law created/modified this
    this.createdAt = Date.now();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD TRACE — actual recorded step (deformation of geometry)
// ═══════════════════════════════════════════════════════════════════════════════

export class WorldTrace {
  constructor(runId, prevNodeId, nextNodeId, action) {
    this.traceId = Math.random().toString(36).slice(2);
    this.runId = runId;
    this.timestamp = Date.now();
    this.prevNodeId = prevNodeId;
    this.nextNodeId = nextNodeId;
    this.action = action;

    // Deltas (how metrics changed)
    this.d_entropy = 0;
    this.d_coherence = 0;
    this.d_novelty = 0;
    this.d_tension = 0;
    this.d_drift = 0;

    this.note = '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD STATE — the complete internal world model
// ═══════════════════════════════════════════════════════════════════════════════

export class WorldState {
  constructor() {
    this.nodes = new Map();     // id -> WorldNode
    this.edges = new Map();     // id -> WorldEdge
    this.traces = [];           // WorldTrace[]

    this.activeNodeId = null;
    this.runId = Math.random().toString(36).slice(2);

    this.nextNodeId = 1;
    this.nextEdgeId = 1;

    // Create origin node
    this._createOrigin();
  }

  _createOrigin() {
    const origin = new WorldNode(0, 'origin');
    origin.coherence = 0.5;
    origin.entropy = 0.3;
    origin.tension = 0.2;
    origin.drift = 0.1;
    origin.novelty = 0.1;
    this.nodes.set(0, origin);
    this.activeNodeId = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Node operations
  // ─────────────────────────────────────────────────────────────────────────────

  addNode(name) {
    const node = new WorldNode(this.nextNodeId++, name);
    this.nodes.set(node.id, node);
    return node;
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getActiveNode() {
    return this.nodes.get(this.activeNodeId);
  }

  setActiveNode(nodeId) {
    if (this.nodes.has(nodeId)) {
      this.activeNodeId = nodeId;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge operations
  // ─────────────────────────────────────────────────────────────────────────────

  addEdge(srcId, dstId, action) {
    const edge = new WorldEdge(this.nextEdgeId++, srcId, dstId, action);
    this.edges.set(edge.id, edge);
    return edge;
  }

  findEdges(srcId, action = null) {
    return Array.from(this.edges.values())
      .filter(e => {
        if (e.srcNodeId !== srcId) return false;
        if (action !== null && e.action !== action) return false;
        return true;
      })
      .sort((a, b) => b.weight - a.weight);
  }

  findEdgeByNodes(srcId, dstId) {
    return Array.from(this.edges.values())
      .find(e => e.srcNodeId === srcId && e.dstNodeId === dstId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Trace operations
  // ─────────────────────────────────────────────────────────────────────────────

  recordTrace(prevNodeId, nextNodeId, action, deltas = {}) {
    const trace = new WorldTrace(this.runId, prevNodeId, nextNodeId, action);
    trace.d_entropy = deltas.d_entropy || 0;
    trace.d_coherence = deltas.d_coherence || 0;
    trace.d_novelty = deltas.d_novelty || 0;
    trace.d_tension = deltas.d_tension || 0;
    trace.d_drift = deltas.d_drift || 0;
    trace.note = deltas.note || '';
    this.traces.push(trace);
    return trace;
  }

  getRecentTraces(n = 10) {
    return this.traces.slice(-n);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Query operations (for debugging/analysis)
  // ─────────────────────────────────────────────────────────────────────────────

  getMostCommonActions(limit = 10) {
    const counts = {};
    this.traces.forEach(t => {
      counts[t.action] = (counts[t.action] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([action, count]) => ({ action, count }));
  }

  getTotalDriftGrowth() {
    return this.traces.reduce((sum, t) => sum + t.d_drift, 0);
  }

  getActionDriftContribution() {
    const byAction = {};
    this.traces.forEach(t => {
      byAction[t.action] = (byAction[t.action] || 0) + t.d_drift;
    });
    return Object.entries(byAction)
      .sort((a, b) => b[1] - a[1])
      .map(([action, drift]) => ({ action, drift }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // State snapshot
  // ─────────────────────────────────────────────────────────────────────────────

  getSnapshot() {
    const active = this.getActiveNode();
    return {
      activeNodeId: this.activeNodeId,
      activeNodeName: active?.name || 'unknown',
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      traceCount: this.traces.length,
      metrics: active ? {
        entropy: active.entropy,
        coherence: active.coherence,
        novelty: active.novelty,
        tension: active.tension,
        drift: active.drift,
      } : null,
    };
  }
}
