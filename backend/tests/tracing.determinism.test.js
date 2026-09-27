process.env.DEMO_MODE = 'false';
process.env.NEO4J_ENABLED = 'false';
process.env.MONGODB_URI = '';
process.env.INCLUDE_UNCONFIRMED_TRANSACTIONS = 'false';

const { traceWallet } = await import('../services/tracing/traceService.js');

const A = '0xaaa11111111111111111111111111111111111111';
const B = '0xbbb22222222222222222222222222222222222222';
const C = '0xccc33333333333333333333333333333333333333';
const D = '0xddd44444444444444444444444444444444444444';
const E = '0xeee55555555555555555555555555555555555555';

const transfers = [
  { id: 'tx-a1', from: A, to: B, value: 1.0, block: 100, ts: '2024-01-01T00:00:00Z' },
  { id: 'tx-a2', from: A, to: C, value: 0.5, block: 101, ts: '2024-01-01T01:00:00Z' },
  { id: 'tx-b1', from: B, to: D, value: 0.9, block: 102, ts: '2024-01-01T02:00:00Z' },
  { id: 'tx-c1', from: C, to: D, value: 0.4, block: 103, ts: '2024-01-01T03:00:00Z' },
  { id: 'tx-e1', from: E, to: A, value: 5.0, block: 90, ts: '2024-01-01T00:30:00Z' },
];

function normalizedTx(t) {
  return {
    transactionId: t.id,
    transaction_id: t.id,
    hash: t.id,
    from: t.from,
    to: t.to,
    value: t.value,
    amount: t.value,
    timestamp: t.ts,
    blockNumber: t.block,
    block_height: t.block,
    network: 'bitcoin',
    asset: 'BTC',
    status: t.status || 'confirmed',
    synthetic: false,
    demo: false,
    direction: t.from.toLowerCase() === t.to.toLowerCase() ? 'self-transfer' : undefined,
  };
}

function fakeProvider(dataset = transfers) {
  const byAddress = new Map();
  for (const t of dataset) {
    if (!byAddress.has(t.from)) byAddress.set(t.from, []);
    if (!byAddress.has(t.to)) byAddress.set(t.to, []);
    byAddress.get(t.from).push(t);
    byAddress.get(t.to).push(t);
  }

  return {
    async getWalletTransactions(address, network) {
      const key = String(address || '').trim().toLowerCase();
      const mine = (byAddress.get(key) || []).map((t) => {
        const tx = normalizedTx(t);
        if (!tx.direction) {
          if (t.from.toLowerCase() === key) tx.direction = 'outgoing';
          else if (t.to.toLowerCase() === key) tx.direction = 'incoming';
        }
        return tx;
      });
      return {
        address,
        network,
        transactions: mine,
        provider_tx_count: mine.length,
        pagination: { pages: 1 },
        synthetic: false,
        mode: 'LIVE',
      };
    },
  };
}

function summarize(trace) {
  const edges = (trace.edges || []).map((e) => ({
    id: e.transactionId,
    source: String(e.source || e.from),
    target: String(e.target || e.to),
  }));
  return {
    transactionCount: trace.trace_summary.transactions_analyzed,
    walletCount: trace.trace_summary.wallets_discovered,
    nodeCount: trace.nodes.length,
    edgeCount: trace.edges.length,
    maxHops: trace.trace_summary.max_hops_reached,
    mode: trace.mode,
    synthetic: trace.synthetic,
    nodeAddresses: trace.nodes.map((n) => n.address).sort(),
    nodeHops: Object.fromEntries(
      trace.nodes
        .map((n) => [n.address, n.hop])
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
    edgeIds: trace.edges.map((e) => e.transactionId).sort(),
    edgeRelationships: edges.map((e) => `${e.source}->${e.target}`).sort(),
    edgeValues: (trace.edges || []).map((e) => `${e.transactionId}:${Number(e.value || e.amount || 0)}`).sort(),
    allEdgesSynthetic: trace.edges.every((e) => e.synthetic === false),
    allNodesSynthetic: trace.nodes.every((n) => n.synthetic === false),
    partial: trace.trace_summary.partial,
    providerError: trace.trace_summary.provider_error,
    diagnostics: {
      configured_limits: trace.tracing_diagnostics.configured_limits,
      provider_requests: trace.tracing_diagnostics.provider_requests,
      provider_tx_count: trace.tracing_diagnostics.provider_tx_count,
      transactions_fetched: trace.tracing_diagnostics.transactions_fetched,
      transactions_accepted: trace.tracing_diagnostics.transactions_accepted,
      transactions_skipped: trace.tracing_diagnostics.transactions_skipped
        .map((s) => `${s.transactionId || s.reason}:${s.reason}${s.count !== undefined ? ':' + s.count : ''}`)
        .sort(),
      wallets_discovered: trace.tracing_diagnostics.wallets_discovered,
      wallets_skipped: trace.tracing_diagnostics.wallets_skipped
        .map((w) => `${w.address}:${w.reason}`)
        .sort(),
      wallet_hops: trace.tracing_diagnostics.wallet_hops,
      max_hops_reached: trace.tracing_diagnostics.max_hops_reached,
      limits_reached: trace.tracing_diagnostics.limits_reached,
      limits_reached_detail: trace.tracing_diagnostics.limits_reached_detail,
      partial: trace.tracing_diagnostics.partial,
      provider_timeout: trace.tracing_diagnostics.provider_timeout,
      provider_failures: trace.tracing_diagnostics.provider_failures.map((f) => f.code),
      pagination_pages_processed: trace.tracing_diagnostics.pagination_pages_processed,
    },
  };
}

function assertEqual(actual, expected, label, failures) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${label}: ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) {
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
    failures.push(label);
  }
  return ok;
}

let allPassed = true;
const failures = [];
console.log('=== LIVE Tracing Determinism Verification ===\n');

const provider = fakeProvider();
const investigationId = 'determinism-test-0001';

const run1 = await traceWallet(A, 'bitcoin', provider, investigationId);
const run2 = await traceWallet(A, 'bitcoin', provider, investigationId);

const s1 = summarize(run1);
const s2 = summarize(run2);

console.log('Run 1:', JSON.stringify(s1));
console.log('Run 2:', JSON.stringify(s2));

assertEqual(s1.transactionCount, s2.transactionCount, 'Test 1: transactions_analyzed identical', failures);
assertEqual(s1.walletCount, s2.walletCount, 'Test 2: wallets_discovered identical', failures);
assertEqual(s1.edgeCount, s2.edgeCount, 'Test 3: edge count identical', failures);
assertEqual(s1.nodeHops, s2.nodeHops, 'Test 4: hop assignments identical', failures);
assertEqual(s1.edgeIds, s2.edgeIds, 'Test 5: transaction IDs identical', failures);
assertEqual(s1.nodeAddresses, s2.nodeAddresses, 'Test 6: node addresses identical', failures);
assertEqual(s1.edgeRelationships, s2.edgeRelationships, 'Test 7: edge relationships identical', failures);
assertEqual(s1.edgeValues, s2.edgeValues, 'Test 7b: edge values identical', failures);
assertEqual(
  { allEdgesSynthetic: s1.allEdgesSynthetic, allNodesSynthetic: s1.allNodesSynthetic, synthetic: s1.synthetic },
  { allEdgesSynthetic: true, allNodesSynthetic: true, synthetic: false },
  'Test 8: no synthetic data',
  failures,
);
assertEqual(s1.mode, 'LIVE', 'Test 9: mode === LIVE', failures);
assertEqual(s1.mode, s2.mode, 'Test 9b: mode identical', failures);
assertEqual(s1.synthetic, s2.synthetic, 'Test 9c: synthetic identical', failures);
assertEqual(s1.diagnostics, s2.diagnostics, 'Test 10: tracing_diagnostics identical', failures);
assertEqual(s1.partial, false, 'Test 10b: not partial', failures);
assertEqual(s1.providerError, undefined, 'Test 10c: no provider_error', failures);

assertEqual(s1.transactionCount, 5, 'Test 11a: exactly 5 traced transactions', failures);
assertEqual(s1.nodeCount, 5, 'Test 11b: exactly 5 unique wallets (A,B,C,D,E)', failures);
assertEqual(s1.edgeCount, 5, 'Test 11c: exactly 5 edges (one per unique tx)', failures);
assertEqual(
  s1.diagnostics.limits_reached_detail,
  { max_hops: false, max_wallets: false, max_transactions_per_wallet: false, max_total_transactions: false },
  'Test 11d: limits_reached_detail all false',
  failures,
);
assertEqual(
  s1.diagnostics.transactions_skipped,
  ['tx-a1:DUPLICATE', 'tx-a2:DUPLICATE', 'tx-b1:DUPLICATE', 'tx-c1:DUPLICATE'],
  'Test 11e: only duplicate txs skipped',
  failures,
);

console.log('\n--- Test 12: unconfirmed transactions are excluded from LIVE traces ---');
const mixedDataset = [
  { id: 'tx-conf', from: A, to: B, value: 1.0, block: 100, ts: '2024-01-01T00:00:00Z', status: 'confirmed' },
  { id: 'tx-unconf', from: A, to: C, value: 0.5, block: 0, ts: '2024-01-01T00:05:00Z', status: 'unconfirmed' },
];
const mixedProvider = fakeProvider(mixedDataset);
const mixed = await traceWallet(A, 'bitcoin', mixedProvider, 'determinism-test-0002');
const ms = summarize(mixed);
console.log('Mixed-trace diagnostics:', JSON.stringify(ms));
assertEqual(ms.transactionCount, 1, 'Test 12a: only confirmed tx accepted', failures);
assertEqual(ms.mode, 'LIVE', 'Test 12b: mode LIVE', failures);
assertEqual(ms.synthetic, false, 'Test 12c: synthetic false', failures);
assertEqual(
  ms.diagnostics.transactions_skipped,
  ['tx-conf:DUPLICATE', 'tx-unconf:UNCONFIRMED_EXCLUDED'],
  'Test 12d: unconfirmed tx logged as skipped',
  failures,
);
assertEqual(ms.partial, false, 'Test 12e: not partial (filter is intentional, not a failure)', failures);

allPassed = failures.length === 0;

console.log('\n=== Verification Complete ===');
console.log(allPassed ? 'All checks passed.' : `FAILED: ${failures.join(', ')}`);
process.exit(allPassed ? 0 : 1);
