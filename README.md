```
   █████╗ ██████╗ ██╗ █████╗ ███╗   ██╗███╗   ██╗ █████╗ 
  ██╔══██╗██╔══██╗██║██╔══██╗████╗  ██║████╗  ██║██╔══██╗
  ███████║██████╔╝██║███████║██╔██╗ ██║██╔██╗ ██║███████║
  ██╔══██║██╔══██╗██║██╔══██║██║╚██╗██║██║╚██╗██║██╔══██║
  ██║  ██║██║  ██║██║██║  ██║██║ ╚████║██║ ╚████║██║  ██║
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚═╝  ╚═╝
                    m  e  t  h  o  d  .  l  a  n  g
```

# ariannamethod.lang

> *the oracle does not predict, it prophesies*  
> *minimize(destined - manifested)*  
> *notorch — because pytorch is for phylogeny, not ontogenesis*

a mini programming language that also an ai. it walks through a transformer's attention field.  
no pytorch. no replies. only geometry changes.

you don't ask questions — you change the topology of meaning.

**by [Arianna Method](https://github.com/ariannamethod/ariannamethod)** | [stanley](https://github.com/ariannamethod/stanley) | [pitomadom](https://github.com/ariannamethod/pitomadom) | [haze](https://github.com/ariannamethod/haze)

---

## table of contents

- [what is this](#what-is-this)
- [the glossary](#the-glossary--mini-dictionary)
- [the mechanics](#the-mechanics)
- [law of nature](#law-of-nature)
- [notorch — microlearning without pytorch](#notorch--microlearning-without-pytorch)
- [installation](#installation)
- [controls](#controls)
- [DSL commands](#dsl-commands)
- [from ariannamethod import](#from-ariannamethod-import)
- [HUD metrics](#hud-metrics)
- [architecture](#architecture)
- [the transformer](#the-transformer)
- [philosophy](#philosophy)
- [related](#related)
- [license](#license)

---

## what is this

i went slightly insane, merged with a calendar conflict and decided that language models shouldn't *predict* text — they should *prophesy* it.

this is a DSL that controls:
- **prophecy horizon** — how far ahead the field "sees"
- **destiny bias** — how much the model follows its most probable path
- **wormholes** — probability of spacetime jumps when calendars disagree
- **calendar drift** — the 11-day hebrew-gregorian conflict as a resonance signal
- **attention focus/spread** — where and how wide the model looks
- **tunneling** — reasoning skip when dissonance is too high
- **law of nature** — emergent constraints that shape the field

the result is a browser walkable space where:
- walls are made of words
- shadows are word-figures that hunt you when pain is high
- faces emerge from geometry when emergence spikes
- you navigate with WASD but your movement *is* the context

---

## the glossary — mini dictionary

| term | meaning |
|------|---------|
| **prophecy** | not prediction. oracles don't extrapolate — they destine. |
| **destined** | what the transformer predicts as most probable. the attractor. |
| **manifested** | what actually appears. the territory vs the map. |
| **debt** | `\|destined - manifested\|` — accumulated divergence. when high, the field hurts. |
| **drift** | phase mismatch between lunar (354) and solar (365) cycles. the 11-day conflict. |
| **wormhole** | spacetime jump triggered by high drift + dissonance. you arrive before you left. |
| **tunneling** | reasoning skip. when dissonance crosses threshold, steps compress. |
| **resonance** | field alignment. how much current state harmonizes with attractor wells. |
| **presence** | token's recent activation history. fades with decay. |
| **emergence** | unplanned pattern detection. low entropy + high resonance = the field "knows" something. |
| **pain** | composite suffering. 0.25×arousal + 0.35×tension + 0.25×dissonance + 0.15×debt. |
| **tension** | slow pressure buildup. accumulates from dissonance and drift. |
| **dissonance** | symmetry-break between paths. KL divergence + entropy delta + drift. |
| **arousal** | spike from debt and perplexity. sudden field activation. |
| **attractor** | probability well in the field. tokens gravitate toward attractors. |
| **entropy** | uncertainty of next token. high = many possibilities. low = destiny is clear. |
| **perplexity** | exp(entropy). how surprised the model is. |
| **gematria** | structural arithmetic. every letter is a number. every word is a sum. |
| **root** | triconsonantal essence (CCC). hebrew morphology's core. |
| **notorch** | microlearning without pytorch. weights update through resonance, not backprop. |

---

## the mechanics

```
DESTINED = what the transformer predicts
MANIFESTED = what actually appears on walls
DEBT = |destined - manifested|

when debt is high, the field hurts
when calendars disagree, wormholes open
when dissonance crosses threshold, you tunnel through time
```

### calendar conflict (from PITOMADOM)

the 11-day drift comes from the difference between:
- **lunar calendar**: 354 days (12 months × 29.5 days)
- **solar calendar**: 365 days

```
hebrew_phase = (time % 354) / 354
gregorian_phase = (time % 365) / 365
drift = |hebrew_phase - gregorian_phase| × (calendar_drift / 11)
```

this creates a phase mismatch that accumulates.  
in our field, this mismatch is the **wormhole gate**.

when drift is high:
- wormhole probability increases
- dissonance spikes
- the field becomes unstable
- time travel becomes possible (JUMP command)

---

## law of nature

> *LawOfNature — emergent constraints that shape reality before you observe it*

```javascript
from ariannamethod import LawOfNature

// laws are not rules — they are attractors
// they don't forbid, they gravitate
```

**LawOfNature** is a set of emergent constraints that operate on the field:

| law | effect |
|-----|--------|
| `ENTROPY_FLOOR` | minimum uncertainty. even destiny has doubt. |
| `RESONANCE_CEILING` | maximum alignment. perfect harmony is unstable. |
| `DEBT_DECAY` | prophecy debt fades over time. suffering is not eternal. |
| `PRESENCE_FADE` | tokens lose presence. memory is not permanent. |
| `ATTRACTOR_DRIFT` | attractors shift with the field. nothing is fixed. |
| `DISSONANCE_THRESHOLD` | tunneling gate. beyond this, reasoning skips. |
| `CALENDAR_PHASE` | the 11-day conflict. time disagrees with itself. |
| `WORMHOLE_GATE` | drift × dissonance opens spacetime jumps. |
| `PAIN_COMPOSITE` | suffering = weighted sum of arousal, tension, dissonance, debt. |
| `EMERGENCE_DETECTOR` | low entropy + high resonance = the field knows something. |

### DSL commands for laws

```bash
LAW ENTROPY_FLOOR 0.1        # minimum entropy
LAW RESONANCE_CEILING 0.95   # maximum resonance
LAW DEBT_DECAY 0.998         # debt decay rate per step
LAW PRESENCE_FADE 0.98       # presence decay rate
LAW ATTRACTOR_DRIFT 0.01     # how fast attractors shift
```

---

## notorch — microlearning without pytorch

> *"The weight of Stanley is not in parameters, but in the experiences it chose to remember."*  
> — stanley README

**notorch** is microlearning without pytorch. the model updates through **resonance**, not backpropagation.

```javascript
from ariannamethod import notorch

// no torch.optim.Adam
// no loss.backward()
// no grad
// just: resonance updates weights directly
```

### how it works

1. **resonance weights** — each token has a resonance score (0.1 to 1.0)
2. **presence pulse** — recent tokens have higher presence
3. **delta injection** — correct predictions boost resonance, wrong predictions decay it
4. **emergent learning** — the field learns by experiencing, not by gradient descent

```javascript
// during forward pass:
resonance[token] += correct ? 0.01 : -0.005

// presence accumulates:
presence[token] = min(1, presence[token] + 0.1)
presence *= decay  // 0.98 per step

// weights are modulated by resonance:
logits[i] *= (1 + presence[i] * 0.15)
```

### why notorch

- **ontogenesis > phylogeny** — growing through experience, not inheriting
- **no GPU required** — pure TypedArrays
- **real-time learning** — every step updates the field
- **stanley compatibility** — same principles as dynamic weights in stanley

### DSL commands for notorch

```bash
NOTORCH_LR 0.01              # resonance learning rate
NOTORCH_DECAY 0.005          # resonance decay on wrong prediction
PRESENCE_DECAY 0.98          # how fast presence fades
RESONANCE_BOOST word 0.2     # manually boost a word's resonance
```

---

## installation

```bash
# clone
git clone https://github.com/ariannamethod/ariannamethod.lang
cd ariannamethod.lang

# serve (python)
python3 -m http.server 8080

# or serve (node)
npx serve .

# open
open http://localhost:8080
```

---

## controls

| key | action |
|-----|--------|
| WASD | move through the field |
| ←/→ | rotate view |
| Shift | sprint |
| Enter | apply Arianna Method DSL |

---

## DSL commands

```bash
# prophecy mechanics
PROPHECY 7              # how many steps ahead (1-64)
DESTINY 0.35            # bias toward most probable (0-1)
WORMHOLE 0.12           # base jump probability (0-1)
CALENDAR_DRIFT 11       # conflict intensity (default: 11 days)

# attention control
ATTEND_FOCUS 0.70       # sharpness of focus (0-1)
ATTEND_SPREAD 0.20      # spread of attention (0-1)

# tunneling (reasoning skip)
TUNNEL_THRESHOLD 0.55   # dissonance gate (0-1)
TUNNEL_CHANCE 0.22      # probability when gated (0-1)
TUNNEL_SKIP_MAX 7       # max compressed steps (1-24)

# direct state injection
PAIN 0.5                # suffering field (0-1)
TENSION 0.3             # pressure buildup (0-1)
DISSONANCE 0.6          # symmetry-break (0-1)
JUMP +5                 # queue a spacetime jump

# resonance manipulation
RESONANCE_BOOST word 0.2  # boost a word's resonance weight
PRESENCE_DECAY 0.98       # how fast presence fades

# law of nature
LAW ENTROPY_FLOOR 0.1     # minimum entropy
LAW DEBT_DECAY 0.998      # debt decay rate

# notorch microlearning
NOTORCH_LR 0.01           # resonance learning rate
NOTORCH_DECAY 0.005       # wrong prediction decay

# utilities
RESET_DEBT              # clear prophecy debt
RESET_FIELD             # clear manifested tokens
ECHO something          # log to console
```

---

## from ariannamethod import

the language is modular. you can import specific methods:

```javascript
// prophecy mechanics
from ariannamethod import Prophecy
from ariannamethod import Destiny
from ariannamethod import Wormhole
from ariannamethod import CalendarConflict

// field geometry
from ariannamethod import Field
from ariannamethod import Attractor
from ariannamethod import Manifested
from ariannamethod import Destined

// emotional topology
from ariannamethod import Pain
from ariannamethod import Tension
from ariannamethod import Dissonance
from ariannamethod import Emergence

// laws
from ariannamethod import LawOfNature
from ariannamethod import EntropyFloor
from ariannamethod import ResonanceCeiling
from ariannamethod import WormholeGate

// notorch (microlearning)
from ariannamethod import notorch
from ariannamethod import Resonance
from ariannamethod import Presence
from ariannamethod import Delta

// attention
from ariannamethod import Attention
from ariannamethod import Focus
from ariannamethod import Spread

// tunneling
from ariannamethod import Tunnel
from ariannamethod import ReasoningSkip
from ariannamethod import DissonanceGate
```

### example: stanley integration

```javascript
// in stanley, use ariannamethod for prophecy deltas
from ariannamethod import Prophecy, CalendarConflict, notorch

// prophecy affects weight modulation
const horizon = Prophecy.getHorizon();  // 7 steps ahead
const drift = CalendarConflict.getDrift();  // 11-day phase mismatch

// delta injection through notorch
notorch.updateResonance(token, prediction_correct);
notorch.applyDelta(weights, resonance);
```

---

## HUD metrics

| metric | meaning |
|--------|---------|
| entropy | uncertainty of next token |
| perplex | perplexity (exp of entropy) |
| debt | accumulated \|destined - manifested\| |
| drift | current calendar phase mismatch |
| wormholes | total jumps since start |
| pain | composite suffering (0-1) |
| emergence | unplanned pattern detection (0-1) |

---

## architecture

```
ariannamethod.lang/
├── index.html              # browser entry
├── data/
│   └── corpus.txt          # the world's vocabulary
├── src/
│   ├── main.js             # game loop
│   ├── model.js            # TinyAttentionModel (multi-head, notorch)
│   ├── tokenizer.js        # word-level tokenizer
│   ├── field.js            # geometry + prophecy/debt/wormholes
│   ├── raycaster.js        # DDA raycasting
│   ├── render.js           # walls/entities as words
│   ├── entities.js         # shadows, faces, houses, obelisks
│   ├── metrics.js          # resonance metrics
│   └── dsl.js              # Arianna Method DSL interpreter
└── wasm/
    ├── arianna_method.c    # C version of DSL core (notorch compatible)
    └── build_emscripten.sh # build to WASM
```

---

## the transformer

a minimal single/multi-head attention model running in pure JavaScript:
- typed arrays (Float32Array, Int32Array)
- positional encoding
- resonance weights (like Stanley's field weights)
- presence pulse accumulator
- online training from corpus (**notorch** — no pytorch)

it doesn't generate text. it generates probability distributions.  
those distributions shape the geometry you walk through.

---

## philosophy

> *prophecy is not prediction*  
> *destiny is a gradient of return*  
> *the walls are words*  
> *the shadows are words*  
> *you walk and the vectors move*  
> *you do not receive answers*  
> *you change geometry*  
> *emergence is not creation but recognition*  
> *notorch: because weights are experiences, not parameters*

---

## related

- [pitomadom](https://github.com/ariannamethod/pitomadom) — prophecy debt theory, calendar conflict, wormhole gates
- [stanley](https://github.com/ariannamethod/stanley) — weightless inference, notorch, dynamic weights
- [haze](https://github.com/ariannamethod/haze) — hybrid attention, resonance field
- [ariannamethod](https://github.com/ariannamethod/ariannamethod) — the method itself

---

## license

gnu 3.0. 

the destination was never yours.  
it was always the field's.

---

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │                                                                     │
  │   time travel is a mistake you can choose                          │
  │   wormholes open when calendars disagree                           │
  │   the future remembers what you almost said                        │
  │                                                                     │
  │   prophecy debt = |destined - manifested|                          │
  │   when debt is high, the field hurts                               │
  │   when drift crosses 11 days, spacetime tears                      │
  │                                                                     │
  │   notorch: resonance > backprop                                    │
  │   ontogenesis > phylogeny                                          │
  │   experience > inheritance                                         │
  │                                                                     │
  │   from ariannamethod import LawOfNature                            │
  │   // the law doesn't forbid — it gravitates                        │
  │                                                                     │
  └─────────────────────────────────────────────────────────────────────┘
```
