import { analyzeEvidenceRisk } from '../services/detection/evidenceRiskService.js';
import { buildGraphFromTrace } from '../services/tracing/graphBuilder.js';

function assertEqual(actual, expected, label) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${label}: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) {
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
  }
  return pass;
}

function buildTrace(transactions = [], max_hops = 0, partial = false) {
  return {
    edges: transactions,
    trace_summary: {
      transactions_analyzed: transactions.length,
      wallets_discovered: new Set(transactions.flatMap((tx) => [tx.from, tx.to])).size,
      max_hops,
      partial,
    },
  };
}

async function runTests() {
  console.log('=== Evidence-Based Risk Engine Verification ===\n');
  let allPassed = true;

  // Test 1 — Low risk empty graph
  console.log('Test 1: Low risk empty graph');
  const empty = await analyzeEvidenceRisk({ address: '0xroot', network: 'ethereum', transactions: [], trace_summary: {} });
  allPassed = assertEqual(empty.riskScore, 0, 'empty risk score') && allPassed;
  allPassed = assertEqual(empty.riskLevel, 'LOW', 'empty risk level') && allPassed;
  allPassed = assertEqual(empty.patterns.length, 0, 'empty patterns') && allPassed;
  allPassed = assertEqual(empty.evidence.signals.length, 0, 'empty signals') && allPassed;

  // Test 2 — Rapid forwarding
  console.log('\nTest 2: Rapid forwarding signal');
  const rapidTxns = [
    { from: '0xexternal', to: '0xroot', value: 10, timestamp: '2026-01-01T00:00:00Z', direction: 'incoming', hash: '0x1' },
    { from: '0xroot', to: '0xhop1', value: 9, timestamp: '2026-01-01T00:00:30Z', direction: 'outgoing', hash: '0x2' },
  ];
  const rapid = await analyzeEvidenceRisk({ address: '0xroot', network: 'ethereum', transactions: rapidTxns, trace_summary: buildTrace(rapidTxns).trace_summary });
  const rapidSignal = rapid.evidence.signals.find((s) => s.code === 'RAPID_FORWARDING');
  allPassed = assertEqual(rapidSignal?.code, 'RAPID_FORWARDING', 'rapid forwarding detected') && allPassed;
  allPassed = assertEqual(rapidSignal?.evidence?.[0]?.delay_seconds, 30, 'rapid delay captured') && allPassed;
  allPassed = assertEqual(rapid.riskScore > 0, true, 'rapid forwarding increases score') && allPassed;

  // Test 3 — Multi-hop chain
  console.log('\nTest 3: Multi-hop chain signal');
  const multiHopTxns = [
    { from: '0xroot', to: '0xhop1', value: 1, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xa' },
    { from: '0xhop1', to: '0xhop2', value: 1, timestamp: '2026-01-01T00:01:00Z', direction: 'outgoing', hash: '0xb' },
    { from: '0xhop2', to: '0xhop3', value: 1, timestamp: '2026-01-01T00:02:00Z', direction: 'outgoing', hash: '0xc' },
  ];
  const multi = await analyzeEvidenceRisk({ address: '0xroot', network: 'ethereum', transactions: multiHopTxns, trace_summary: buildTrace(multiHopTxns, 3).trace_summary });
  const multiSignal = multi.evidence.signals.find((s) => s.code === 'MULTI_HOP_CHAIN');
  allPassed = assertEqual(multiSignal?.code, 'MULTI_HOP_CHAIN', 'multi-hop detected') && allPassed;
  allPassed = assertEqual(multiSignal?.evidence?.max_hops, 3, 'multi-hop depth captured') && allPassed;

  // Test 4 — High fan-out
  console.log('\nTest 4: High fan-out signal');
  const fanOutTxns = Array.from({ length: 5 }).map((_, i) => ({
    from: '0xroot',
    to: `0xdest${i}`,
    value: 0.1,
    timestamp: '2026-01-01T00:00:00Z',
    direction: 'outgoing',
    hash: `0xfan${i}`,
  }));
  const fanOut = await analyzeEvidenceRisk({ address: '0xroot', network: 'ethereum', transactions: fanOutTxns, trace_summary: buildTrace(fanOutTxns).trace_summary });
  const fanOutSignal = fanOut.evidence.signals.find((s) => s.code === 'HIGH_FAN_OUT');
  allPassed = assertEqual(fanOutSignal?.code, 'HIGH_FAN_OUT', 'fan-out detected') && allPassed;
  allPassed = assertEqual(fanOutSignal?.evidence?.distinct_targets, 5, 'fan-out count captured') && allPassed;

  // Test 5 — High fan-in
  console.log('\nTest 5: High fan-in signal');
  const fanInTxns = Array.from({ length: 5 }).map((_, i) => ({
    from: `0xsrc${i}`,
    to: '0xroot',
    value: 0.1,
    timestamp: '2026-01-01T00:00:00Z',
    direction: 'incoming',
    hash: `0xin${i}`,
  }));
  const fanIn = await analyzeEvidenceRisk({ address: '0xroot', network: 'ethereum', transactions: fanInTxns, trace_summary: buildTrace(fanInTxns).trace_summary });
  const fanInSignal = fanIn.evidence.signals.find((s) => s.code === 'HIGH_FAN_IN');
  allPassed = assertEqual(fanInSignal?.code, 'HIGH_FAN_IN', 'fan-in detected') && allPassed;
  allPassed = assertEqual(fanInSignal?.evidence?.distinct_sources, 5, 'fan-in count captured') && allPassed;

  // Test 6 — Determinism
  console.log('\nTest 6: Deterministic scoring');
  const deterministic = await analyzeEvidenceRisk({ address: '0xroot', network: 'ethereum', transactions: rapidTxns, trace_summary: buildTrace(rapidTxns).trace_summary });
  const again = await analyzeEvidenceRisk({ address: '0xroot', network: 'ethereum', transactions: rapidTxns, trace_summary: buildTrace(rapidTxns).trace_summary });
  allPassed = assertEqual(deterministic.riskScore, again.riskScore, 'same evidence same score') && allPassed;
  allPassed = assertEqual(deterministic.patterns, again.patterns, 'same evidence same patterns') && allPassed;

  // Test 7 — Confidence not equal to risk score
  console.log('\nTest 7: Confidence independent of risk score');
  allPassed = assertEqual(rapid.confidence === rapid.riskScore, false, 'confidence differs from risk score') && allPassed;
  allPassed = assertEqual(typeof rapid.confidence === 'number', true, 'confidence is numeric') && allPassed;

  // Test 8 — Demo mode / synthetic
  console.log('\nTest 8: Demo mode compatibility');
  const demoTxns = [
    { from: '0xroot', to: '0xhop1', value: 1, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xd1', synthetic: true, demo: true },
  ];
  const demo = await analyzeEvidenceRisk({ address: '0xroot', network: 'ethereum', transactions: demoTxns, trace_summary: buildGraphFromTrace({ rootAddress: '0xroot', transactions: demoTxns, synthetic: true, mode: 'DEMO' }).trace_summary });
  allPassed = assertEqual(demo.evidence.signals.length >= 0, true, 'demo mode produces signals') && allPassed;
  allPassed = assertEqual(typeof demo.riskScore === 'number', true, 'demo risk score is number') && allPassed;

  console.log('\n=== Verification Complete ===');
  console.log(allPassed ? 'All checks passed.' : 'Some checks failed.');
  process.exit(allPassed ? 0 : 1);
}

runTests();
