import { Field } from '../src/field.js';
import { Orbits } from '../src/orbits.js';

// Mock Tokenizer
const tokenizer = {
  vocabSize: () => 1024,
  encode: (t) => [1, 2, 3],
  word: (id) => "word"
};

// Mock Model
const model = {
  ctx: 16,
  forward: () => ({
    probs: new Float32Array(1024).fill(1/1024),
    entropy: 1.5,
    perplexity: 2.0,
    resonanceField: 0.5
  }),
  attendSpread: 0.2
};

// Mock Metrics
const metrics = {
  entropy: 0,
  perplexity: 0,
  resonanceField: 0,
  calendarDrift: 0,
  planetaryDissonance: 0,
  pain: 0,
  emergence: 0
};

const orbits = new Orbits();
const field = new Field({ w: 48, h: 48, tokenizer, model, metrics });

console.log("--- STARTING SOMATIC & ORBITS TEST ---");

// Test 1: Planetary Dissonance
const pd = orbits.getDissonance();
metrics.planetaryDissonance = pd;
console.log(`Planetary Dissonance: ${pd.toFixed(4)}`);

// Test 2: Somatic Coupling (Kuramoto)
const initialChambers = [...field.chambers];
field.updateSomatic(0.1);
console.log("Chambers updated. Initial [LOVE]:", initialChambers[1].toFixed(4), "New [LOVE]:", field.chambers[1].toFixed(4));

// Test 3: Chirality Influence
console.log("Applying left turn (Chiral Memory)...");
field.applyChirality('left', 1.0);
console.log("New [FLOW]:", field.chambers[4].toFixed(4), "(should be higher)");

// Test 4: Full Step
console.log("Running field.step()...");
field.step(10, 10, 0.5, 0.1);
console.log("Metrics after step - Pain:", metrics.pain.toFixed(4), "Emergence:", metrics.emergence.toFixed(4));

if (metrics.pain !== 0 || metrics.emergence !== 0) {
  console.log("SUCCESS: Somatic chambers are driving metrics.");
} else {
  console.log("FAILURE: Metrics are still zero.");
}
