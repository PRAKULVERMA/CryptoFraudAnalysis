import { normalizeWalletAddress, buildGraphFromTrace } from '../services/tracing/graphBuilder.js';

function assertEqual(actual, expected, label) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${label}: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) {
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
  }
  return pass;
}

async function runTests() {
  console.log('=== Tracing & Normalization Verification ===\n');
  let allPassed = true;

  // Test 1 — normalizeWalletAddress
  console.log('Test 1: normalizeWalletAddress');
  allPassed = assertEqual(normalizeWalletAddress('0xAbC123'), '0xabc123', 'lowercase') && allPassed;
  allPassed = assertEqual(normalizeWalletAddress('  bc1qxyz  '), 'bc1qxyz', 'trim') && allPassed;
  allPassed = assertEqual(normalizeWalletAddress(''), '', 'empty') && allPassed;

  // Test 2 — buildGraphFromTrace direction and value accounting
  console.log('\nTest 2: buildGraphFromTrace direction and value accounting');
  const transactions = [
    { from: '0xroot', to: '0xhop1', value: 1.5, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xaaa' },
    { from: '0xhop1', to: '0xhop2', value: 0.8, timestamp: '2026-01-01T01:00:00Z', direction: 'outgoing', hash: '0xbbb' },
    { from: '0xexternal', to: '0xroot', value: 2.0, timestamp: '2026-01-01T02:00:00Z', direction: 'incoming', hash: '0xccc' },
    { from: '0xroot', to: '0xroot', value: 0.1, timestamp: '2026-01-01T03:00:00Z', direction: 'self-transfer', hash: '0xddd' },
  ];

  const graph = buildGraphFromTrace({
    rootAddress: '0xroot',
    transactions,
    network: 'ethereum',
    synthetic: false,
    mode: 'LIVE',
  });

  allPassed = assertEqual(graph.nodes.length, 4, 'node count includes all unique addresses') && allPassed;
  allPassed = assertEqual(graph.edges.length, 4, 'edge count preserves all transactions') && allPassed;
  allPassed = assertEqual(graph.trace_summary.funds_traced, '2.3000 ETH', 'funds_traced sums outgoing from traced path') && allPassed;
  allPassed = assertEqual(graph.trace_summary.total_outgoing_value, 2.4, 'total_outgoing_value includes self-transfer') && allPassed;
  allPassed = assertEqual(graph.trace_summary.total_incoming_value, 2.1, 'total_incoming_value includes self-transfer') && allPassed;
  allPassed = assertEqual(graph.trace_summary.traced_outgoing_value, 2.3, 'traced_outgoing_value excludes self-transfer') && allPassed;

  const outgoingEdge = graph.edges.find((e) => e.hash === '0xaaa');
  allPassed = assertEqual(outgoingEdge?.direction, 'outgoing', 'outgoing direction preserved') && allPassed;
  allPassed = assertEqual(outgoingEdge?.value, 1.5, 'outgoing value preserved') && allPassed;

  const incomingEdge = graph.edges.find((e) => e.hash === '0xccc');
  allPassed = assertEqual(incomingEdge?.direction, 'incoming', 'incoming direction preserved') && allPassed;

  const selfEdge = graph.edges.find((e) => e.hash === '0xddd');
  allPassed = assertEqual(selfEdge?.direction, 'self-transfer', 'self-transfer direction preserved') && allPassed;

  // Test 3 — empty transactions
  console.log('\nTest 3: empty transactions');
  const emptyGraph = buildGraphFromTrace({ rootAddress: '0xroot', transactions: [], network: 'bitcoin' });
  allPassed = assertEqual(emptyGraph.nodes.length, 1, 'empty graph has root node') && allPassed;
  allPassed = assertEqual(emptyGraph.edges.length, 0, 'empty graph has no edges') && allPassed;
  allPassed = assertEqual(emptyGraph.trace_summary.funds_traced, '0 BTC', 'empty graph funds_traced') && allPassed;

  // Test 4 — Bitcoin precision
  console.log('\nTest 4: Bitcoin precision for small values');
  const btcTxns = [
    { from: 'bc1root', to: 'bc1hop', value: 0.0001, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xbtc1' },
  ];
  const btcGraph = buildGraphFromTrace({ rootAddress: 'bc1root', transactions: btcTxns, network: 'bitcoin' });
  allPassed = assertEqual(btcGraph.trace_summary.funds_traced, '0.000100 BTC', 'small btc value precision') && allPassed;

  console.log('\n=== Verification Complete ===');
  console.log(allPassed ? 'All checks passed.' : 'Some checks failed.');
  process.exit(allPassed ? 0 : 1);
}

runTests();
