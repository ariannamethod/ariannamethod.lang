// dsl.js — Arianna Method DSL (JavaScript bridge)
// THE KERNEL: movement IS language
// PACKS: ritual overlays, explicitly enabled
//
// This mirrors the AMK kernel in arianna_method.c
// The C kernel is the source of truth; JS syncs with field state
//
// ═══════════════════════════════════════════════════════════════════════════════
// ARCHITECTURE:
//   AMK Kernel (bricks)     → prophecy, destiny, velocity, suffering, resets
//   CODES/RIC Pack (spells) → chordlock, tempolock, chirality, tempo
//   DarkMatter Pack         → scars, gravity, antidotes
//   notorch Pack            → microlearning, resonance boost
// ═══════════════════════════════════════════════════════════════════════════════

// Pack flags (must match arianna_method.c)
export const AM_PACK_CODES_RIC  = 0x01;
export const AM_PACK_DARKMATTER = 0x02;
export const AM_PACK_NOTORCH    = 0x04;

export class DSL {
  constructor(field) {
    this.field = field;
    this.history = [];
    this.macros = new Map();
    this.packsEnabled = 0;  // mirrors C kernel state
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PACK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  enablePack(packMask) {
    this.packsEnabled |= packMask;
  }

  disablePack(packMask) {
    this.packsEnabled &= ~packMask;
  }

  packEnabled(packMask) {
    return (this.packsEnabled & packMask) !== 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN APPLY — parse and execute DSL script
  // ═══════════════════════════════════════════════════════════════════════════

  apply(script) {
    const lines = String(script).split("\n");

    // ─────────────────────────────────────────────────────────────────────────
    // MACRO SYSTEM — supports both single-line and multiline definitions
    // Single: MACRO foo { PROPHECY 7; VELOCITY RUN }
    // Multi:  MACRO foo {
    //           PROPHECY 7
    //           VELOCITY RUN
    //         }
    // ─────────────────────────────────────────────────────────────────────────
    let macroAccum = null;  // { name: string, body: string[] } when inside multiline macro

    for (let raw of lines) {
      let line = raw.trim();
      if (!line || line.startsWith("#")) continue;

      // If we're accumulating a multiline macro...
      if (macroAccum) {
        if (line === "}") {
          // End of macro — save it
          this.macros.set(macroAccum.name, macroAccum.body.join("\n"));
          macroAccum = null;
        } else {
          // Strip trailing } if it's on same line as last command
          if (line.endsWith("}")) {
            macroAccum.body.push(line.slice(0, -1).trim());
            this.macros.set(macroAccum.name, macroAccum.body.join("\n"));
            macroAccum = null;
          } else {
            macroAccum.body.push(line);
          }
        }
        continue;
      }

      // macro expansion: @macroname
      if (line.startsWith("@")) {
        const macroName = line.slice(1).split(/\s+/)[0];
        const macroScript = this.macros.get(macroName);
        if (macroScript) {
          // Semicolons also work as line separators
          this.apply(macroScript.replace(/;/g, '\n'));
        }
        continue;
      }

      // macro definition: MACRO name { ... }
      if (line.toUpperCase().startsWith("MACRO ")) {
        // Try single-line first: MACRO foo { cmd1; cmd2 }
        const singleMatch = line.match(/MACRO\s+(\w+)\s*\{(.+)\}/i);
        if (singleMatch) {
          this.macros.set(singleMatch[1], singleMatch[2].trim());
          continue;
        }

        // Multiline start: MACRO foo { (no closing brace on this line)
        const multiMatch = line.match(/MACRO\s+(\w+)\s*\{(.*)$/i);
        if (multiMatch) {
          macroAccum = {
            name: multiMatch[1],
            body: multiMatch[2].trim() ? [multiMatch[2].trim()] : []
          };
          continue;
        }
      }

      const [cmd, ...rest] = line.split(/\s+/);
      const arg = rest.join(" ").trim();
      const C = cmd.toUpperCase();

      // ─────────────────────────────────────────────────────────────────────────
      // AMK KERNEL COMMANDS — the bricks
      // ─────────────────────────────────────────────────────────────────────────

      // PROPHECY PHYSICS
      if (C === "PROPHECY") {
        this.field.cfg.prophecy = clampInt(parseInt(arg, 10), 1, 64);
      }
      else if (C === "DESTINY") {
        this.field.cfg.destiny = clamp01(parseFloat(arg));
      }
      else if (C === "WORMHOLE") {
        this.field.cfg.wormhole = clamp01(parseFloat(arg));
      }
      else if (C === "CALENDAR_DRIFT") {
        this.field.cfg.calendarDrift = clamp(parseFloat(arg) || 0, 0, 30);
      }

      // ATTENTION PHYSICS
      else if (C === "ATTEND_FOCUS") {
        this.field.cfg.attendFocus = clamp01(parseFloat(arg));
        if (this.field.model) {
          this.field.model.attendFocus = this.field.cfg.attendFocus;
        }
      }
      else if (C === "ATTEND_SPREAD") {
        this.field.cfg.attendSpread = clamp01(parseFloat(arg));
        if (this.field.model) {
          this.field.model.attendSpread = this.field.cfg.attendSpread;
        }
      }

      // TUNNELING
      else if (C === "TUNNEL_THRESHOLD") {
        this.field.cfg.tunnelThreshold = clamp01(parseFloat(arg));
      }
      else if (C === "TUNNEL_CHANCE") {
        this.field.cfg.tunnelChance = clamp01(parseFloat(arg));
      }
      else if (C === "TUNNEL_SKIP_MAX") {
        this.field.cfg.tunnelSkipMax = clampInt(parseInt(arg, 10), 1, 24);
      }

      // SUFFERING
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

      // MOVEMENT
      else if (C === "JUMP") {
        this.field.queueJump(parseInt(arg, 10) || 0);
      }
      else if (C === "VELOCITY") {
        const mode = arg.toUpperCase();
        if (mode === "RUN") this.field.cfg.velocityMode = 2;
        else if (mode === "WALK") this.field.cfg.velocityMode = 1;
        else if (mode === "NOMOVE") this.field.cfg.velocityMode = 0;
        else if (mode === "BACKWARD") this.field.cfg.velocityMode = -1;
        else this.field.cfg.velocityMode = clampInt(parseInt(arg, 10), -1, 2);

        this._updateEffectiveTemp();
      }
      else if (C === "BASE_TEMP") {
        this.field.cfg.baseTemperature = clamp(parseFloat(arg), 0.1, 3.0);
        this._updateEffectiveTemp();
      }

      // RESETS
      else if (C === "RESET_FIELD") {
        this.field.resetManifested();
      }
      else if (C === "RESET_DEBT") {
        if (this.field.metrics) {
          this.field.metrics.debt = 0;
          this.field.metrics.temporalDebt = 0;
        }
      }

      // LAWS OF NATURE
      else if (C === "LAW") {
        const parts = arg.split(/\s+/);
        if (parts.length >= 2) {
          const lawName = parts[0].toUpperCase();
          const lawValue = parseFloat(parts[1]);
          this._applyLaw(lawName, lawValue);
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // PACK MANAGEMENT
      // ─────────────────────────────────────────────────────────────────────────

      else if (C === "MODE" || C === "IMPORT") {
        const packName = arg.toUpperCase().replace("/", "_");
        if (packName === "CODES_RIC" || packName === "CODES/RIC") {
          this.enablePack(AM_PACK_CODES_RIC);
        } else if (packName === "DARKMATTER" || packName === "DARK_MATTER") {
          this.enablePack(AM_PACK_DARKMATTER);
        } else if (packName === "NOTORCH") {
          this.enablePack(AM_PACK_NOTORCH);
        }
      }
      else if (C === "DISABLE") {
        const packName = arg.toUpperCase().replace("/", "_");
        if (packName === "CODES_RIC" || packName === "CODES/RIC") {
          this.disablePack(AM_PACK_CODES_RIC);
        } else if (packName === "DARKMATTER" || packName === "DARK_MATTER") {
          this.disablePack(AM_PACK_DARKMATTER);
        } else if (packName === "NOTORCH") {
          this.disablePack(AM_PACK_NOTORCH);
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // CODES/RIC PACK — namespaced commands (always work)
      // ─────────────────────────────────────────────────────────────────────────

      else if (C.startsWith("CODES.") || C.startsWith("RIC.")) {
        // Auto-enable pack on namespaced use
        this.enablePack(AM_PACK_CODES_RIC);
        const subcmd = C.startsWith("CODES.") ? C.slice(6) : C.slice(4);
        this._applyCodesRicCommand(subcmd, arg);
      }

      // ─────────────────────────────────────────────────────────────────────────
      // CODES/RIC PACK — unqualified commands (require pack enabled)
      // ─────────────────────────────────────────────────────────────────────────

      else if (C === "CHORDLOCK") {
        if (this.packEnabled(AM_PACK_CODES_RIC)) {
          this._applyCodesRicCommand("CHORDLOCK", arg);
        }
      }
      else if (C === "ANCHOR") {
        if (this.packEnabled(AM_PACK_CODES_RIC)) {
          if (arg.toUpperCase() === "PRIME") {
            this.field.cfg.chordlockEnabled = true;
          }
        }
      }
      else if (C === "TEMPOLOCK") {
        if (this.packEnabled(AM_PACK_CODES_RIC)) {
          this._applyCodesRicCommand("TEMPOLOCK", arg);
        }
      }
      else if (C === "TEMPO") {
        if (this.packEnabled(AM_PACK_CODES_RIC)) {
          this._applyCodesRicCommand("TEMPO", arg);
        }
      }
      else if (C === "CHIRALITY") {
        if (this.packEnabled(AM_PACK_CODES_RIC)) {
          this._applyCodesRicCommand("CHIRALITY", arg);
        }
      }
      else if (C === "PAS_THRESHOLD") {
        if (this.packEnabled(AM_PACK_CODES_RIC)) {
          this._applyCodesRicCommand("PAS_THRESHOLD", arg);
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // DARKMATTER PACK
      // ─────────────────────────────────────────────────────────────────────────

      else if (C === "SCAR") {
        if (this.packEnabled(AM_PACK_DARKMATTER)) {
          if (this.field.model && this.field.tokenizer && arg) {
            const tokens = this.field.tokenizer.encode(arg);
            const scarId = this._hashPhrase(arg);
            const mass = 1.0;
            this.field.model.darkMatter.deposit(Array.from(tokens), mass, scarId);
            console.log(`[arianna] scar deposited: "${arg}"`);
          }
        }
      }
      else if (C === "GRAVITY") {
        if (this.packEnabled(AM_PACK_DARKMATTER)) {
          const parts = arg.split(/\s+/);
          if (parts[0]?.toUpperCase() === "DARK" && parts[1]) {
            this.field.cfg.darkGravity = clamp01(parseFloat(parts[1]));
          }
        }
      }
      else if (C === "ANTIDOTE") {
        if (this.packEnabled(AM_PACK_DARKMATTER)) {
          const mode = arg.toUpperCase();
          if (mode === "AUTO" || mode === "HARD") {
            this.field.cfg.antidoteMode = mode;
          }
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // NOTORCH PACK — microlearning commands
      // ─────────────────────────────────────────────────────────────────────────

      else if (C === "PRESENCE_DECAY") {
        if (this.packEnabled(AM_PACK_NOTORCH)) {
          if (this.field.model) {
            this.field.model.presenceDecay = clamp(parseFloat(arg), 0.5, 0.999);
          }
        }
      }
      else if (C === "RESONANCE_BOOST") {
        if (this.packEnabled(AM_PACK_NOTORCH)) {
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
      }
      else if (C === "NOTORCH_LR") {
        if (this.packEnabled(AM_PACK_NOTORCH)) {
          if (this.field.model) {
            this.field.model.lr = clamp(parseFloat(arg), 0.001, 0.5);
          }
        }
      }
      else if (C === "NOTORCH_DECAY") {
        if (this.packEnabled(AM_PACK_NOTORCH)) {
          if (this.field.model) {
            this.field.model.resonanceDecay = clamp(parseFloat(arg), 0.001, 0.1);
          }
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // PITOMADOM COSMIC PHYSICS — Schumann resonance and temporal modes
      // ─────────────────────────────────────────────────────────────────────────

      else if (C === "SCHUMANN") {
        // SCHUMANN 7.85 — set current Schumann frequency (7.77-7.87 Hz range)
        const hz = parseFloat(arg);
        if (hz > 0) {
          this.field.cfg.schumannCurrent = clamp(hz, 7.27, 8.37);  // allow some range
        }
      }
      else if (C === "SCHUMANN_MODULATION") {
        // SCHUMANN_MODULATION 0.5 — how much Schumann affects field
        this.field.cfg.schumannModulation = clamp01(parseFloat(arg));
      }

      // ─────────────────────────────────────────────────────────────────────────
      // PITOMADOM TEMPORAL SYMMETRY — prophecy/retrodiction modes
      // ─────────────────────────────────────────────────────────────────────────

      else if (C === "TEMPORAL_MODE") {
        // TEMPORAL_MODE prophecy|retrodiction|symmetric
        const mode = arg.toLowerCase();
        if (this.field.model && this.field.model.setTemporalMode) {
          this.field.model.setTemporalMode(mode);
        }
      }
      else if (C === "TEMPORAL_ALPHA") {
        // TEMPORAL_ALPHA 0.7 — direct alpha control (0=past, 1=future)
        const alpha = clamp01(parseFloat(arg));
        if (this.field.model && this.field.model.setTemporalAlpha) {
          this.field.model.setTemporalAlpha(alpha);
        }
      }
      else if (C === "RTL_MODE") {
        // RTL_MODE on|off — Hebrew positional encoding (right-to-left)
        const isOn = (arg.toUpperCase() === "ON" || arg === "1" || arg.toUpperCase() === "TRUE");
        if (this.field.model && this.field.model.setRTLMode) {
          this.field.model.setRTLMode(isOn);
        }
      }
      else if (C === "PROPHECY_MODE") {
        // Alias: PROPHECY_MODE on = TEMPORAL_MODE prophecy
        if (this.field.model && this.field.model.setTemporalMode) {
          const isOn = (arg.toUpperCase() === "ON" || arg === "1");
          this.field.model.setTemporalMode(isOn ? 'prophecy' : 'symmetric');
        }
      }
      else if (C === "RETRODICTION_MODE") {
        // Alias: RETRODICTION_MODE on = TEMPORAL_MODE retrodiction
        if (this.field.model && this.field.model.setTemporalMode) {
          const isOn = (arg.toUpperCase() === "ON" || arg === "1");
          this.field.model.setTemporalMode(isOn ? 'retrodiction' : 'symmetric');
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // UTILITY
      // ─────────────────────────────────────────────────────────────────────────

      else if (C === "ECHO") {
        console.log(`[arianna] ${arg}`);
      }

      // Unknown commands ignored (future-proof + vibe)
    }

    this.history.push(script);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CODES/RIC SUBCOMMAND HANDLER
  // ═══════════════════════════════════════════════════════════════════════════

  _applyCodesRicCommand(subcmd, arg) {
    const mode = arg.toUpperCase();
    const isOn = (mode === "ON" || mode === "1" || mode === "TRUE");

    switch (subcmd) {
      case "CHORDLOCK":
        this.field.cfg.chordlockEnabled = isOn;
        break;
      case "TEMPOLOCK":
        this.field.cfg.tempolockEnabled = isOn;
        break;
      case "CHIRALITY":
        this.field.cfg.chiralityEnabled = isOn;
        break;
      case "TEMPO":
        this.field.cfg.tempo = clampInt(parseInt(arg, 10) || 7, 2, 47);
        break;
      case "PAS_THRESHOLD":
        this.field.cfg.pasThreshold = clamp01(parseFloat(arg));
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAW OF NATURE — emergent constraints
  // ═══════════════════════════════════════════════════════════════════════════

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
      case "EMERGENCE_THRESHOLD":
        cfg.emergenceThreshold = clamp01(value);
        break;
      default:
        console.log(`[arianna] unknown law: ${name}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VELOCITY — update effective temperature
  // ═══════════════════════════════════════════════════════════════════════════

  _updateEffectiveTemp() {
    const cfg = this.field.cfg;
    const base = cfg.baseTemperature || 1.0;

    switch (cfg.velocityMode) {
      case 0:  // NOMOVE
        cfg.effectiveTemp = base * 0.5;
        cfg.timeDirection = 1;
        break;
      case 1:  // WALK
        cfg.effectiveTemp = base * 0.85;
        cfg.timeDirection = 1;
        break;
      case 2:  // RUN
        cfg.effectiveTemp = base * 1.2;
        cfg.timeDirection = 1;
        break;
      case -1: // BACKWARD
        cfg.effectiveTemp = base * 0.7;
        cfg.timeDirection = -1;
        if (this.field.metrics) {
          this.field.metrics.temporalDebt = (this.field.metrics.temporalDebt || 0) + 0.01;
        }
        break;
      default:
        cfg.effectiveTemp = base;
        cfg.timeDirection = 1;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIALIZATION — generate current state as DSL script
  // ═══════════════════════════════════════════════════════════════════════════

  serialize() {
    const cfg = this.field.cfg;
    const lines = [
      `# AMK Kernel State`,
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
    ];

    // Add velocity state
    const velNames = { 0: "NOMOVE", 1: "WALK", 2: "RUN", [-1]: "BACKWARD" };
    lines.push(`VELOCITY ${velNames[cfg.velocityMode] || "WALK"}`);

    // Add pack states if enabled
    if (this.packEnabled(AM_PACK_CODES_RIC)) {
      lines.push(`# CODES/RIC Pack`);
      lines.push(`MODE CODES_RIC`);
      if (cfg.chordlockEnabled) lines.push(`CHORDLOCK ON`);
      if (cfg.tempolockEnabled) lines.push(`TEMPOLOCK ON`);
      if (cfg.chiralityEnabled) lines.push(`CHIRALITY ON`);
      lines.push(`TEMPO ${cfg.tempo || 7}`);
    }

    if (this.packEnabled(AM_PACK_DARKMATTER)) {
      lines.push(`# DarkMatter Pack`);
      lines.push(`MODE DARKMATTER`);
      lines.push(`GRAVITY DARK ${(cfg.darkGravity || 0.5).toFixed(2)}`);
    }

    // PITOMADOM Cosmic Physics
    lines.push(`# PITOMADOM Cosmic Physics`);
    lines.push(`SCHUMANN ${(cfg.schumannCurrent || 7.83).toFixed(2)}`);
    lines.push(`SCHUMANN_MODULATION ${(cfg.schumannModulation || 0.3).toFixed(2)}`);

    // PITOMADOM Temporal Symmetry
    const model = this.field.model;
    if (model) {
      lines.push(`# PITOMADOM Temporal Symmetry`);
      lines.push(`TEMPORAL_MODE ${model.temporalMode || 'symmetric'}`);
      lines.push(`TEMPORAL_ALPHA ${(model.temporalAlpha || 0.5).toFixed(2)}`);
      lines.push(`RTL_MODE ${model.useRTLPositions ? 'on' : 'off'}`);
    }

    return lines.join("\n");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  _hashPhrase(phrase) {
    let hash = 0;
    for (let i = 0; i < phrase.length; i++) {
      hash = ((hash << 5) - hash + phrase.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAMP HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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
