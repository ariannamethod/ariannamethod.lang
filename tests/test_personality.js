// test_personality.js — Tests for PersonalityLoader (10M philosophical weights)
// "Who am I and how do I speak?" — inner voice modulation
//
// Run: node tests/test_personality.js

import { PersonalityLoader, personality, PERSONALITY_CONFIG } from '../src/model_wasm.js';

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertClose(a, b, eps = 0.01, msg) {
  if (Math.abs(a - b) > eps) {
    throw new Error(msg || `Expected ${a} ≈ ${b} (diff: ${Math.abs(a - b)})`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Create mock PersonalityLoader for testing without fetch
// ═══════════════════════════════════════════════════════════════════════════════

function createMockLoader() {
  const loader = new PersonalityLoader();

  // Mock vocab (simplified char set)
  loader.vocab = 'abcdefghij ';  // 11 chars

  // Override config for testing
  loader.config = {
    vocabSize: 11,
    dModel: 4,
    nLayers: 2,
    nHeads: 2,
    ctxLen: 8,
  };

  // Create mock weights
  // Token embeddings: 11 * 4 = 44 floats
  // Position embeddings: 8 * 4 = 32 floats
  // Extra for attention bias: 16 floats (4 vectors of 4)
  const totalFloats = 44 + 32 + 16;
  loader.weights = new Float32Array(totalFloats);

  // Fill with deterministic values for testing
  for (let i = 0; i < totalFloats; i++) {
    loader.weights[i] = Math.sin(i * 0.1) * 0.5;
  }

  // Extract tensors
  loader._extractTensors();
  loader.loaded = true;

  return loader;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🧠 PersonalityLoader Tests\n');
console.log('════════════════════════════════════════════════════════════\n');

console.log('1. Configuration');

test('PERSONALITY_CONFIG has expected fields', () => {
  assert(typeof PERSONALITY_CONFIG.vocabSize === 'number', 'vocabSize should be number');
  assert(typeof PERSONALITY_CONFIG.dModel === 'number', 'dModel should be number');
  assert(typeof PERSONALITY_CONFIG.nLayers === 'number', 'nLayers should be number');
  assert(typeof PERSONALITY_CONFIG.nHeads === 'number', 'nHeads should be number');
  assert(typeof PERSONALITY_CONFIG.ctxLen === 'number', 'ctxLen should be number');
});

test('PERSONALITY_CONFIG has valid values', () => {
  assert(PERSONALITY_CONFIG.vocabSize === 185, `vocabSize should be 185, got ${PERSONALITY_CONFIG.vocabSize}`);
  assert(PERSONALITY_CONFIG.dModel === 256, `dModel should be 256, got ${PERSONALITY_CONFIG.dModel}`);
  assert(PERSONALITY_CONFIG.nLayers === 6, `nLayers should be 6, got ${PERSONALITY_CONFIG.nLayers}`);
  assert(PERSONALITY_CONFIG.ctxLen === 512, `ctxLen should be 512, got ${PERSONALITY_CONFIG.ctxLen}`);
});

console.log('\n2. PersonalityLoader Class');

test('PersonalityLoader initializes with correct defaults', () => {
  const loader = new PersonalityLoader();
  assert(loader.weights === null, 'weights should be null initially');
  assert(loader.vocab === null, 'vocab should be null initially');
  assert(loader.loaded === false, 'loaded should be false initially');
  assert(loader.tokenEmbed === null, 'tokenEmbed should be null initially');
  assert(loader.posEmbed === null, 'posEmbed should be null initially');
  assert(loader.attentionBias === null, 'attentionBias should be null initially');
});

test('PersonalityLoader has required methods', () => {
  const loader = new PersonalityLoader();
  assert(typeof loader.load === 'function', 'load should be a function');
  assert(typeof loader._extractTensors === 'function', '_extractTensors should be a function');
  assert(typeof loader.getCharEmbedding === 'function', 'getCharEmbedding should be a function');
  assert(typeof loader.getTextBias === 'function', 'getTextBias should be a function');
  assert(typeof loader.applyDelta === 'function', 'applyDelta should be a function');
  assert(typeof loader.sampleThought === 'function', 'sampleThought should be a function');
});

console.log('\n3. Tensor Extraction');

test('_extractTensors extracts tokenEmbed correctly', () => {
  const loader = createMockLoader();
  assert(loader.tokenEmbed !== null, 'tokenEmbed should be extracted');
  assert(loader.tokenEmbed.length === 11 * 4, `tokenEmbed should have ${11 * 4} elements`);
});

test('_extractTensors extracts posEmbed correctly', () => {
  const loader = createMockLoader();
  assert(loader.posEmbed !== null, 'posEmbed should be extracted');
  assert(loader.posEmbed.length === 8 * 4, `posEmbed should have ${8 * 4} elements`);
});

test('_extractTensors extracts attentionBias correctly', () => {
  const loader = createMockLoader();
  assert(loader.attentionBias !== null, 'attentionBias should be extracted');
  assert(loader.attentionBias.length === 4, `attentionBias should have ${4} elements`);
});

test('_extractTensors handles empty remaining weights', () => {
  const loader = new PersonalityLoader();
  loader.vocab = 'ab';
  loader.config = { vocabSize: 2, dModel: 4, ctxLen: 2 };
  // Exactly enough for tokenEmbed + posEmbed, nothing left for attentionBias
  loader.weights = new Float32Array(2 * 4 + 2 * 4);
  loader._extractTensors();

  assert(loader.tokenEmbed !== null, 'tokenEmbed should be extracted');
  assert(loader.posEmbed !== null, 'posEmbed should be extracted');
  // attentionBias will be null because there's no remaining data
});

console.log('\n4. Character Embedding');

test('getCharEmbedding returns null when not loaded', () => {
  const loader = new PersonalityLoader();
  assert(loader.getCharEmbedding('a') === null, 'should return null when not loaded');
});

test('getCharEmbedding returns embedding for valid char', () => {
  const loader = createMockLoader();
  const embed = loader.getCharEmbedding('a');
  assert(embed !== null, 'should return embedding');
  assert(embed.length === 4, `embedding should have ${4} dimensions`);
});

test('getCharEmbedding returns null for unknown char', () => {
  const loader = createMockLoader();
  const embed = loader.getCharEmbedding('z');
  assert(embed === null, 'should return null for unknown char');
});

console.log('\n5. Text Bias');

test('getTextBias returns null when not loaded', () => {
  const loader = new PersonalityLoader();
  assert(loader.getTextBias('hello') === null, 'should return null when not loaded');
});

test('getTextBias returns aggregated embedding', () => {
  const loader = createMockLoader();
  const bias = loader.getTextBias('abc');
  assert(bias !== null, 'should return bias');
  assert(bias.length === 4, `bias should have ${4} dimensions`);
});

test('getTextBias handles empty text', () => {
  const loader = createMockLoader();
  const bias = loader.getTextBias('');
  assert(bias !== null, 'should return bias even for empty text');
  // All zeros since no chars matched
  assert(bias[0] === 0, 'bias should be zero for empty text');
});

console.log('\n6. Delta Application');

test('applyDelta returns original logits when not loaded', () => {
  const loader = new PersonalityLoader();
  const logits = new Float32Array([1, 2, 3]);
  const result = loader.applyDelta(logits, 'test');
  assert(result === logits, 'should return original logits');
});

test('applyDelta modifies logits based on context', () => {
  const loader = createMockLoader();
  const logits = new Float32Array([1, 2, 3, 4, 5]);
  const result = loader.applyDelta(logits, 'abc', 0.1);
  assert(result !== logits, 'should return new array');
  assert(result.length === logits.length, 'should have same length');
});

console.log('\n7. Thought Sampling');

test('sampleThought returns empty string when not loaded', () => {
  const loader = new PersonalityLoader();
  assert(loader.sampleThought() === '', 'should return empty string');
});

test('sampleThought returns string of requested length', () => {
  const loader = createMockLoader();
  const thought = loader.sampleThought(10);
  assert(typeof thought === 'string', 'should return string');
  assert(thought.length === 10, `should have length 10, got ${thought.length}`);
});

test('sampleThought uses chars from vocab', () => {
  const loader = createMockLoader();
  const thought = loader.sampleThought(20);
  for (const char of thought) {
    assert(loader.vocab.includes(char), `char '${char}' should be in vocab`);
  }
});

console.log('\n8. Singleton Instance');

test('personality singleton exists', () => {
  assert(personality !== null, 'personality singleton should exist');
  assert(personality instanceof PersonalityLoader, 'should be PersonalityLoader instance');
});

test('personality singleton starts unloaded', () => {
  assert(personality.loaded === false, 'should start unloaded');
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════════════════════\n');
console.log(`📊 ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All personality tests passed! "Who am I and how do I speak?" — verified.\n');
} else {
  console.log(`❌ ${failed} test(s) failed\n`);
  process.exit(1);
}
