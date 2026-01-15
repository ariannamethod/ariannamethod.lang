// test_world.js — World Model tests
// "the field knows its internal geography"

import { WorldState, WorldNode, WorldEdge, WorldTrace } from '../src/world.js';

let passed = 0, failed = 0;

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log('\n🗺️  World Model Tests\n');
console.log('='.repeat(50) + '\n');

// ─────────────────────────────────────────────────────────────────────────────
console.log('1. WorldNode\n');
// ─────────────────────────────────────────────────────────────────────────────

test('WorldNode has id and name', () => {
  const node = new WorldNode(1, 'test');
  assert(node.id === 1, 'id');
  assert(node.name === 'test', 'name');
});

test('WorldNode has metrics', () => {
  const node = new WorldNode(1, 'test');
  assert(typeof node.entropy === 'number', 'entropy');
  assert(typeof node.coherence === 'number', 'coherence');
  assert(typeof node.tension === 'number', 'tension');
  assert(typeof node.drift === 'number', 'drift');
  assert(typeof node.novelty === 'number', 'novelty');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. WorldEdge\n');
// ─────────────────────────────────────────────────────────────────────────────

test('WorldEdge has src/dst/action', () => {
  const edge = new WorldEdge(1, 0, 1, 'WALK');
  assert(edge.srcNodeId === 0, 'src');
  assert(edge.dstNodeId === 1, 'dst');
  assert(edge.action === 'WALK', 'action');
});

test('WorldEdge has weight and lawTag', () => {
  const edge = new WorldEdge(1, 0, 1, 'WALK');
  assert(edge.weight === 1.0, 'default weight');
  assert(edge.lawTag === null, 'default lawTag');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. WorldTrace\n');
// ─────────────────────────────────────────────────────────────────────────────

test('WorldTrace records transition', () => {
  const trace = new WorldTrace('run1', 0, 1, 'JUMP');
  assert(trace.prevNodeId === 0, 'prev');
  assert(trace.nextNodeId === 1, 'next');
  assert(trace.action === 'JUMP', 'action');
  assert(trace.runId === 'run1', 'runId');
});

test('WorldTrace has deltas', () => {
  const trace = new WorldTrace('run1', 0, 1, 'JUMP');
  assert(typeof trace.d_entropy === 'number', 'd_entropy');
  assert(typeof trace.d_coherence === 'number', 'd_coherence');
  assert(typeof trace.d_drift === 'number', 'd_drift');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4. WorldState — initialization\n');
// ─────────────────────────────────────────────────────────────────────────────

test('WorldState creates origin node', () => {
  const world = new WorldState();
  assert(world.nodes.size === 1, 'has one node');
  assert(world.activeNodeId === 0, 'active is origin');
  assert(world.getActiveNode().name === 'origin', 'origin name');
});

test('WorldState origin has default metrics', () => {
  const world = new WorldState();
  const origin = world.getActiveNode();
  assert(origin.coherence === 0.5, 'coherence');
  assert(origin.entropy === 0.3, 'entropy');
  assert(origin.tension === 0.2, 'tension');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5. WorldState — node operations\n');
// ─────────────────────────────────────────────────────────────────────────────

test('addNode creates new node', () => {
  const world = new WorldState();
  const n1 = world.addNode('state_walk');
  assert(world.nodes.has(n1.id), 'node added');
  assert(n1.name === 'state_walk', 'name correct');
});

test('getNode retrieves by id', () => {
  const world = new WorldState();
  const n1 = world.addNode('test');
  const retrieved = world.getNode(n1.id);
  assert(retrieved === n1, 'same node');
});

test('setActiveNode changes active', () => {
  const world = new WorldState();
  const n1 = world.addNode('new_state');
  world.setActiveNode(n1.id);
  assert(world.activeNodeId === n1.id, 'active changed');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n6. WorldState — edge operations\n');
// ─────────────────────────────────────────────────────────────────────────────

test('addEdge creates transition', () => {
  const world = new WorldState();
  const n1 = world.addNode('dst');
  const edge = world.addEdge(0, n1.id, 'WALK');
  assert(world.edges.has(edge.id), 'edge added');
  assert(edge.action === 'WALK', 'action');
});

test('findEdges by src and action', () => {
  const world = new WorldState();
  const n1 = world.addNode('dst1');
  const n2 = world.addNode('dst2');
  world.addEdge(0, n1.id, 'WALK');
  world.addEdge(0, n2.id, 'RUN');
  world.addEdge(0, n1.id, 'WALK');

  const walkEdges = world.findEdges(0, 'WALK');
  assert(walkEdges.length === 2, 'found 2 WALK edges');

  const allEdges = world.findEdges(0);
  assert(allEdges.length === 3, 'found 3 total edges');
});

test('findEdges sorted by weight', () => {
  const world = new WorldState();
  const n1 = world.addNode('dst1');
  const n2 = world.addNode('dst2');
  const e1 = world.addEdge(0, n1.id, 'ACT');
  const e2 = world.addEdge(0, n2.id, 'ACT');
  e1.weight = 0.5;
  e2.weight = 0.9;

  const edges = world.findEdges(0, 'ACT');
  assert(edges[0].weight === 0.9, 'highest weight first');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n7. WorldState — trace operations\n');
// ─────────────────────────────────────────────────────────────────────────────

test('recordTrace stores transition', () => {
  const world = new WorldState();
  const n1 = world.addNode('dst');
  const trace = world.recordTrace(0, n1.id, 'JUMP', { d_entropy: 0.1 });
  assert(world.traces.length === 1, 'trace stored');
  assert(trace.d_entropy === 0.1, 'delta stored');
});

test('getRecentTraces returns last N', () => {
  const world = new WorldState();
  for (let i = 0; i < 20; i++) {
    world.recordTrace(0, 0, `ACT_${i}`);
  }
  const recent = world.getRecentTraces(5);
  assert(recent.length === 5, 'got 5');
  assert(recent[4].action === 'ACT_19', 'last is newest');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n8. WorldState — queries\n');
// ─────────────────────────────────────────────────────────────────────────────

test('getMostCommonActions counts correctly', () => {
  const world = new WorldState();
  world.recordTrace(0, 0, 'WALK');
  world.recordTrace(0, 0, 'WALK');
  world.recordTrace(0, 0, 'WALK');
  world.recordTrace(0, 0, 'RUN');

  const common = world.getMostCommonActions();
  assert(common[0].action === 'WALK', 'WALK most common');
  assert(common[0].count === 3, '3 WALKs');
});

test('getTotalDriftGrowth sums deltas', () => {
  const world = new WorldState();
  world.recordTrace(0, 0, 'A', { d_drift: 0.1 });
  world.recordTrace(0, 0, 'B', { d_drift: 0.2 });
  world.recordTrace(0, 0, 'C', { d_drift: -0.05 });

  const total = world.getTotalDriftGrowth();
  assert(Math.abs(total - 0.25) < 0.001, `drift sum = ${total}`);
});

test('getSnapshot returns summary', () => {
  const world = new WorldState();
  const snap = world.getSnapshot();
  assert(snap.activeNodeId === 0, 'active');
  assert(snap.nodeCount === 1, 'nodes');
  assert(snap.metrics !== null, 'has metrics');
});

// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(50));
console.log(`\n📊 ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
