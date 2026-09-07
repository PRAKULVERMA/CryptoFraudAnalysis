import { buildInvestigationIntelligence } from '../services/intelligence/intelligenceService.js';

function assertEqual(actual, expected, label) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${label}: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) {
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
  }
  return pass;
}

function assertDefined(actual, label) {
  const pass = actual !== undefined && actual !== null;
  console.log(`  ${label}: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) {
    console.error(`    Actual: ${JSON.stringify(actual)}`);
  }
  return pass;
}

function buildTrace({ nodes = [], edges = [], trace_summary = {} } = {}) {
  return {
    network: 'ethereum',
    rootAddress: '0xroot',
    nodes: nodes.map((n) => ({ address: n, network: 'ethereum', hop: 0 })),
    edges: edges.map((e) => ({
      source: e.from,
      target: e.to,
      from: e.from,
      to: e.to,
      hash: e.hash,
      transactionId: e.hash,
      value: e.value,
      timestamp: e.timestamp,
      direction: e.direction,
      hop: e.hop || 1,
      network: 'ethereum',
    })),
    trace_summary: {
      transactions_analyzed: edges.length,
      wallets_discovered: new Set(edges.flatMap((e) => [e.from, e.to])).size + 1,
      max_hops: trace_summary.max_hops || 0,
      max_hops_reached: trace_summary.max_hops_reached || 0,
      partial: trace_summary.partial || false,
      limits_reached: trace_summary.limits_reached || [],
      funds_traced: trace_summary.funds_traced || '0 ETH',
      synthetic: false,
      mode: 'LIVE',
    },
  };
}

function buildSimpleTrace() {
  return buildTrace({
    nodes: ['0xroot', '0xdest'],
    edges: [
      { from: '0xroot', to: '0xdest', value: 1.5, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xsimple1', hop: 1 },
    ],
    trace_summary: { max_hops: 1, max_hops_reached: 1 },
  });
}

function buildMultiHopTrace() {
  return buildTrace({
    nodes: ['0xroot', '0xhop1', '0xhop2', '0xdest'],
    edges: [
      { from: '0xroot', to: '0xhop1', value: 1.0, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xmulti1', hop: 1 },
      { from: '0xhop1', to: '0xhop2', value: 0.9, timestamp: '2026-01-01T00:01:00Z', direction: 'outgoing', hash: '0xmulti2', hop: 2 },
      { from: '0xhop2', to: '0xdest', value: 0.8, timestamp: '2026-01-01T00:02:00Z', direction: 'outgoing', hash: '0xmulti3', hop: 3 },
    ],
    trace_summary: { max_hops: 3, max_hops_reached: 3 },
  });
}

function buildFanOutTrace() {
  const edges = Array.from({ length: 5 }).map((_, i) => ({
    from: '0xroot',
    to: `0xdest${i}`,
    value: 0.1,
    timestamp: '2026-01-01T00:00:00Z',
    direction: 'outgoing',
    hash: `0xfanout${i}`,
    hop: 1,
  }));
  return buildTrace({
    nodes: ['0xroot', ...Array.from({ length: 5 }).map((_, i) => `0xdest${i}`)],
    edges,
    trace_summary: { max_hops: 1, max_hops_reached: 1 },
  });
}

function buildFanInTrace() {
  const edges = Array.from({ length: 5 }).map((_, i) => ({
    from: `0xsrc${i}`,
    to: '0xroot',
    value: 0.1,
    timestamp: '2026-01-01T00:00:00Z',
    direction: 'incoming',
    hash: `0xfanin${i}`,
    hop: 1,
  }));
  return buildTrace({
    nodes: [...Array.from({ length: 5 }).map((_, i) => `0xsrc${i}`), '0xroot'],
    edges,
    trace_summary: { max_hops: 1, max_hops_reached: 1 },
  });
}

function buildConvergenceTrace() {
  return buildTrace({
    nodes: ['0xroot', '0xhop1', '0xhop2', '0xdest'],
    edges: [
      { from: '0xroot', to: '0xhop1', value: 1.0, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xconv1', hop: 1 },
      { from: '0xhop1', to: '0xdest', value: 0.8, timestamp: '2026-01-01T00:01:00Z', direction: 'outgoing', hash: '0xconv2', hop: 2 },
      { from: '0xhop2', to: '0xdest', value: 0.7, timestamp: '2026-01-01T00:01:30Z', direction: 'outgoing', hash: '0xconv3', hop: 2 },
    ],
    trace_summary: { max_hops: 2, max_hops_reached: 2 },
  });
}

function buildRepeatedDestinationTrace() {
  const edges = Array.from({ length: 3 }).map((_, i) => ({
    from: '0xroot',
    to: '0xdest',
    value: 0.1,
    timestamp: '2026-01-01T00:00:00Z',
    direction: 'outgoing',
    hash: `0xrepeat${i}`,
    hop: 1,
  }));
  return buildTrace({
    nodes: ['0xroot', '0xdest'],
    edges,
    trace_summary: { max_hops: 1, max_hops_reached: 1 },
  });
}

function buildRapidForwardingTrace() {
  return buildTrace({
    nodes: ['0xexternal', '0xroot', '0xhop1'],
    edges: [
      { from: '0xexternal', to: '0xroot', value: 10, timestamp: '2026-01-01T00:00:00Z', direction: 'incoming', hash: '0xrapid1', hop: 1 },
      { from: '0xroot', to: '0xhop1', value: 9, timestamp: '2026-01-01T00:00:30Z', direction: 'outgoing', hash: '0xrapid2', hop: 1 },
    ],
    trace_summary: { max_hops: 1, max_hops_reached: 1 },
  });
}

function buildMissingTimestampTrace() {
  return buildTrace({
    nodes: ['0xroot', '0xdest'],
    edges: [
      { from: '0xroot', to: '0xdest', value: 1.5, timestamp: null, direction: 'outgoing', hash: '0xnots1', hop: 1 },
    ],
    trace_summary: { max_hops: 1, max_hops_reached: 1 },
  });
}

function buildMissingValueTrace() {
  return buildTrace({
    nodes: ['0xroot', '0xdest'],
    edges: [
      { from: '0xroot', to: '0xdest', value: null, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xnoval1', hop: 1 },
    ],
    trace_summary: { max_hops: 1, max_hops_reached: 1 },
  });
}

function buildEmptyTrace() {
  return buildTrace({
    nodes: [],
    edges: [],
    trace_summary: { max_hops: 0, max_hops_reached: 0 },
  });
}

async function runTests() {
  console.log('=== Advanced Investigation Intelligence Verification ===\n');
  let allPassed = true;

  // Test 1 — Simple root → destination
  console.log('Test 1: Simple root -> destination');
  const simple = await buildInvestigationIntelligence(buildSimpleTrace());
  allPassed = assertEqual(simple.status, 'COMPLETED', 'status completed') && allPassed;
  allPassed = assertEqual(simple.wallet_profiles.length, 2, 'two wallet profiles') && allPassed;
  allPassed = assertEqual(simple.terminal_destinations.length, 1, 'one terminal destination') && allPassed;
  allPassed = assertEqual(simple.terminal_destinations[0]?.address, '0xdest', 'terminal is destination') && allPassed;
  allPassed = assertEqual(simple.investigation_summary?.transaction_count, 1, 'transaction count') && allPassed;

  // Test 2 — Multi-hop path
  console.log('\nTest 2: Multi-hop path');
  const multi = await buildInvestigationIntelligence(buildMultiHopTrace());
  allPassed = assertEqual(multi.status, 'COMPLETED', 'status completed') && allPassed;
  allPassed = assertEqual(multi.path_intelligence.length >= 1, true, 'path intelligence generated') && allPassed;
  const multiPath = multi.path_intelligence[0];
  allPassed = assertEqual(multiPath?.hop_count, 3, 'hop count is 3') && allPassed;
  allPassed = assertEqual(multiPath?.wallets_in_path?.length, 4, 'four wallets in path') && allPassed;
  allPassed = assertEqual(multiPath?.destination, '0xdest', 'destination is terminal') && allPassed;

  // Test 3 — Fan-out
  console.log('\nTest 3: Fan-out');
  const fanOut = await buildInvestigationIntelligence(buildFanOutTrace());
  allPassed = assertEqual(fanOut.status, 'COMPLETED', 'status completed') && allPassed;
  const fanOutPattern = fanOut.behavioral_patterns.find((p) => p.pattern === 'HIGH_FAN_OUT');
  allPassed = assertDefined(fanOutPattern, 'fan-out pattern detected') && allPassed;
  if (fanOutPattern) {
    allPassed = assertEqual(fanOutPattern.outgoing_destinations, 5, 'fan-out count') && allPassed;
  }

  // Test 4 — Fan-in
  console.log('\nTest 4: Fan-in');
  const fanIn = await buildInvestigationIntelligence(buildFanInTrace());
  allPassed = assertEqual(fanIn.status, 'COMPLETED', 'status completed') && allPassed;
  const fanInPattern = fanIn.behavioral_patterns.find((p) => p.pattern === 'HIGH_FAN_IN');
  allPassed = assertDefined(fanInPattern, 'fan-in pattern detected') && allPassed;
  if (fanInPattern) {
    allPassed = assertEqual(fanInPattern.incoming_sources, 5, 'fan-in count') && allPassed;
  }

  // Test 5 — Convergence
  console.log('\nTest 5: Convergence');
  const conv = await buildInvestigationIntelligence(buildConvergenceTrace());
  allPassed = assertEqual(conv.status, 'COMPLETED', 'status completed') && allPassed;
  allPassed = assertEqual(conv.convergence_points.length >= 1, true, 'convergence detected') && allPassed;
  const convergence = conv.convergence_points[0];
  allPassed = assertEqual(convergence?.pattern, 'CONVERGENCE', 'pattern is CONVERGENCE') && allPassed;
  allPassed = assertEqual(convergence?.source_wallets.length >= 2, true, 'multiple source wallets') && allPassed;

  // Test 6 — Repeated destination
  console.log('\nTest 6: Repeated destination');
  const repeat = await buildInvestigationIntelligence(buildRepeatedDestinationTrace());
  allPassed = assertEqual(repeat.status, 'COMPLETED', 'status completed') && allPassed;
  const repeatPattern = repeat.behavioral_patterns.find((p) => p.pattern === 'REPEATED_DESTINATION');
  allPassed = assertDefined(repeatPattern, 'repeated destination pattern detected') && allPassed;
  if (repeatPattern) {
    allPassed = assertEqual(repeatPattern.transaction_count, 3, 'transaction count') && allPassed;
    allPassed = assertEqual(repeatPattern.destination_wallet, '0xdest', 'destination wallet') && allPassed;
  }

  // Test 7 — Rapid forwarding
  console.log('\nTest 7: Rapid forwarding');
  const rapid = await buildInvestigationIntelligence(buildRapidForwardingTrace());
  allPassed = assertEqual(rapid.status, 'COMPLETED', 'status completed') && allPassed;
  const rapidPattern = rapid.behavioral_patterns.find((p) => p.pattern === 'RAPID_FORWARDING');
  allPassed = assertDefined(rapidPattern, 'rapid forwarding pattern detected') && allPassed;
  if (rapidPattern) {
    allPassed = assertEqual(rapidPattern.evidence?.time_difference_seconds, 30, 'time difference 30s') && allPassed;
  }

  // Test 8 — Timeline ordering
  console.log('\nTest 8: Timeline ordering');
  const timelineTrace = buildTrace({
    nodes: ['0xroot', '0xhop1'],
    edges: [
      { from: '0xroot', to: '0xhop1', value: 1, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xt1', hop: 1 },
      { from: '0xhop1', to: '0xroot', value: 0.5, timestamp: '2026-01-01T00:01:00Z', direction: 'outgoing', hash: '0xt2', hop: 2 },
    ],
    trace_summary: { max_hops: 2, max_hops_reached: 2 },
  });
  const timelineResult = await buildInvestigationIntelligence(timelineTrace);
  allPassed = assertEqual(timelineResult.status, 'COMPLETED', 'status completed') && allPassed;
  allPassed = assertEqual(timelineResult.timeline?.event_count, 2, 'two timeline events') && allPassed;
  allPassed = assertEqual(timelineResult.timeline?.temporal_ordering_complete, true, 'temporal ordering complete') && allPassed;
  allPassed = assertEqual(timelineResult.timeline?.events?.[0]?.timestamp, '2026-01-01T00:00:00.000Z', 'first event earliest') && allPassed;
  allPassed = assertEqual(timelineResult.timeline?.events?.[1]?.timestamp, '2026-01-01T00:01:00.000Z', 'second event later') && allPassed;

  // Test 9 — Missing timestamps
  console.log('\nTest 9: Missing timestamps');
  const missingTs = await buildInvestigationIntelligence(buildMissingTimestampTrace());
  allPassed = assertEqual(missingTs.status, 'COMPLETED', 'status completed') && allPassed;
  allPassed = assertEqual(missingTs.timeline?.temporal_ordering_complete, false, 'temporal ordering incomplete') && allPassed;
  allPassed = assertEqual(missingTs.timeline?.events?.[0]?.timestamp_available, false, 'timestamp not available') && allPassed;

  // Test 10 — Missing transaction values
  console.log('\nTest 10: Missing transaction values');
  const missingVal = await buildInvestigationIntelligence(buildMissingValueTrace());
  allPassed = assertEqual(missingVal.status, 'COMPLETED', 'status completed') && allPassed;
  allPassed = assertEqual(missingVal.timeline?.events?.[0]?.value, 0, 'missing value defaults to 0') && allPassed;

  // Test 11 — Empty trace
  console.log('\nTest 11: Empty trace');
  const empty = await buildInvestigationIntelligence(buildEmptyTrace());
  allPassed = assertEqual(empty.status, 'COMPLETED', 'status completed for empty') && allPassed;
  allPassed = assertEqual(empty.wallet_profiles.length, 0, 'no wallet profiles') && allPassed;
  allPassed = assertEqual(empty.terminal_destinations.length, 0, 'no terminals') && allPassed;
  allPassed = assertEqual(empty.investigation_summary?.transaction_count, 0, 'zero transactions') && allPassed;

  // Test 12 — Large bounded trace
  console.log('\nTest 12: Large bounded trace');
  const largeEdges = Array.from({ length: 200 }).map((_, i) => ({
    from: '0xroot',
    to: `0xdest${i % 20}`,
    value: 0.1,
    timestamp: '2026-01-01T00:00:00Z',
    direction: 'outgoing',
    hash: `0xlarge${i}`,
    hop: 1,
  }));
  const largeTrace = buildTrace({
    nodes: ['0xroot', ...Array.from({ length: 20 }).map((_, i) => `0xdest${i}`)],
    edges: largeEdges,
    trace_summary: { max_hops: 1, max_hops_reached: 1 },
  });
  const large = await buildInvestigationIntelligence(largeTrace);
  allPassed = assertEqual(large.status, 'COMPLETED', 'status completed') && allPassed;
  allPassed = assertEqual(large.behavioral_patterns.length <= 50, true, 'patterns bounded') && allPassed;
  allPassed = assertEqual(large.terminal_destinations.length <= 100, true, 'terminals bounded') && allPassed;

  // Test 13 — Invalid network/address
  console.log('\nTest 13: Invalid network/address');
  const invalidNet = await buildInvestigationIntelligence({ nodes: [], edges: [], network: 'dogecoin', rootAddress: '0xroot' });
  allPassed = assertEqual(invalidNet.status, 'UNAVAILABLE', 'invalid network unavailable') && allPassed;
  const invalidAddr = await buildInvestigationIntelligence({ nodes: [], edges: [], network: 'ethereum', rootAddress: '' });
  allPassed = assertEqual(invalidAddr.status, 'UNAVAILABLE', 'invalid address unavailable') && allPassed;

  // Test 14 — NaN/Infinity handling
  console.log('\nTest 14: NaN/Infinity handling');
  const nanTrace = buildTrace({
    nodes: ['0xroot', '0xdest'],
    edges: [
      { from: '0xroot', to: '0xdest', value: Number.NaN, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xnan1', hop: 1 },
      { from: '0xroot', to: '0xdest', value: Infinity, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xnan2', hop: 1 },
    ],
    trace_summary: { max_hops: 1, max_hops_reached: 1 },
  });
  const nanResult = await buildInvestigationIntelligence(nanTrace);
  allPassed = assertEqual(nanResult.status, 'COMPLETED', 'status completed') && allPassed;
  allPassed = assertEqual(nanResult.evidence_confidence >= 0 && nanResult.evidence_confidence <= 100, true, 'confidence bounded') && allPassed;

  // Test 15 — Intelligence failure does not fail investigation
  console.log('\nTest 15: Intelligence failure does not break caller');
  const invalidData = buildInvestigationIntelligence(null);
  const failResult = await invalidData;
  allPassed = assertEqual(failResult.status, 'UNAVAILABLE', 'returns unavailable on failure') && allPassed;
  allPassed = assertDefined(failResult.reason, 'reason provided') && allPassed;

  // Test 16 — Determinism
  console.log('\nTest 16: Determinism');
  const first = await buildInvestigationIntelligence(buildMultiHopTrace());
  const second = await buildInvestigationIntelligence(buildMultiHopTrace());
  allPassed = assertEqual(first.status, second.status, 'same status') && allPassed;
  allPassed = assertEqual(first.evidence_confidence, second.evidence_confidence, 'same confidence') && allPassed;
  allPassed = assertEqual(first.behavioral_patterns.length, second.behavioral_patterns.length, 'same pattern count') && allPassed;

  // Test 17 — Wallet profiles populated
  console.log('\nTest 17: Wallet profiles populated');
  const profileTrace = buildTrace({
    nodes: ['0xroot', '0xhop1', '0xdest'],
    edges: [
      { from: '0xexternal', to: '0xroot', value: 5, timestamp: '2026-01-01T00:00:00Z', direction: 'incoming', hash: '0xprof1', hop: 1 },
      { from: '0xroot', to: '0xhop1', value: 3, timestamp: '2026-01-01T00:01:00Z', direction: 'outgoing', hash: '0xprof2', hop: 1 },
      { from: '0xhop1', to: '0xdest', value: 2, timestamp: '2026-01-01T00:02:00Z', direction: 'outgoing', hash: '0xprof3', hop: 2 },
    ],
    trace_summary: { max_hops: 2, max_hops_reached: 2 },
  });
  const profileResult = await buildInvestigationIntelligence(profileTrace);
  allPassed = assertEqual(profileResult.wallet_profiles.length >= 3, true, 'profiles for all wallets') && allPassed;
  const rootProfile = profileResult.wallet_profiles.find((p) => p.wallet === '0xroot');
  allPassed = assertDefined(rootProfile, 'root profile exists') && allPassed;
  if (rootProfile) {
    allPassed = assertEqual(rootProfile.is_root, true, 'root flagged') && allPassed;
    allPassed = assertEqual(rootProfile.fan_in, 1, 'fan_in count') && allPassed;
    allPassed = assertEqual(rootProfile.fan_out, 1, 'fan_out count') && allPassed;
    allPassed = assertEqual(rootProfile.forwarding_behavior, true, 'forwarding behavior true') && allPassed;
  }

  // Test 18 — Terminal destinations have evidence
  console.log('\nTest 18: Terminal destinations have evidence');
  const terminalResult = await buildInvestigationIntelligence(buildSimpleTrace());
  allPassed = assertEqual(terminalResult.terminal_destinations.length >= 1, true, 'terminals exist') && allPassed;
  const terminal = terminalResult.terminal_destinations[0];
  allPassed = assertEqual(terminal?.reason_for_termination, 'NO_OUTGOING_TRANSACTIONS', 'termination reason') && allPassed;
  allPassed = assertEqual(terminal?.evidence?.length >= 1, true, 'evidence present') && allPassed;

  // Test 19 — Investigation summary structure
  console.log('\nTest 19: Investigation summary structure');
  const summaryResult = await buildInvestigationIntelligence(buildFanOutTrace());
  const summary = summaryResult.investigation_summary;
  allPassed = assertDefined(summary, 'summary exists') && allPassed;
  allPassed = assertEqual(summary?.root_wallet, '0xroot', 'root wallet') && allPassed;
  allPassed = assertEqual(summary?.network, 'ethereum', 'network') && allPassed;
  allPassed = assertEqual(typeof summary?.evidence_confidence === 'number', true, 'confidence is number') && allPassed;
  allPassed = assertEqual(summary?.evidence_confidence >= 0 && summary?.evidence_confidence <= 100, true, 'confidence bounded') && allPassed;

  // Test 20 — Partial trace status
  console.log('\nTest 20: Partial trace status');
  const partialTrace = buildTrace({
    nodes: ['0xroot', '0xhop1'],
    edges: [
      { from: '0xroot', to: '0xhop1', value: 1, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hash: '0xpart1', hop: 1 },
    ],
    trace_summary: { max_hops: 1, max_hops_reached: 1, partial: true },
  });
  const partialResult = await buildInvestigationIntelligence(partialTrace);
  allPassed = assertEqual(partialResult.status, 'PARTIAL', 'partial status') && allPassed;

  // Test 21 — Divergence chains
  console.log('\nTest 21: Divergence chains');
  const divResult = await buildInvestigationIntelligence(buildFanOutTrace());
  allPassed = assertEqual(divResult.status, 'COMPLETED', 'status completed') && allPassed;
  allPassed = assertEqual(divResult.divergence_chains.length >= 1, true, 'divergence detected') && allPassed;
  const divergence = divResult.divergence_chains[0];
  allPassed = assertEqual(divergence?.destination_count, 5, 'destination count') && allPassed;

  console.log('\n=== Intelligence Verification Complete ===');
  console.log(allPassed ? 'All checks passed.' : 'Some checks failed.');
  process.exit(allPassed ? 0 : 1);
}

runTests();
