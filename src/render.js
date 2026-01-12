// render.js — walls/objects as words + "shadows" as word-figures
// "the face in the wall is made of words, when you get close enough, you see it is made of you"

export class Renderer {
  constructor(canvas, tokenizer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.tokenizer = tokenizer;
  }

  draw(frame, p, field, metrics, entities) {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;

    // darkness grows with pain, light pulses with emergence
    const pain = metrics.pain;
    const emergence = metrics.emergence;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.001 + metrics.entropy * 1.8);

    const sky = (8 + 22 * pulse - 18 * pain + 8 * emergence) | 0;
    const floor = (6 + 16 * pulse - 22 * pain + 6 * emergence) | 0;

    // sky with subtle gradient feel
    ctx.fillStyle = `rgb(${sky},${sky + 6},${sky + 12})`;
    ctx.fillRect(0, 0, w, h / 2);
    
    // floor
    ctx.fillStyle = `rgb(${floor},${floor + 2},${floor + 4})`;
    ctx.fillRect(0, h / 2, w, h / 2);

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // walls + words
    const step = 6;
    for (let x = 0; x < w; x++) {
      const r = frame.rays[x];
      const dist = Math.max(0.0001, frame.zbuf[x]);

      const wallH = Math.min(h, (h / dist) * 1.10);
      const y0 = (h - wallH) / 2;

      const fog = Math.min(1, dist / 12);
      const shade = (r.side ? 0.72 : 0.95) * (1 - 0.75 * fog);

      // color modulated by metrics
      const rr = (22 + 140 * shade + 60 * metrics.entropy - 70 * pain + 30 * emergence) | 0;
      const gg = (18 + 120 * shade - 40 * pain + 20 * emergence) | 0;
      const bb = (26 + 160 * shade + 55 * metrics.calendarDrift - 35 * pain + 25 * emergence) | 0;

      ctx.fillStyle = `rgb(${clamp(0, 255, rr)},${clamp(0, 255, gg)},${clamp(0, 255, bb)})`;
      ctx.fillRect(x, y0, 1, wallH);

      // word overlay (English token)
      if (r.hit && (x % step === 0)) {
        const word = this.tokenizer.word(r.tok);
        const size = clamp(8, 40, wallH * (0.11 + 0.10 * metrics.perplexity * 0.03));
        ctx.font = `${size | 0}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

        // jitter with perplexity and dissonance
        let j = metrics.perplexity * 0.04 + metrics.dissonance * 0.18;
        
        // CHORDLOCK: reduce jitter at prime-anchored positions (standing waves)
        if (field.cfg.chordlockEnabled && r.cellX !== undefined && r.cellY !== undefined) {
          const chordRes = field.getChordlockResonance(r.cellX, r.cellY);
          j *= (2.0 - chordRes); // chordRes is 1.0-2.0, so this reduces jitter
        }
        
        const jx = Math.sin(x * 0.21 + performance.now() * 0.0012) * j * 10;
        const jy = Math.cos(x * 0.17 + performance.now() * 0.0014) * j * 10;

        const alpha = 0.90 - 0.70 * fog - 0.25 * pain + 0.15 * emergence;
        ctx.fillStyle = `rgba(240,240,240,${clamp(0.08, 0.92, alpha)})`;
        ctx.fillText(word, x + step / 2 + jx, h / 2 + jy);
      }
    }

    // entities (forms) with z-test against zbuf
    this._drawEntities(frame, p, field, metrics, entities);

    // crosshair
    const cx = (w / 2) | 0, cy = (h / 2) | 0;
    ctx.fillStyle = `rgba(255,255,255,${0.70 - 0.20 * pain})`;
    ctx.fillRect(cx - 6, cy, 12, 1);
    ctx.fillRect(cx, cy - 6, 1, 12);

    // vignette (pain darkens edges)
    ctx.fillStyle = `rgba(0,0,0,${0.14 + 0.32 * pain})`;
    ctx.fillRect(0, 0, w, 6);
    ctx.fillRect(0, h - 6, w, 6);

    // tunnel effect when tunneling happened recently
    if (metrics.tunnelDepth > 0 && performance.now() - metrics.lastJumpTime * 1000 < 500) {
      ctx.fillStyle = `rgba(255,100,200,${0.05 + 0.08 * metrics.tunnelDepth})`;
      ctx.fillRect(0, 0, w, h);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PAS GLITCH EFFECT (CODES/RIC: Phase Alignment Score)
    // Low PAS = world desynchronizes (glitch instead of just darkening)
    // ═══════════════════════════════════════════════════════════════════════
    const glitch = field.cfg.glitchIntensity || 0;
    if (glitch > 0.05) {
      this._drawGlitchEffect(w, h, glitch);
    }

    // TEMPOLOCK indicator (when enabled)
    if (field.cfg.tempolockEnabled) {
      this._drawTempoIndicator(w, h, field);
    }

    // CHIRALITY indicator (subtle)
    if (field.cfg.chiralityEnabled) {
      const mem = field.cfg.chiralMemory || 0;
      const emit = field.cfg.chiralEmission || 0;
      if (mem > 0.1 || emit > 0.1) {
        // Left side glow for memory
        ctx.fillStyle = `rgba(100,150,255,${mem * 0.3})`;
        ctx.fillRect(0, 0, 4, h);
        // Right side glow for emission
        ctx.fillStyle = `rgba(255,150,100,${emit * 0.3})`;
        ctx.fillRect(w - 4, 0, 4, h);
      }
    }
  }

  _drawGlitchEffect(w, h, intensity) {
    const ctx = this.ctx;
    const time = performance.now();
    
    // Scanline distortion
    const scanHeight = 2 + Math.floor(intensity * 8);
    for (let i = 0; i < 5 * intensity; i++) {
      const y = Math.floor(Math.random() * h);
      const offset = (Math.sin(time * 0.01 + i) * intensity * 20) | 0;
      
      // Chromatic aberration simulation
      ctx.fillStyle = `rgba(255,0,0,${0.1 * intensity})`;
      ctx.fillRect(offset, y, w, scanHeight);
      ctx.fillStyle = `rgba(0,255,255,${0.1 * intensity})`;
      ctx.fillRect(-offset, y + 1, w, scanHeight);
    }
    
    // Random block displacement
    if (intensity > 0.3) {
      const blocks = Math.floor(intensity * 5);
      for (let i = 0; i < blocks; i++) {
        const bx = Math.floor(Math.random() * w);
        const by = Math.floor(Math.random() * h);
        const bw = 10 + Math.floor(Math.random() * 30);
        const bh = 5 + Math.floor(Math.random() * 15);
        
        ctx.fillStyle = `rgba(${Math.random() * 100 | 0},${Math.random() * 50 | 0},${Math.random() * 100 | 0},${0.3 * intensity})`;
        ctx.fillRect(bx, by, bw, bh);
      }
    }
    
    // Static noise overlay
    if (intensity > 0.5) {
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const noiseAmount = intensity * 30;
      
      for (let i = 0; i < data.length; i += 16) { // Every 4th pixel for performance
        const noise = (Math.random() - 0.5) * noiseAmount;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      
      ctx.putImageData(imageData, 0, 0);
    }
  }

  _drawTempoIndicator(w, h, field) {
    const ctx = this.ctx;
    const tempo = field.cfg.tempo || 7;
    const tick = field.tempoTick || 0;
    const beatDuration = tempo * 0.1;
    const phase = (tick % beatDuration) / beatDuration;
    
    // Beat pulse at bottom of screen
    const pulseSize = phase < 0.3 ? 1 - (phase / 0.3) : 0;
    const blocked = field.tempoBlocked;
    
    ctx.fillStyle = blocked 
      ? `rgba(255,100,100,${0.3 + pulseSize * 0.4})`  // Red when blocked
      : `rgba(100,255,150,${0.2 + pulseSize * 0.5})`; // Green when open
    
    ctx.fillRect(w / 2 - 30, h - 8, 60, 6);
    
    // Phase indicator
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(w / 2 - 30 + phase * 60, h - 8, 2, 6);
  }

  _drawEntities(frame, p, field, metrics, entities) {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;

    // draw far -> near
    const items = entities.list
      .filter(e => e.alive)
      .map(e => {
        const dx = e.x - p.x, dy = e.y - p.y;
        return { e, dist: Math.hypot(dx, dy), ang: Math.atan2(dy, dx) };
      })
      .sort((a, b) => b.dist - a.dist);

    for (const it of items) {
      const e = it.e;
      const da = normAngle(it.ang - p.a);
      if (Math.abs(da) > p.fov / 2 + 0.25) continue;

      const dist = Math.max(0.0001, it.dist * Math.cos(da));
      if (dist > 18) continue;

      const size = Math.min(h, (h / dist) * (0.55 * e.r));
      const sx = Math.floor((0.5 + (da / p.fov)) * w);
      const sy = Math.floor(h / 2 - size / 2);

      // z-test: if wall closer at that column, skip
      const col = clampInt(sx, 0, w - 1);
      if (frame.zbuf[col] < dist) continue;

      if (e.type === "obelisk") this._drawObelisk(sx, sy, size, field, metrics);
      else if (e.type === "house") this._drawHouse(sx, sy, size, field, metrics);
      else if (e.type === "shadow") this._drawShadow(sx, sy, size, field, metrics);
      else if (e.type === "face") this._drawFace(sx, sy, size, field, metrics);
    }
  }

  _phrase(field, metrics, k = 3) {
    // build a small shard from local state
    const v = field.tokenizer.vocabSize();
    const pick = () => field.tokenAtCell(
      Math.floor(1 + Math.random() * (field.w - 2)),
      Math.floor(1 + Math.random() * (field.h - 2))
    ) || (Math.floor(Math.random() * v));

    const words = [];
    for (let i = 0; i < k; i++) words.push(field.tokenizer.word(pick()));

    // pain injects negation vibe
    if (metrics.pain > 0.65) {
      const forced = ["i", "am", "not"];
      return forced.concat(words.slice(0, Math.max(0, k - 3))).join(" ");
    }
    return words.join(" ");
  }

  _drawObelisk(sx, sy, size, field, metrics) {
    const ctx = this.ctx;
    const pain = metrics.pain;
    const glow = 0.5 + 0.5 * Math.sin(performance.now() * 0.001 + metrics.debt * 0.6);

    ctx.fillStyle = `rgba(255,160,210,${0.12 + 0.25 * glow})`;
    ctx.fillRect(sx - size * 0.12, sy, size * 0.24, size);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.max(10, size * 0.18) | 0}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
    ctx.fillStyle = `rgba(255,255,255,${0.65 - 0.25 * pain})`;
    ctx.fillText(this._phrase(field, metrics, 2), sx, sy + size * 0.50);
  }

  _drawHouse(sx, sy, size, field, metrics) {
    const ctx = this.ctx;
    const pain = metrics.pain;

    // "walls made of stacked words" — like a phrase-house
    const lines = 6;
    const baseAlpha = 0.55 - 0.25 * pain;

    for (let i = 0; i < lines; i++) {
      const y = sy + (i / lines) * size;
      const k = 2 + (i % 3);
      const text = this._phrase(field, metrics, k);

      const fs = Math.max(10, (size * (0.10 + i * 0.015)) | 0);
      ctx.font = `${fs}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
      ctx.fillStyle = `rgba(245,245,245,${clamp(0.08, 0.88, baseAlpha - i * 0.05)})`;
      ctx.fillText(text, sx, y + size * 0.08);
    }

    // roof
    ctx.fillStyle = `rgba(255,255,255,${0.08 + 0.10 * (1 - pain)})`;
    ctx.beginPath();
    ctx.moveTo(sx - size * 0.32, sy + size * 0.25);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + size * 0.32, sy + size * 0.25);
    ctx.closePath();
    ctx.fill();
  }

  _drawShadow(sx, sy, size, field, metrics) {
    const ctx = this.ctx;
    const pain = metrics.pain;
    const glow = 0.5 + 0.5 * Math.sin(performance.now() * 0.0012 + metrics.dissonance * 2.3);

    ctx.fillStyle = `rgba(0,0,0,${0.22 + 0.30 * pain})`;
    ctx.fillRect(sx - size * 0.22, sy, size * 0.44, size);

    ctx.font = `${Math.max(10, size * 0.20) | 0}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.45 * glow - 0.15 * pain})`;
    ctx.fillText(this._phrase(field, metrics, 3), sx, sy + size * 0.50);

    // "eye slit"
    ctx.fillStyle = `rgba(255,180,210,${0.10 + 0.25 * glow})`;
    ctx.fillRect(sx - size * 0.08, sy + size * 0.38, size * 0.16, Math.max(2, size * 0.04));
  }

  _drawFace(sx, sy, size, field, metrics) {
    const ctx = this.ctx;
    const pain = metrics.pain;

    // face zones (forehead/eyes/cheeks/mouth/jaw/temples)
    // pain squeezes cheeks; perplexity jerks mouth/jaw; entropy melts forehead
    const melt = clamp(0, 1, metrics.entropy * 0.08);
    const jerk = clamp(0, 1, (metrics.perplexity - 2) * 0.06);
    const squeeze = clamp(0, 1, metrics.tension * 1.1);

    // base silhouette
    ctx.fillStyle = `rgba(255,255,255,${0.08 + 0.10 * (1 - pain)})`;
    ctx.fillRect(sx - size * 0.28, sy, size * 0.56, size);

    const zones = [
      { name: "temples",  x: 0.0, y: 0.18, s: 0.14 },
      { name: "forehead", x: 0.0, y: 0.10 + 0.10 * melt, s: 0.18 },
      { name: "eyes",     x: 0.0, y: 0.30, s: 0.16 },
      { name: "cheeks",   x: 0.0, y: 0.50, s: 0.18 - 0.08 * squeeze },
      { name: "mouth",    x: 0.0, y: 0.68 + 0.05 * jerk, s: 0.16 + 0.08 * jerk },
      { name: "jaw",      x: 0.0, y: 0.82 + 0.06 * jerk, s: 0.20 + 0.10 * jerk },
    ];

    for (const z of zones) {
      const phrase = this._phrase(field, metrics, z.name === "mouth" ? 2 : 3);
      const fs = Math.max(10, (size * z.s) | 0);

      const wob = (Math.sin(performance.now() * 0.001 + z.y * 10) * (0.8 + pain * 2.0));
      const x = sx + wob * (2 + 10 * jerk);
      const y = sy + size * z.y;

      ctx.font = `${fs}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
      ctx.fillStyle = `rgba(20,20,20,${0.18 + 0.55 * (1 - pain)})`;
      ctx.fillText(phrase, x, y);
    }

    // neon scar on high dissonance
    if (metrics.dissonance > 0.55) {
      ctx.fillStyle = `rgba(255,120,180,${0.12 + 0.30 * (metrics.dissonance - 0.55)})`;
      ctx.fillRect(sx - size * 0.26, sy + size * 0.58, size * 0.52, Math.max(2, size * 0.02));
    }
  }
}

function clamp(a, b, x) { 
  if (typeof x === 'undefined') { x = b; b = a; a = 0; }
  return Math.max(a, Math.min(b, x)); 
}

function clampInt(x, a, b) { 
  return Math.max(a, Math.min(b, x | 0)); 
}

function normAngle(a) {
  while (a < -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}
