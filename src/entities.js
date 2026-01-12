// entities.js — word-figures + structures (no speech; only presence)
// "the shadows know your trajectory, they have seen the prophecy"
// 
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — entities are agents, not decorations
// They sense DarkMatter, follow Chordlock, react to Chirality
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════

export class Entities {
  constructor(field) {
    this.field = field;
    this.list = [];
    this._seed();
  }

  _seed() {
    const add = (type, x, y, r = 1.0) => this.list.push({
      type, x, y, r,
      phase: Math.random() * 10,
      alive: true,
      lastWords: [],
      
      // ═══════════════════════════════════════════════════════════════════════
      // AGENTIVE STATE — entities have intentions and memory
      // ═══════════════════════════════════════════════════════════════════════
      intention: 'wander',     // wander, approach, flee, orbit, anchor
      intentionStrength: 0,    // 0-1: how committed to current intention
      memory: [],              // recent positions of player
      prophesiedPos: null,     // where entity thinks player will go
      chiralAffinity: 0,       // -1 (left-loving) to +1 (right-loving)
      primeAffinity: Math.random(), // how much entity likes prime coords
      scarAttraction: 0,       // attraction to DarkMatter scars
      resonanceState: 0.5,     // entity's internal resonance
      lastPlayerDist: Infinity,
    });

    // fixed constellation of entities
    add("house", 16.5, 10.8, 1.2);
    add("obelisk", 28.0, 20.0, 0.9);
    add("face", 22.5, 32.5, 1.1);
    add("shadow", 10.5, 24.0, 0.8);
    add("shadow", 34.0, 14.0, 0.8);
    add("house", 36.2, 34.2, 1.3);
    add("shadow", 18.0, 42.0, 0.7);
    add("face", 8.0, 38.0, 0.9);
    add("obelisk", 40.0, 8.0, 1.0);
  }

  update(p, metrics, dt) {
    const pain = metrics.pain;
    const emergence = metrics.emergence;
    const cfg = this.field.cfg;

    for (const e of this.list) {
      if (!e.alive) continue;

      e.phase += dt * (0.7 + pain * 1.2 + emergence * 0.5);

      // ═══════════════════════════════════════════════════════════════════════
      // PROPHECY: remember player positions, predict future
      // ═══════════════════════════════════════════════════════════════════════
      this._updateMemory(e, p);
      this._updateProphecy(e, p, dt);

      // ═══════════════════════════════════════════════════════════════════════
      // INTENTION: decide what entity wants to do
      // ═══════════════════════════════════════════════════════════════════════
      this._updateIntention(e, p, metrics, cfg);

      // ═══════════════════════════════════════════════════════════════════════
      // MOVEMENT: execute intention with CODES/RIC awareness
      // ═══════════════════════════════════════════════════════════════════════
      this._executeIntention(e, p, metrics, cfg, dt);

      // ═══════════════════════════════════════════════════════════════════════
      // CHORDLOCK: entities prefer prime coordinates
      // ═══════════════════════════════════════════════════════════════════════
      if (cfg.chordlockEnabled && e.primeAffinity > 0.3) {
        this._applyChordlockDrift(e, dt);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // DARK MATTER: entities sense scars
      // ═══════════════════════════════════════════════════════════════════════
      if (this.field.model?.darkMatter) {
        this._applyDarkMatterInfluence(e, dt);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // CHIRALITY: react to player's rotational memory
      // ═══════════════════════════════════════════════════════════════════════
      if (cfg.chiralityEnabled) {
        this._applyChiralityReaction(e, cfg, dt);
      }

      // Keep inside world bounds
      e.x = clamp(e.x, 1.5, this.field.w - 2.5);
      e.y = clamp(e.y, 1.5, this.field.h - 2.5);

      // Don't embed into walls
      for (let k = 0; k < 6; k++) {
        if (!this.field.isSolid(e.x, e.y)) break;
        e.x += (Math.random() * 2 - 1) * 0.25;
        e.y += (Math.random() * 2 - 1) * 0.25;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMORY & PROPHECY — entities track and predict player
  // ═══════════════════════════════════════════════════════════════════════════

  _updateMemory(e, p) {
    // Store player position every ~0.5s (limit memory size)
    if (e.memory.length === 0 || 
        Math.hypot(p.x - e.memory[e.memory.length - 1].x, 
                   p.y - e.memory[e.memory.length - 1].y) > 0.5) {
      e.memory.push({ x: p.x, y: p.y, t: performance.now() });
      if (e.memory.length > 10) e.memory.shift();
    }
  }

  _updateProphecy(e, p, dt) {
    if (e.memory.length < 3) {
      e.prophesiedPos = null;
      return;
    }

    // Simple linear extrapolation from last 3 positions
    const m = e.memory;
    const n = m.length;
    const vx = (m[n-1].x - m[n-3].x) / 2;
    const vy = (m[n-1].y - m[n-3].y) / 2;
    
    // Prophecy horizon: 1-3 seconds ahead based on entity type
    const horizon = e.type === 'shadow' ? 2.0 : e.type === 'face' ? 1.5 : 1.0;
    
    e.prophesiedPos = {
      x: p.x + vx * horizon * 30, // 30 frames ahead
      y: p.y + vy * horizon * 30,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTENTION SYSTEM — entities decide what to do
  // ═══════════════════════════════════════════════════════════════════════════

  _updateIntention(e, p, metrics, cfg) {
    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    const pain = metrics.pain;
    const emergence = metrics.emergence;
    const pas = this.field.computePAS ? this.field.computePAS() : 0.5;

    // Track approach/retreat
    const approaching = dist < e.lastPlayerDist;
    e.lastPlayerDist = dist;

    // Intention decay
    e.intentionStrength *= 0.98;

    // SHADOW behavior: stalker, drawn to pain and prophecy
    if (e.type === 'shadow') {
      if (pain > 0.6 && dist < 12) {
        e.intention = 'approach';
        e.intentionStrength = pain;
      } else if (pain < 0.3 && e.prophesiedPos && dist > 6) {
        e.intention = 'intercept'; // go to prophesied position
        e.intentionStrength = 0.5;
      } else if (pas < 0.3) {
        e.intention = 'orbit'; // circle player during desync
        e.intentionStrength = 0.6;
      } else {
        e.intention = 'wander';
        e.intentionStrength = 0.2;
      }
    }
    
    // FACE behavior: observer, drawn to emergence and chirality
    else if (e.type === 'face') {
      if (emergence > 0.6) {
        e.intention = 'approach';
        e.intentionStrength = emergence;
      } else if (cfg.chiralMemory > 0.3) {
        e.intention = 'orbit'; // faces love left-turners
        e.intentionStrength = cfg.chiralMemory;
        e.chiralAffinity = -0.5; // prefer left
      } else if (approaching && dist < 8) {
        e.intention = 'flee'; // don't like being rushed
        e.intentionStrength = 0.4;
      } else {
        e.intention = 'wander';
        e.intentionStrength = 0.15;
      }
    }
    
    // HOUSE behavior: anchor, drawn to stability and prime coords
    else if (e.type === 'house') {
      if (cfg.chordlockEnabled && !this.field.isPrimeAnchor(Math.floor(e.x), Math.floor(e.y))) {
        e.intention = 'anchor'; // seek prime coordinates
        e.intentionStrength = 0.3;
      } else {
        e.intention = 'wander';
        e.intentionStrength = 0.05; // houses barely move
      }
    }
    
    // OBELISK behavior: sentinel, marks important locations
    else if (e.type === 'obelisk') {
      if (this.field.model?.darkMatter?.scars?.length > 0) {
        e.intention = 'guard'; // guard nearest scar
        e.intentionStrength = 0.4;
      } else {
        e.intention = 'wander';
        e.intentionStrength = 0.1;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTENTION EXECUTION — move according to intention
  // ═══════════════════════════════════════════════════════════════════════════

  _executeIntention(e, p, metrics, cfg, dt) {
    const strength = e.intentionStrength;
    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    switch (e.intention) {
      case 'approach':
        // Move toward player
        e.x += (dx / dist) * strength * 2.0 * dt;
        e.y += (dy / dist) * strength * 2.0 * dt;
        break;

      case 'flee':
        // Move away from player
        e.x -= (dx / dist) * strength * 1.5 * dt;
        e.y -= (dy / dist) * strength * 1.5 * dt;
        break;

      case 'orbit':
        // Circle around player
        const orbitRadius = 6 + 2 * (1 - strength);
        const orbitSpeed = 0.5 + strength * 0.5;
        const angle = Math.atan2(dy, dx) + orbitSpeed * dt;
        const targetX = p.x - Math.cos(angle) * orbitRadius;
        const targetY = p.y - Math.sin(angle) * orbitRadius;
        e.x += (targetX - e.x) * 0.05;
        e.y += (targetY - e.y) * 0.05;
        break;

      case 'intercept':
        // Go to prophesied position
        if (e.prophesiedPos) {
          const pdx = e.prophesiedPos.x - e.x;
          const pdy = e.prophesiedPos.y - e.y;
          const pdist = Math.hypot(pdx, pdy) || 1;
          e.x += (pdx / pdist) * strength * 1.5 * dt;
          e.y += (pdy / pdist) * strength * 1.5 * dt;
        }
        break;

      case 'anchor':
        // Seek nearest prime coordinate
        this._seekPrimeCoord(e, dt);
        break;

      case 'guard':
        // Move toward nearest scar
        this._seekNearestScar(e, dt);
        break;

      case 'wander':
      default:
        // Gentle drift
        const drift = (0.15 + 0.35 * metrics.calendarDrift + 0.2 * metrics.emergence) * 0.02;
        e.x += Math.sin(e.phase * 0.9 + e.x) * drift * dt;
        e.y += Math.cos(e.phase * 1.1 + e.y) * drift * dt;
        break;
    }

    // Size response to proximity and emergence
    if (e.type === 'shadow' || e.type === 'face') {
      if (metrics.emergence > 0.6 && dist < 8) {
        e.r = Math.min(1.8, e.r + 0.003 * metrics.emergence);
      } else {
        e.r = Math.max(0.6, e.r - 0.001);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHORDLOCK DRIFT — entities seek prime coordinates
  // ═══════════════════════════════════════════════════════════════════════════

  _applyChordlockDrift(e, dt) {
    const primes = this.field.cfg.primeAnchors;
    const x = Math.floor(e.x);
    const y = Math.floor(e.y);

    // Find nearest prime coordinate
    let nearestPrimeX = x, nearestPrimeY = y;
    let minDist = Infinity;

    for (const p of primes) {
      const px = Math.round(e.x / p) * p;
      const py = Math.round(e.y / p) * p;
      const d = Math.hypot(px - e.x, py - e.y);
      if (d < minDist && d > 0.1) {
        minDist = d;
        nearestPrimeX = px;
        nearestPrimeY = py;
      }
    }

    // Gentle drift toward prime
    const driftStrength = e.primeAffinity * 0.02 * dt;
    e.x += (nearestPrimeX - e.x) * driftStrength;
    e.y += (nearestPrimeY - e.y) * driftStrength;
  }

  _seekPrimeCoord(e, dt) {
    // Stronger version for 'anchor' intention
    const primes = this.field.cfg.primeAnchors;
    
    for (const p of [7, 11, 13, 17]) { // prefer these primes
      const px = Math.round(e.x / p) * p;
      const py = Math.round(e.y / p) * p;
      
      if (Math.hypot(px - e.x, py - e.y) < 3) {
        e.x += (px - e.x) * 0.05 * dt;
        e.y += (py - e.y) * 0.05 * dt;
        return;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DARK MATTER INFLUENCE — entities sense scars
  // ═══════════════════════════════════════════════════════════════════════════

  _applyDarkMatterInfluence(e, dt) {
    const dm = this.field.model.darkMatter;
    if (!dm || dm.scars.length === 0) return;

    // Get gradient at entity position
    const grad = dm.gradient(e.x, e.y);
    
    // Different entities react differently to scars
    let attraction = 0;
    if (e.type === 'shadow') {
      attraction = 0.8; // shadows love scars
    } else if (e.type === 'obelisk') {
      attraction = 0.5; // obelisks guard scars
    } else if (e.type === 'face') {
      attraction = -0.3; // faces avoid scars
    } else {
      attraction = 0.1;
    }

    // Apply gradient influence
    e.x += grad.gx * attraction * 0.1 * dt;
    e.y += grad.gy * attraction * 0.1 * dt;
    
    e.scarAttraction = attraction;
  }

  _seekNearestScar(e, dt) {
    const dm = this.field.model?.darkMatter;
    if (!dm || dm.scars.length === 0) return;

    // Find nearest scar
    let nearest = null, minDist = Infinity;
    for (const scar of dm.scars) {
      const d = Math.hypot(scar.x - e.x, scar.y - e.y);
      if (d < minDist) {
        minDist = d;
        nearest = scar;
      }
    }

    if (nearest && minDist > 2) {
      const dx = nearest.x - e.x;
      const dy = nearest.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.x += (dx / dist) * 0.5 * dt;
      e.y += (dy / dist) * 0.5 * dt;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHIRALITY REACTION — entities respond to player rotation
  // ═══════════════════════════════════════════════════════════════════════════

  _applyChiralityReaction(e, cfg, dt) {
    const chiralDiff = cfg.chiralMemory - cfg.chiralEmission;
    
    // Entities with matching affinity are drawn closer
    if (e.chiralAffinity !== 0) {
      const resonance = chiralDiff * e.chiralAffinity;
      
      if (resonance > 0.1) {
        // Matching chirality: entity becomes more active
        e.intentionStrength = Math.min(1, e.intentionStrength + 0.01);
        e.resonanceState = Math.min(1, e.resonanceState + 0.01);
      } else if (resonance < -0.1) {
        // Opposite chirality: entity becomes sluggish
        e.intentionStrength *= 0.98;
        e.resonanceState = Math.max(0, e.resonanceState - 0.01);
      }
    }

    // All entities slightly drift based on chiral field
    const chiralForce = chiralDiff * 0.02 * dt;
    e.x += Math.cos(e.phase) * chiralForce;
    e.y += Math.sin(e.phase) * chiralForce;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERY METHODS — for render and other systems
  // ═══════════════════════════════════════════════════════════════════════════

  getEntityState(e) {
    return {
      intention: e.intention,
      strength: e.intentionStrength,
      resonance: e.resonanceState,
      prophesied: e.prophesiedPos,
      chiralAffinity: e.chiralAffinity,
      scarAttraction: e.scarAttraction,
    };
  }
}

function clamp(x, a, b) { 
  return Math.max(a, Math.min(b, x)); 
}
