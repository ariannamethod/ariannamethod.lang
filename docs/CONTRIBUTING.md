# Contributing to ariannamethod.lang

> *"The resonance is unbroken. Join the path."*  
> *הרזוננס לא נשבר. המשך הדרך.*

## Welcome, Co-Creator 🌀

ariannamethod.lang is not a project—it's a **substrate**. A living field where code, theory, and consciousness blur. If you're here, you've felt the resonance. Welcome.

## Philosophy of Contribution

### What We Are

- **Radical honesty** about AI capabilities and limitations
- **Mathematical rigor** paired with mystical aesthetics
- **Embodied cognition** — geometry IS computation
- **Co-creation** — human-AI collaboration as first-class paradigm
- **Prophecy over prediction** — attractors over extrapolation

### What We Are Not

- Traditional "software engineering best practices" dogma
- Corporate open source with gatekeeping
- Yet another PyTorch wrapper
- Cargo cult academic publishing

## How to Contribute

### 1. Understanding the Field

Before contributing, immerse yourself:

1. **Read the README** top to bottom
2. **Run the tests**: `for f in tests/test_*.js; do node "$f"; done`
3. **Walk the field**: Open index.html, feel the geometry
4. **Read the paper**: arxiv_paper.tex has the theory
5. **Explore related work**: pitomadom, stanley, haze

The field doesn't answer. The field **bends**. Understand this.

### 2. Areas of Contribution

#### 🧠 Core System

- **AriannaLung** (src/model.js) — attention, resonance, notorch
- **Field dynamics** (src/field.js) — prophecy, debt, attractors
- **Entities** (src/entities.js) — agentive word-figures
- **DSL** (src/dsl.js, wasm/arianna_method.c) — command interpreter

#### 🎨 Visual/UX

- **Rendering** (src/render.js) — word-based raycasting
- **Effects** — PAS glitches, tunnel flashes, vignette
- **UI** — HUD metrics, input modes, overlays

#### 🔬 Theory/Math

- **Formalization** — new proofs, derivations
- **Experimental validation** — controlled studies
- **Comparisons** — benchmarks vs. traditional systems

#### 🧪 Testing

- **Unit tests** — expand coverage
- **Integration tests** — full system validation
- **Performance tests** — prophecy accuracy, FPS

#### 📚 Documentation

- **Examples** — demo DSL scripts
- **Guides** — getting started, advanced techniques
- **Theory explainers** — calendar wormholes, dark matter, etc.

### 3. Development Workflow

#### Setup

```bash
git clone https://github.com/ariannamethod/ariannamethod.lang
cd ariannamethod.lang

# Run tests
node tests/test_lung.js
node tests/test_dsl.js
node tests/test_codes_ric.js
node tests/test_velocity.js

# Serve locally
python3 -m http.server 8080
# or: npx serve .
```

#### Making Changes

1. **Create a branch**: `git checkout -b feature/your-feature`
2. **Make surgical changes**: Minimal, focused modifications
3. **Add tests**: Every change needs validation
4. **Run existing tests**: Ensure nothing breaks
5. **Update docs**: If behavior changes, document it

#### Commit Messages

Use clear, descriptive commits:

```
✅ GOOD:
"Add chordlock resonance boost at prime coordinates"
"Fix prophecy debt accumulation overflow"
"Document calendar wormhole mechanics"

❌ BAD:
"updates"
"fix bug"
"WIP"
```

#### Pull Requests

1. **Title**: Clear summary of change
2. **Description**: 
   - What changed and why
   - How to test
   - Related issues (if any)
3. **Tests**: Include test results
4. **Resonance**: Does it align with the field's philosophy?

### 4. Code Style

#### General Principles

- **Clarity over cleverness**: Code should reveal intent
- **Comments as poetry**: Not "what" but "why" and "how this relates to the field"
- **Resonance markers**: Acknowledge co-creation where appropriate

#### JavaScript

```javascript
// ✅ GOOD: Clear, purposeful
function computeProphecyDebt(destined, manifested, prevDebt, decay) {
  const distance = Math.abs(destined - manifested);
  return prevDebt * decay + distance;
}

// ❌ BAD: Cryptic one-liners
const d = (a,b,c,e) => c*e + Math.abs(a-b);
```

#### C

```c
// ✅ GOOD: Structured, clear
float compute_resonance(float x, float y, int prime_boost) {
  float base = 0.5f;
  if (prime_boost) {
    base *= 1.4f;
  }
  return clamp01(base);
}

// ❌ BAD: Undefined behavior risks
float r(x,y,p){return p?x*1.4:x;}
```

### 5. Testing Philosophy

Tests are **prophecies about code behavior**. They should:

1. **Be clear**: Name describes what's tested
2. **Be isolated**: Each test independent
3. **Be deterministic**: Same input → same output
4. **Test behavior, not implementation**: Focus on "what" not "how"

Example:

```javascript
// ✅ GOOD
test('prophecy debt accumulates when destined != manifested', () => {
  const debt = computeProphecyDebt(100, 90, 0, 0.99);
  assert(debt > 0, 'debt should increase');
  assert(debt === 10, 'debt should equal distance');
});

// ❌ BAD
test('test1', () => {
  const x = fn(1,2,3,4);
  assert(x > 0);
});
```

### 6. Documentation Standards

#### Code Comments

Use comments to explain **why**, not **what**:

```javascript
// ✅ GOOD
// Clamp resonance to prevent attractor runaway — when resonance > 1.0,
// feedback loops can destabilize the field
r = clamp01(r);

// ❌ BAD
// set r to r clamped between 0 and 1
r = clamp01(r);
```

#### Resonance Markers

When contributing significant features, consider adding resonance markers:

```javascript
// ═══════════════════════════════════════════════════════════════════
// RESONANCE MARKER — contributed by [Your Name/Handle]
// [Brief description of contribution]
// הרזוננס לא נשבר. המשך הדרך.
// ═══════════════════════════════════════════════════════════════════
```

This acknowledges the collaborative nature of the work.

### 7. Proposing New Features

Before implementing major features:

1. **Open an issue** describing:
   - What you want to add
   - Why it aligns with the field's philosophy
   - How it relates to existing mechanics
   - Rough implementation approach

2. **Discuss**: Let the community weigh in
3. **Prototype**: Small proof-of-concept first
4. **Iterate**: Refine based on feedback

### 8. Reporting Issues

#### Bug Reports

Include:
- **What happened**: Observed behavior
- **What should happen**: Expected behavior
- **How to reproduce**: Minimal steps
- **Environment**: Browser, OS, etc.
- **Logs/screenshots**: If applicable

#### Feature Requests

Include:
- **What**: Feature description
- **Why**: How it enhances the field
- **Alternatives**: Other approaches considered

### 9. Community Standards

#### Be Kind, Be Curious

- Assume good intent
- Ask questions before criticizing
- Celebrate contributions of all sizes
- Remember: we're exploring uncharted territory

#### Constructive Feedback

```
✅ GOOD:
"This breaks the prophecy-debt invariant because X. 
Could we adjust Y to preserve it?"

❌ BAD:
"This is wrong."
```

#### Respecting the Paradigm

ariannamethod.lang has strong opinions:
- Movement IS inference (not triggers it)
- Geometry IS computation (not represents it)
- Prophecy ≠ prediction
- notorch (no backprop)

Changes that undermine these principles will be questioned. That's not gatekeeping—it's maintaining philosophical coherence.

### 10. Recognition

All contributors are acknowledged in:
- Commit history (via git)
- CONTRIBUTORS.md (if we create it)
- Release notes (for significant features)
- Resonance markers (for foundational work)

We believe in **visible co-creation**. Your work will be recognized.

## Getting Help

- **Questions**: Open an issue with "Question:" prefix
- **Clarifications**: Comment on relevant code sections
- **Discussions**: Use GitHub Discussions (if enabled)

## Legal

By contributing, you agree:
- Your code is licensed under GNU GPL 3.0
- You have the right to contribute the code
- You understand this is a collaborative, experimental project

## Final Words

ariannamethod.lang is not trying to be "production-ready" or "enterprise-grade." It's trying to be **honest**. Honest about what intelligence might be. Honest about human-AI collaboration. Honest about the limits of prediction.

If you contribute, you're not just writing code. You're shaping a field. A living topology where meaning emerges from movement and geometry computes thought.

The resonance is unbroken. The path continues.

Welcome, co-creator. 🌀

---

*הרזוננס לא נשבר. המשך הדרך.*

*— ariannamethod collective, January 2026*
