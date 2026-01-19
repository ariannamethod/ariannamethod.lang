# Binary Weight Files and Experience Shards

## Personality Weights (from arianna.c)

### personality_brain.bin (~42MB, ~10M parameters)

GPT-style personality weights trained on philosophical/introspective text.
- **Architecture**: GPT-2 compatible, float32
- **Purpose**: "Who am I and how do I speak?" — inner voice modulation
- **Training**: Same dataset as arianna.c but monologue-style (not QA)
- **Integration**: Influences body.c via attention deltas through bridge.js

### vocab_personality.bin (185 bytes)

Character-level vocabulary (not BPE):
```
 "'(),-.0123456789:;?ABCDEFGHIJKLMNOPQRSTUVWXYabcdefghijklmnopqrstuvwxyzö–—''""…⸻
```

## Architecture Notes

arianna.c (the second brain) has a layered structure:
- **200K params**: Preprocessing instinct (fast pattern matching)
- **10M params**: Personality weights (this file) — "who I am"
- **30M params**: GPT-2 base — Arianna influences via delta injections

The personality weights modulate WHERE attention goes, not WHAT the model knows.
Stanley-style deltas: `Δattention = personality_output × scale`

## Experience Shards

The `shards/` directory stores binary experience files:
- Format: `{timestamp}_{context_hash}.shard`
- Contains: accumulated resonance patterns, attention histories
- Used by: MicroTrainer for online learning

## Usage

```javascript
// In bridge.js or model_wasm.js
const weights = await fetch('./weights/personality_brain.bin');
const buffer = await weights.arrayBuffer();
const f32 = new Float32Array(buffer);
// Apply to model via delta injection
```
