/**
 * Comprehensive Automated Test Suite for LinkedIn Zip Solver Engine
 * Tests Hamiltonian path correctness, degree pruning, walls & waypoint constraints.
 */

const assert = require('assert');
const { solveZip, compressSequence, ZipGrid } = require('../solver.js');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING LINKEDIN ZIP SOLVER AUTOMATED TEST SUITE');
console.log('======================================================\n');

// 1. Basic 4x4 Grid with Wall
runTest('4x4 Grid with internal barrier wall correctly routes around obstacle', () => {
  const m = 4, n = 4;
  const numbered = [0, 5, 14];
  const rightWalls = [0]; // wall between (0,0) and (0,1)
  const downWalls = [];

  const result = solveZip(m, n, numbered, downWalls, rightWalls);
  assert.strictEqual(result.fullSequence.length, 16, 'Should visit all 16 cells');
  assert.strictEqual(result.fullSequence[0], 0, 'Must start at cell 0 (waypoint 1)');
  assert.strictEqual(result.fullSequence[result.fullSequence.length - 1], 14, 'Must end at cell 14 (waypoint 3)');
  assert.ok(result.fullSequence.includes(5), 'Must visit cell 5 (waypoint 2)');

  // Verify wall between 0 and 1 was respected
  const idx0 = result.fullSequence.indexOf(0);
  const nextAfter0 = result.fullSequence[idx0 + 1];
  assert.notStrictEqual(nextAfter0, 1, 'Path must not cross right wall from cell 0 to cell 1');
});

// 2. 5x5 Grid Complete Hamiltonian Path
runTest('5x5 Grid visits all 25 cells in continuous orthogonal path', () => {
  const m = 5, n = 5;
  const numbered = [0, 12, 24];
  const result = solveZip(m, n, numbered, [1], [6]);

  assert.strictEqual(result.fullSequence.length, 25, 'Should visit exactly 25 cells');
  // Check no duplicates
  const uniqueCells = new Set(result.fullSequence);
  assert.strictEqual(uniqueCells.size, 25, 'All cells in path must be unique');

  // Verify adjacent orthogonal steps
  for (let i = 0; i < result.fullSequence.length - 1; i++) {
    const a = result.fullSequence[i];
    const b = result.fullSequence[i + 1];
    const r1 = Math.floor(a / n), c1 = a % n;
    const r2 = Math.floor(b / n), c2 = b % n;
    const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
    assert.strictEqual(dist, 1, `Step ${i} -> ${i+1} (${a} to ${b}) must be strictly orthogonal`);
  }
});

// 3. 6x6 Grid (LinkedIn Daily Size)
runTest('6x6 Grid (LinkedIn daily standard) solves with multiple waypoints & walls', () => {
  const m = 6, n = 6;
  const numbered = [0, 11, 23, 30];
  const downWalls = [24];
  const rightWalls = [0];

  const t0 = performance.now();
  const result = solveZip(m, n, numbered, downWalls, rightWalls);
  const elapsed = performance.now() - t0;

  assert.strictEqual(result.fullSequence.length, 36, 'Should visit all 36 cells');
  assert.ok(elapsed < 20, `Solving time should be sub-20ms (took ${elapsed.toFixed(2)}ms)`);

  // Verify waypoint sequence order
  const pos1 = result.fullSequence.indexOf(0);
  const pos2 = result.fullSequence.indexOf(11);
  const pos3 = result.fullSequence.indexOf(23);
  const pos4 = result.fullSequence.indexOf(30);

  assert.ok(pos1 < pos2 && pos2 < pos3 && pos3 < pos4, 'Waypoints must be visited in strict ascending order');
});

// 4. 7x7 Grid (Master Challenge)
runTest('7x7 Grid solves efficiently with degree-pruning heuristics', () => {
  const m = 7, n = 7;
  const numbered = [0, 13, 27, 48];
  const downWalls = [8, 22];
  const rightWalls = [2, 15];

  const result = solveZip(m, n, numbered, downWalls, rightWalls);
  assert.strictEqual(result.fullSequence.length, 49, 'Should visit all 49 cells');
});

// 5. Sequence Compression Logic
runTest('compressSequence compresses straight-line runs into turn vertices', () => {
  // Straight run: 0 -> 1 -> 2 -> 3 (all right), then 7 -> 11 (down)
  const fullSeq = [0, 1, 2, 3, 7, 11];
  const compressed = compressSequence(fullSeq);

  assert.deepStrictEqual(compressed, [0, 3, 11], 'Compressed turns should only contain run endpoints');
});

// 6. Graceful Handling of Impossible Parity Configurations
runTest('Gracefully throws descriptive error on impossible puzzle', () => {
  const m = 4, n = 4;
  // Parity violation on bipartite grid graph: start even, end even cannot cover 16 cells
  const impossibleNumbered = [0, 5, 15];
  
  assert.throws(() => {
    solveZip(m, n, impossibleNumbered, [], []);
  }, /No valid Hamiltonian path solution found/, 'Should throw descriptive error when no path exists');
});

// 7. Input Validation Checks
runTest('Throws on invalid parameters', () => {
  assert.throws(() => solveZip(0, 4, [0]), /Invalid grid dimensions/);
  assert.throws(() => solveZip(4, 4, []), /No numbered waypoint cells/);
});

console.log('\n------------------------------------------------------');
console.log(`📊 RESULTS: ${passedTests}/${totalTests} Tests Passed`);
console.log('------------------------------------------------------\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('🎉 ALL SUITE TESTS PASSED WITH 100% SUCCESS!\n');
}
