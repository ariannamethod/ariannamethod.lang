// dsl.js — Arianna Method DSL (JavaScript version)
// "управляет вниманием/пророческим горизонтом/червоточинами/календарным диссонансом"
// the DSL doesn't make the model speak — it changes geometry

export class DSL {
  constructor(field) {
    this.field = field;
    this.history = [];
    this.macros = new Map();
  }

  apply(script) {
    const lines = String(script).split("\n");
    
    for (let raw of lines) {
      let line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      
      // macro expansion
      if (line.startsWith("@")) {
        const macroName = line.slice(1).split(/\s+/)[0];
        const macroScript = this.macros.get(macroName);
        if (macroScript) {
          this.apply(macroScript);
        }
        continue;
      }
      
      // macro definition: MACRO name { ... }
      if (line.toUpperCase().startsWith("MACRO ")) {
        const match = line.match(/MACRO\s+(\w+)\s*\{([\s\S]*?)\}/i);
        if (match) {
          this.macros.set(match[1], match[2]);
        }
        continue;
      }
      
      const [cmd, ...rest] = line.split(/\s+/);
      const arg = rest.join(" ").trim();
      const C = cmd.toUpperCase();

      // core DSL commands
      if (C === "PROPHECY") {
        this.field.cfg.prophecy = clampInt(parseInt(arg, 10), 1, 64);
      } else if (C === "DESTINY") {
        this.field.cfg.destiny = clamp01(parseFloat(arg));
      } else if (C === "WORMHOLE") {
        this.field.cfg.wormhole = clamp01(parseFloat(arg));
      } else if (C === "CALENDAR_DRIFT") {
        this.field.cfg.calendarDrift = parseFloat(arg) || 0;
      } else if (C === "ATTEND_FOCUS") {
        this.field.cfg.attendFocus = clamp01(parseFloat(arg));
        // Sync with AriannaLung attention physics
        if (this.field.model) {
          this.field.model.attendFocus = this.field.cfg.attendFocus;
        }
      } else if (C === "ATTEND_SPREAD") {
        this.field.cfg.attendSpread = clamp01(parseFloat(arg));
        // Sync with AriannaLung attention physics
        if (this.field.model) {
          this.field.model.attendSpread = this.field.cfg.attendSpread;
        }
      } else if (C === "JUMP") {
        this.field.queueJump(parseInt(arg, 10) || 0);
      }
      // extended DSL (from Stanley/pitomadom)
      else if (C === "TUNNEL_THRESHOLD") {
        this.field.cfg.tunnelThreshold = clamp01(parseFloat(arg));
      } else if (C === "TUNNEL_CHANCE") {
        this.field.cfg.tunnelChance = clamp01(parseFloat(arg));
      } else if (C === "TUNNEL_SKIP_MAX") {
        this.field.cfg.tunnelSkipMax = clampInt(parseInt(arg, 10), 1, 24);
      }
      // presence pulse control
      else if (C === "PRESENCE_DECAY") {
        if (this.field.model) {
          this.field.model.presenceDecay = clamp(parseFloat(arg), 0.5, 0.999);
        }
      }
      // resonance manipulation
      else if (C === "RESONANCE_BOOST") {
        // format: RESONANCE_BOOST <word> <amount>
        const parts = arg.split(/\s+/);
        if (parts.length >= 2 && this.field.tokenizer && this.field.model) {
          const word = parts[0].toLowerCase();
          const amount = parseFloat(parts[1]) || 0.1;
          const id = this.field.tokenizer.word2id.get(word);
          if (id !== undefined) {
            this.field.model.resonance[id] = clamp(
              this.field.model.resonance[id] + amount, 0.1, 1
            );
          }
        }
      }
      // pain/suffering modulation (direct injection)
      else if (C === "PAIN") {
        if (this.field.metrics) {
          this.field.metrics.pain = clamp01(parseFloat(arg));
        }
      }
      else if (C === "TENSION") {
        if (this.field.metrics) {
          this.field.metrics.tension = clamp01(parseFloat(arg));
        }
      }
      else if (C === "DISSONANCE") {
        if (this.field.metrics) {
          this.field.metrics.dissonance = clamp01(parseFloat(arg));
        }
      }
      // reset commands
      else if (C === "RESET_DEBT") {
        if (this.field.metrics) {
          this.field.metrics.debt = 0;
        }
      }
      else if (C === "RESET_FIELD") {
        this.field.resetManifested();
      }
      // LAW OF NATURE commands
      else if (C === "LAW") {
        const parts = arg.split(/\s+/);
        if (parts.length >= 2) {
          const lawName = parts[0].toUpperCase();
          const lawValue = parseFloat(parts[1]);
          this._applyLaw(lawName, lawValue);
        }
      }
      // NOTORCH microlearning commands
      else if (C === "NOTORCH_LR") {
        if (this.field.model) {
          this.field.model.lr = clamp(parseFloat(arg), 0.001, 0.5);
        }
      }
      else if (C === "NOTORCH_DECAY") {
        if (this.field.model) {
          this.field.model.resonanceDecay = clamp(parseFloat(arg), 0.001, 0.1);
        }
      }
      // ═══════════════════════════════════════════════════════════════════════
      // DARK MATTER — gravitational memory from rejected injections
      // ═══════════════════════════════════════════════════════════════════════
      else if (C === "SCAR") {
        // SCAR <phrase> — intentionally deposit a scar (mass without acceptance)
        if (this.field.model && this.field.tokenizer && arg) {
          const tokens = this.field.tokenizer.encode(arg);
          const scarId = this._hashPhrase(arg);
          const mass = 1.0; // intentional scars have full mass
          this.field.model.darkMatter.deposit(Array.from(tokens), mass, scarId);
          console.log(`[arianna] scar deposited: "${arg}"`);
        }
      }
      else if (C === "GRAVITY") {
        // GRAVITY DARK <0..1> — how much dark mass affects movement
        const parts = arg.split(/\s+/);
        if (parts[0]?.toUpperCase() === "DARK" && parts[1]) {
          this.field.cfg.darkGravity = clamp01(parseFloat(parts[1]));
        }
      }
      else if (C === "ANTIDOTE") {
        // ANTIDOTE AUTO|HARD — mode of antidote generation
        const mode = arg.toUpperCase();
        if (mode === "AUTO" || mode === "HARD") {
          this.field.cfg.antidoteMode = mode;
        }
      }
      // ═══════════════════════════════════════════════════════════════════════
      // CODES/RIC Integration (from Gemini 3 Pro analysis)
      // ═══════════════════════════════════════════════════════════════════════
      else if (C === "CHORDLOCK") {
        // CHORDLOCK ON|OFF — prime number anchoring
        const mode = arg.toUpperCase();
        this.field.cfg.chordlockEnabled = (mode === "ON" || mode === "1" || mode === "TRUE");
      }
      else if (C === "ANCHOR") {
        // ANCHOR PRIME — enable prime anchoring (alias)
        if (arg.toUpperCase() === "PRIME") {
          this.field.cfg.chordlockEnabled = true;
        }
      }
      else if (C === "TEMPOLOCK") {
        // TEMPOLOCK ON|OFF — rhythmic movement gating
        const mode = arg.toUpperCase();
        this.field.cfg.tempolockEnabled = (mode === "ON" || mode === "1" || mode === "TRUE");
      }
      else if (C === "TEMPO") {
        // TEMPO <prime> — set beat interval (must be prime for resonance)
        const val = parseInt(arg, 10) || 7;
        this.field.cfg.tempo = clampInt(val, 2, 47);
      }
      else if (C === "CHIRALITY") {
        // CHIRALITY ON|OFF — rotational memory asymmetry
        const mode = arg.toUpperCase();
        this.field.cfg.chiralityEnabled = (mode === "ON" || mode === "1" || mode === "TRUE");
      }
      else if (C === "PAS_THRESHOLD") {
        // PAS_THRESHOLD <0..1> — phase alignment threshold for visual glitch
        this.field.cfg.pasThreshold = clamp01(parseFloat(arg));
      }
      // debug/info
      else if (C === "ECHO") {
        console.log(`[arianna] ${arg}`);
      }
      // unknown lines are ignored on purpose (for vibe / future expansion)
    }
    
    this.history.push(script);
  }

  // LAW OF NATURE: emergent constraints that shape the field
  _applyLaw(name, value) {
    const cfg = this.field.cfg;
    const metrics = this.field.metrics;
    const model = this.field.model;
    
    switch (name) {
      case "ENTROPY_FLOOR":
        cfg.entropyFloor = clamp(value, 0, 2);
        break;
      case "RESONANCE_CEILING":
        cfg.resonanceCeiling = clamp01(value);
        break;
      case "DEBT_DECAY":
        cfg.debtDecay = clamp(value, 0.9, 0.9999);
        break;
      case "PRESENCE_FADE":
        if (model) model.presenceDecay = clamp(value, 0.5, 0.999);
        break;
      case "ATTRACTOR_DRIFT":
        cfg.attractorDrift = clamp(value, 0, 0.1);
        break;
      case "DISSONANCE_THRESHOLD":
        cfg.tunnelThreshold = clamp01(value);
        break;
      case "CALENDAR_PHASE":
        cfg.calendarDrift = clamp(value, 0, 30);
        break;
      case "WORMHOLE_GATE":
        cfg.wormhole = clamp01(value);
        break;
      case "PAIN_COMPOSITE":
        if (metrics) metrics.pain = clamp01(value);
        break;
      case "EMERGENCE_DETECTOR":
        cfg.emergenceThreshold = clamp01(value);
        break;
      default:
        console.log(`[arianna] unknown law: ${name}`);
    }
  }

  // generate current state as DSL script
  serialize() {
    const cfg = this.field.cfg;
    return [
      `PROPHECY ${cfg.prophecy}`,
      `DESTINY ${cfg.destiny.toFixed(2)}`,
      `WORMHOLE ${cfg.wormhole.toFixed(2)}`,
      `CALENDAR_DRIFT ${cfg.calendarDrift.toFixed(1)}`,
      `ATTEND_FOCUS ${cfg.attendFocus.toFixed(2)}`,
      `ATTEND_SPREAD ${cfg.attendSpread.toFixed(2)}`,
      `TUNNEL_THRESHOLD ${cfg.tunnelThreshold.toFixed(2)}`,
      `TUNNEL_CHANCE ${cfg.tunnelChance.toFixed(2)}`,
      `TUNNEL_SKIP_MAX ${cfg.tunnelSkipMax}`,
      `LAW ENTROPY_FLOOR ${(cfg.entropyFloor || 0.1).toFixed(2)}`,
      `LAW DEBT_DECAY ${(cfg.debtDecay || 0.998).toFixed(4)}`,
      `GRAVITY DARK ${(cfg.darkGravity || 0.5).toFixed(2)}`,
    ].join("\n");
  }

  // hash phrase for scar ID
  _hashPhrase(phrase) {
    let hash = 0;
    for (let i = 0; i < phrase.length; i++) {
      hash = ((hash << 5) - hash + phrase.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}

function clamp01(x) { 
  x = Number.isFinite(x) ? x : 0; 
  return Math.max(0, Math.min(1, x)); 
}

function clamp(x, a, b) { 
  x = Number.isFinite(x) ? x : a; 
  return Math.max(a, Math.min(b, x)); 
}

function clampInt(x, a, b) { 
  x = Number.isFinite(x) ? x : a; 
  return Math.max(a, Math.min(b, x | 0)); 
}
