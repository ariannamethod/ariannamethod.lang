// laws.js — Five Invariants for ariannamethod.lang
//
// Laws are NOT game rules.
// Laws are INVARIANTS that the field enforces:
// - They shape what transitions are possible
// - They determine how metrics evolve
// - They create the "physics" of the field's internal space
//
// The field doesn't "obey" these laws — the field IS these laws.
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// LAW 1: Entropy vs Coherence (complementary, not orthogonal)
// entropy + coherence ≤ 1
// High entropy = disorder, exploration, randomness
// High coherence = order, pattern, stability
// They trade off — you can't have both maxed
// ═══════════════════════════════════════════════════════════════════════════════

export function enforceLaw1_EntropyCoherence(node) {
  const sum = node.entropy + node.coherence;
  if (sum > 1) {
    // Normalize to maintain invariant
    const scale = 1 / sum;
    node.entropy *= scale;
    node.coherence *= scale;
    return { enforced: true, overflow: sum - 1 };
  }
  return { enforced: false, overflow: 0 };
}

/**
 * Compute allowed coherence given entropy
 */
export function maxCoherenceFor(entropy) {
  return Math.max(0, 1 - entropy);
}

/**
 * Compute allowed entropy given coherence
 */
export function maxEntropyFor(coherence) {
  return Math.max(0, 1 - coherence);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAW 2: Novelty Price
// High novelty → high tension
// To stabilize, you must "pay" for novelty through integration/time
// novelty naturally creates tension debt
// ═══════════════════════════════════════════════════════════════════════════════

const NOVELTY_TENSION_RATE = 0.4;  // how much tension 1.0 novelty adds

export function enforceLaw2_NoveltyPrice(node, dt) {
  // Novelty generates tension
  const tensionDebt = node.novelty * NOVELTY_TENSION_RATE * dt;

  // Add tension (will be bounded by other laws)
  const oldTension = node.tension;
  node.tension = Math.min(1, node.tension + tensionDebt);

  return {
    tensionAdded: node.tension - oldTension,
    noveltyPayment: tensionDebt,
  };
}

/**
 * Get tension created by novelty level
 */
export function getTensionFromNovelty(novelty) {
  return novelty * NOVELTY_TENSION_RATE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAW 3: Tension Stabilization
// Tension naturally decays toward equilibrium
// Like a spring returning to rest
// Decay rate depends on coherence (more coherent = faster decay)
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_TENSION_DECAY = 0.02;       // base decay per unit time
const COHERENCE_DECAY_BOOST = 0.05;    // extra decay from coherence

export function enforceLaw3_TensionStabilization(node, dt) {
  // Decay rate increases with coherence
  const decayRate = BASE_TENSION_DECAY + COHERENCE_DECAY_BOOST * node.coherence;
  const decay = decayRate * dt;

  const oldTension = node.tension;
  node.tension = Math.max(0, node.tension - decay);

  return {
    tensionDecayed: oldTension - node.tension,
    decayRate,
  };
}

/**
 * Get equilibrium tension for given state
 * (where novelty generation = decay)
 */
export function getEquilibriumTension(novelty, coherence) {
  const generation = novelty * NOVELTY_TENSION_RATE;
  const decayRate = BASE_TENSION_DECAY + COHERENCE_DECAY_BOOST * coherence;
  // At equilibrium: generation = decay * tension
  // tension = generation / decayRate
  return Math.min(1, generation / decayRate);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAW 4: Drift from Loops
// Repetitive actions increase drift
// Drift penalizes being stuck in patterns
// High drift → harder transitions, more "resistance"
// ═══════════════════════════════════════════════════════════════════════════════

const LOOP_DRIFT_RATE = 0.03;     // drift added per repeated action
const DRIFT_DECAY_RATE = 0.01;   // natural drift decay

export function enforceLaw4_DriftFromLoops(node, traces, dt) {
  // Count recent loops (repeated consecutive actions)
  const recent = traces.slice(-10);
  let loopCount = 0;

  if (recent.length >= 2) {
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].action === recent[i - 1].action) {
        loopCount++;
      }
    }
  }

  // Drift grows from loops
  const loopDrift = loopCount * LOOP_DRIFT_RATE;

  // Natural decay
  const decay = DRIFT_DECAY_RATE * dt;

  const oldDrift = node.drift;
  node.drift = Math.max(0, Math.min(1, node.drift + loopDrift - decay));

  return {
    loopCount,
    driftChange: node.drift - oldDrift,
    loopDrift,
    decayed: decay,
  };
}

/**
 * Get transition resistance from drift
 * Higher drift = harder to move
 */
export function getTransitionResistance(drift) {
  // Quadratic resistance — gentle at low drift, severe at high
  return drift * drift;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAW 5: Anchors Reduce Tension
// Anchors are stabilizing influences (familiar patterns, safe states)
// Being near an anchor reduces tension faster
// Anchors don't eliminate novelty — they make it more digestible
// ═══════════════════════════════════════════════════════════════════════════════

const ANCHOR_TENSION_REDUCTION = 0.1;    // tension reduction per anchor influence
const ANCHOR_INFLUENCE_RADIUS = 3.0;     // how far anchor effect reaches

export function enforceLaw5_Anchors(node, anchors, position) {
  if (!anchors || anchors.length === 0) {
    return { totalInfluence: 0, tensionReduced: 0 };
  }

  // Sum influence from all anchors
  let totalInfluence = 0;

  for (const anchor of anchors) {
    const dist = Math.hypot(
      position.x - anchor.x,
      position.y - anchor.y
    );

    if (dist < ANCHOR_INFLUENCE_RADIUS) {
      // Influence falls off with distance
      const influence = 1 - (dist / ANCHOR_INFLUENCE_RADIUS);
      totalInfluence += influence * (anchor.strength || 1.0);
    }
  }

  // Reduce tension based on anchor influence
  const tensionReduction = totalInfluence * ANCHOR_TENSION_REDUCTION;
  const oldTension = node.tension;
  node.tension = Math.max(0, node.tension - tensionReduction);

  return {
    totalInfluence,
    tensionReduced: oldTension - node.tension,
  };
}

/**
 * Create an anchor at position
 */
export function createAnchor(x, y, strength = 1.0) {
  return {
    x,
    y,
    strength: Math.max(0, Math.min(2, strength)),
    createdAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAW ENGINE — applies all laws in sequence
// ═══════════════════════════════════════════════════════════════════════════════

export class LawEngine {
  constructor() {
    this.anchors = [];
    this.lawResults = {
      law1: null,
      law2: null,
      law3: null,
      law4: null,
      law5: null,
    };
  }

  /**
   * Apply all laws to node
   * @param {WorldNode} node - the node to apply laws to
   * @param {WorldTrace[]} traces - recent traces for loop detection
   * @param {Object} position - {x, y} for anchor distance
   * @param {number} dt - time delta (0-1, typically 1/60 for 60fps)
   */
  applyAll(node, traces = [], position = { x: 0, y: 0 }, dt = 1) {
    // Law 1: Enforce entropy/coherence constraint
    this.lawResults.law1 = enforceLaw1_EntropyCoherence(node);

    // Law 2: Novelty creates tension
    this.lawResults.law2 = enforceLaw2_NoveltyPrice(node, dt);

    // Law 3: Tension decays
    this.lawResults.law3 = enforceLaw3_TensionStabilization(node, dt);

    // Law 4: Loops create drift
    this.lawResults.law4 = enforceLaw4_DriftFromLoops(node, traces, dt);

    // Law 5: Anchors reduce tension
    this.lawResults.law5 = enforceLaw5_Anchors(node, this.anchors, position);

    return this.lawResults;
  }

  /**
   * Add an anchor
   */
  addAnchor(x, y, strength = 1.0) {
    const anchor = createAnchor(x, y, strength);
    this.anchors.push(anchor);
    return anchor;
  }

  /**
   * Remove anchors older than maxAge (ms)
   */
  pruneAnchors(maxAge = 60000) {
    const now = Date.now();
    this.anchors = this.anchors.filter(a => now - a.createdAt < maxAge);
  }

  /**
   * Get last law application results
   */
  getResults() {
    return { ...this.lawResults };
  }

  /**
   * Check if node is in valid state per all laws
   */
  isValid(node) {
    // Law 1: entropy + coherence <= 1
    if (node.entropy + node.coherence > 1.001) return false;

    // All metrics in [0, 1]
    const metrics = ['entropy', 'coherence', 'novelty', 'tension', 'drift'];
    for (const m of metrics) {
      if (node[m] < 0 || node[m] > 1) return false;
    }

    return true;
  }
}
