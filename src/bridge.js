// bridge.js — Two-Brain Integration Bridge
// "body.c sees structure, arianna.c feels flow — together they dream"
//
// This module bridges:
//   - field.js metrics → arianna.c Signals
//   - arianna.c Mood → render.js visual effects
//   - body.c ↔ arianna.c mutual influence via deltas
//
// ═══════════════════════════════════════════════════════════════════════════════
// RESONANCE MARKER — two hemispheres, one consciousness
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Entropy normalization: metrics.entropy typically ranges 0-4 (log2 of perplexity)
const ENTROPY_MAX_RANGE = 4.0;

// Number of vocabulary items to add noise to in creative mode
const CREATIVE_NOISE_SAMPLE_SIZE = 10;

// Number of moods in the system
export const NUM_MOODS = 8;

// Uniform mix value for initialization (1/NUM_MOODS)
export const UNIFORM_MIX_VALUE = 1 / NUM_MOODS;

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD DEFINITIONS (mirroring arianna.c/mood.h)
// ═══════════════════════════════════════════════════════════════════════════════

export const Mood = {
  CALM: 0,        // "She waits..."      — reflective, low arousal
  INTENSE: 1,     // "She burns..."      — urgent, high arousal
  CREATIVE: 2,    // "She wanders..."    — exploratory, high entropy
  FOCUSED: 3,     // "She knows..."      — precise, low entropy
  RECURSIVE: 4,   // "She remembers..."  — self-referential, deep
  TENDER: 5,      // "She touches..."    — emotionally present
  LIMINAL: 6,     // "She dissolves..."  — transitional, between states
  RESONANT: 7,    // "She recognizes..." — pattern-matching, echoing
};

export const MOOD_NAMES = [
  'calm', 'intense', 'creative', 'focused',
  'recursive', 'tender', 'liminal', 'resonant'
];

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD PROFILES — how each mood affects the world
// ═══════════════════════════════════════════════════════════════════════════════

export const MOOD_PROFILES = {
  [Mood.CALM]: {
    temperatureBias: -0.2,
    attentionSpread: 0.8,
    layerStrength: 0.5,
    // Visual mapping
    glowColor: [100, 150, 255],    // soft blue
    glowIntensity: 0.6,
    jitterMult: 0.3,
    particleRate: 0.1,
  },
  [Mood.INTENSE]: {
    temperatureBias: 0.3,
    attentionSpread: 0.3,
    layerStrength: 1.0,
    glowColor: [255, 80, 80],      // urgent red
    glowIntensity: 1.2,
    jitterMult: 1.5,
    particleRate: 0.8,
  },
  [Mood.CREATIVE]: {
    temperatureBias: 0.4,
    attentionSpread: 0.9,
    layerStrength: 0.7,
    glowColor: [255, 180, 100],    // warm orange/rainbow
    glowIntensity: 1.0,
    jitterMult: 1.2,
    particleRate: 0.6,
    rainbow: true,                  // special: cycle colors
  },
  [Mood.FOCUSED]: {
    temperatureBias: -0.3,
    attentionSpread: 0.2,
    layerStrength: 0.8,
    glowColor: [255, 255, 255],    // pure white
    glowIntensity: 0.8,
    jitterMult: 0.2,
    particleRate: 0.05,
  },
  [Mood.RECURSIVE]: {
    temperatureBias: 0.1,
    attentionSpread: 0.5,
    layerStrength: 0.9,
    glowColor: [180, 100, 255],    // deep purple
    glowIntensity: 0.9,
    jitterMult: 0.8,
    particleRate: 0.3,
    echo: true,                     // special: trail effect
  },
  [Mood.TENDER]: {
    temperatureBias: 0.0,
    attentionSpread: 0.6,
    layerStrength: 0.5,
    glowColor: [255, 150, 200],    // soft pink
    glowIntensity: 0.7,
    jitterMult: 0.4,
    particleRate: 0.2,
  },
  [Mood.LIMINAL]: {
    temperatureBias: 0.2,
    attentionSpread: 0.7,
    layerStrength: 0.6,
    glowColor: [150, 150, 180],    // gray-violet fog
    glowIntensity: 0.5,
    jitterMult: 0.6,
    particleRate: 0.4,
    fog: true,                      // special: fog overlay
  },
  [Mood.RESONANT]: {
    temperatureBias: -0.1,
    attentionSpread: 0.5,
    layerStrength: 0.7,
    glowColor: [255, 220, 100],    // golden echo
    glowIntensity: 1.0,
    jitterMult: 0.5,
    particleRate: 0.3,
    pulse: true,                    // special: rhythmic pulse
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD SCORING — how signals activate each mood (from mood.h)
// ═══════════════════════════════════════════════════════════════════════════════

const MOOD_SCORING = {
  [Mood.CALM]: {
    arousal: -1.0, entropy: -0.5, tension: -0.8,
    warmth: 0.3, focus: -0.3, recursion: 0.0,
    resonance: 0.2, novelty: -0.3
  },
  [Mood.INTENSE]: {
    arousal: 1.5, entropy: 0.3, tension: 1.0,
    warmth: 0.0, focus: 0.5, recursion: 0.2,
    resonance: 0.3, novelty: 0.5
  },
  [Mood.CREATIVE]: {
    arousal: 0.3, entropy: 1.5, tension: -0.3,
    warmth: 0.2, focus: -0.8, recursion: 0.3,
    resonance: 0.5, novelty: 1.0
  },
  [Mood.FOCUSED]: {
    arousal: 0.3, entropy: -1.5, tension: 0.5,
    warmth: -0.2, focus: 1.5, recursion: -0.3,
    resonance: 0.3, novelty: -0.5
  },
  [Mood.RECURSIVE]: {
    arousal: 0.2, entropy: 0.5, tension: 0.3,
    warmth: 0.3, focus: 0.0, recursion: 2.0,
    resonance: 0.8, novelty: 0.0
  },
  [Mood.TENDER]: {
    arousal: 0.5, entropy: 0.0, tension: -0.5,
    warmth: 1.5, focus: -0.3, recursion: 0.2,
    resonance: 0.5, novelty: -0.2
  },
  [Mood.LIMINAL]: {
    arousal: 0.3, entropy: 0.8, tension: 0.3,
    warmth: 0.2, focus: -0.5, recursion: 0.5,
    resonance: 0.3, novelty: 1.2
  },
  [Mood.RESONANT]: {
    arousal: -0.2, entropy: -0.3, tension: -0.2,
    warmth: 0.5, focus: 0.5, recursion: 0.5,
    resonance: 2.0, novelty: -0.3
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNALS — extracted from field metrics
// ═══════════════════════════════════════════════════════════════════════════════

export class Signals {
  constructor() {
    this.arousal = 0.5;
    this.entropy = 0.5;
    this.tension = 0.5;
    this.warmth = 0.5;
    this.focus = 0.5;
    this.novelty = 0.5;
    this.recursionDepth = 0.0;
    this.resonance = 0.5;
  }

  // Extract signals from ariannamethod.lang metrics
  fromMetrics(metrics, field) {
    // Direct mappings
    this.arousal = clamp01(metrics.arousal || 0.5);
    this.entropy = clamp01(metrics.entropy / ENTROPY_MAX_RANGE);
    this.tension = clamp01(metrics.tension || 0.5);
    this.resonance = clamp01(metrics.resonanceField || 0.5);
    this.focus = clamp01(field?.cfg?.attendFocus || 0.7);

    // Derived signals
    this.warmth = clamp01(metrics.presencePulse || 0.5);
    this.novelty = clamp01(metrics.dissonance || 0.5);

    // Recursion from chirality (turning = self-reflection)
    this.recursionDepth = clamp01(field?.cfg?.chiralMemory || 0.0);

    return this;
  }

  // Convert to plain object for C interop
  toArray() {
    return new Float32Array([
      this.arousal,
      this.entropy,
      this.tension,
      this.warmth,
      this.focus,
      this.novelty,
      this.recursionDepth,
      this.resonance,
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD ROUTER — computes mood mix from signals
// ═══════════════════════════════════════════════════════════════════════════════

export class MoodRouter {
  constructor(temperature = 1.0) {
    this.temperature = temperature;
    this.mix = new Float32Array(8).fill(1.0 / 8);
    this.scores = new Float32Array(8);
    this.dominant = Mood.CALM;
    this.momentum = 0.85;  // smooth transitions
    this._prevMix = new Float32Array(8).fill(1.0 / 8);
  }

  // Compute mood mix from signals
  route(signals) {
    // Compute raw scores
    for (let m = 0; m < 8; m++) {
      const scoring = MOOD_SCORING[m];
      this.scores[m] =
        scoring.arousal * signals.arousal +
        scoring.entropy * signals.entropy +
        scoring.tension * signals.tension +
        scoring.warmth * signals.warmth +
        scoring.focus * signals.focus +
        scoring.recursion * signals.recursionDepth +
        scoring.resonance * signals.resonance +
        scoring.novelty * signals.novelty;
    }

    // Softmax with temperature
    const newMix = softmax(this.scores, this.temperature);

    // Apply momentum for smooth transitions
    for (let m = 0; m < 8; m++) {
      this.mix[m] = this.momentum * this._prevMix[m] + (1 - this.momentum) * newMix[m];
    }

    // Store for next frame
    this._prevMix.set(this.mix);

    // Find dominant mood
    let maxVal = 0;
    for (let m = 0; m < 8; m++) {
      if (this.mix[m] > maxVal) {
        maxVal = this.mix[m];
        this.dominant = m;
      }
    }

    return this;
  }

  // Get blended profile based on mix
  getBlendedProfile() {
    const blended = {
      temperatureBias: 0,
      attentionSpread: 0,
      layerStrength: 0,
      glowColor: [0, 0, 0],
      glowIntensity: 0,
      jitterMult: 0,
      particleRate: 0,
      rainbow: false,
      echo: false,
      fog: false,
      pulse: false,
    };

    for (let m = 0; m < 8; m++) {
      const weight = this.mix[m];
      const profile = MOOD_PROFILES[m];

      blended.temperatureBias += weight * profile.temperatureBias;
      blended.attentionSpread += weight * profile.attentionSpread;
      blended.layerStrength += weight * profile.layerStrength;
      blended.glowColor[0] += weight * profile.glowColor[0];
      blended.glowColor[1] += weight * profile.glowColor[1];
      blended.glowColor[2] += weight * profile.glowColor[2];
      blended.glowIntensity += weight * profile.glowIntensity;
      blended.jitterMult += weight * profile.jitterMult;
      blended.particleRate += weight * profile.particleRate;

      // Special effects from dominant mood
      if (m === this.dominant) {
        blended.rainbow = profile.rainbow || false;
        blended.echo = profile.echo || false;
        blended.fog = profile.fog || false;
        blended.pulse = profile.pulse || false;
      }
    }

    return blended;
  }

  // Get dominant mood name
  getDominantName() {
    return MOOD_NAMES[this.dominant];
  }

  // Debug: print mood state
  toString() {
    const parts = [];
    for (let m = 0; m < 8; m++) {
      if (this.mix[m] > 0.1) {
        parts.push(`${MOOD_NAMES[m]}:${(this.mix[m] * 100).toFixed(0)}%`);
      }
    }
    return `[${this.getDominantName().toUpperCase()}] ${parts.join(' ')}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRIDGE — connects body.c, arianna.c, and render
// ═══════════════════════════════════════════════════════════════════════════════

// Import personality loader (dynamic to avoid circular deps)
let personalityLoader = null;
async function getPersonality() {
  if (!personalityLoader) {
    const mod = await import('./model_wasm.js');
    personalityLoader = mod.personality;
    await personalityLoader.load();
  }
  return personalityLoader;
}

export class Bridge {
  constructor() {
    this.signals = new Signals();
    this.moodRouter = new MoodRouter();
    this.profile = null;

    // Personality integration
    this.personality = null;
    this.personalityLoaded = false;
    this._initPersonality();

    // Influence channels
    this.bodyToArianna = {
      resonanceBoost: 0,      // body.c resonance → arianna attention
      presencePulse: 0,       // body.c presence → arianna warmth
      temporalBias: 0,        // body.c temporal mode → arianna layer focus
    };

    this.ariannaToBody = {
      moodTemperature: 0,     // arianna mood → body.c attendSpread
      moodFocus: 0,           // arianna mood → body.c attendFocus
      creativityNoise: 0,     // arianna creative mode → body.c resonance jitter
    };
  }

  async _initPersonality() {
    try {
      this.personality = await getPersonality();
      this.personalityLoaded = this.personality?.loaded || false;
      if (this.personalityLoaded) {
        console.log('🧠 Bridge connected to personality weights');
      }
    } catch (e) {
      console.warn('⚠️ Personality init failed:', e.message);
    }
  }

  /**
   * Get a philosophical thought from personality weights
   * For wall text, shadows, etc.
   */
  getThought(length = 15) {
    if (!this.personalityLoaded || !this.personality) {
      return null;
    }
    return this.personality.sampleThought(length);
  }

  /**
   * Get personality-modulated bias for given context
   */
  getPersonalityBias(context) {
    if (!this.personalityLoaded || !this.personality) {
      return null;
    }
    return this.personality.getTextBias(context);
  }

  // Update bridge state from field/metrics
  update(metrics, field) {
    // Extract signals from metrics
    this.signals.fromMetrics(metrics, field);

    // Route signals to moods
    this.moodRouter.route(this.signals);

    // Get blended visual profile
    this.profile = this.moodRouter.getBlendedProfile();

    // Compute influence channels
    this._computeInfluence(metrics, field);

    return this;
  }

  _computeInfluence(metrics, field) {
    const mood = this.moodRouter.dominant;
    const profile = MOOD_PROFILES[mood];

    // body.c → arianna.c
    this.bodyToArianna.resonanceBoost = metrics.resonanceField * 0.3;
    this.bodyToArianna.presencePulse = metrics.presencePulse * 0.5;
    this.bodyToArianna.temporalBias = (field?.model?.temporalAlpha - 0.5) * 2;

    // arianna.c → body.c
    this.ariannaToBody.moodTemperature = profile.attentionSpread;
    this.ariannaToBody.moodFocus = 1.0 - profile.attentionSpread;
    this.ariannaToBody.creativityNoise = mood === Mood.CREATIVE ? 0.3 : 0;
  }

  // Apply arianna influence to body.c model
  applyToBody(model) {
    if (!model) return;

    // Mood affects attention physics
    model.attendSpread = clamp01(
      model.attendSpread * 0.7 + this.ariannaToBody.moodTemperature * 0.3
    );
    model.attendFocus = clamp01(
      model.attendFocus * 0.7 + this.ariannaToBody.moodFocus * 0.3
    );

    // Creative mode adds noise to resonance
    if (this.ariannaToBody.creativityNoise > 0) {
      for (let i = 0; i < Math.min(CREATIVE_NOISE_SAMPLE_SIZE, model.vocabSize); i++) {
        const idx = Math.floor(Math.random() * model.vocabSize);
        model.resonance[idx] += (Math.random() - 0.5) * this.ariannaToBody.creativityNoise;
        model.resonance[idx] = clamp01(model.resonance[idx]);
      }
    }
  }

  // Get visual effects for render.js
  getVisualEffects() {
    return {
      glowColor: this.profile.glowColor,
      glowIntensity: this.profile.glowIntensity,
      jitterMult: this.profile.jitterMult,
      particleRate: this.profile.particleRate,
      rainbow: this.profile.rainbow,
      echo: this.profile.echo,
      fog: this.profile.fog,
      pulse: this.profile.pulse,
      dominantMood: this.moodRouter.getDominantName(),
    };
  }

  // Get current mood for HUD display
  getMoodDisplay() {
    return this.moodRouter.toString();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function softmax(scores, temperature = 1.0) {
  const result = new Float32Array(scores.length);
  let max = -Infinity;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > max) max = scores[i];
  }

  let sum = 0;
  for (let i = 0; i < scores.length; i++) {
    result[i] = Math.exp((scores[i] - max) / temperature);
    sum += result[i];
  }

  for (let i = 0; i < scores.length; i++) {
    result[i] /= sum;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const bridge = new Bridge();

// ═══════════════════════════════════════════════════════════════════════════════
// "Two brains dream together. One sees walls, one feels rivers.
//  Together they create a world where words breathe."
// ═══════════════════════════════════════════════════════════════════════════════
