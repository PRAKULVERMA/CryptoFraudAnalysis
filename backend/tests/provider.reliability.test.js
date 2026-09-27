process.env.DEMO_MODE = 'false';
process.env.NEO4J_ENABLED = 'false';
process.env.MONGODB_URI = '';
process.env.INCLUDE_UNCONFIRMED_TRANSACTIONS = 'false';
process.env.ETHERSCAN_API_KEY = process.env.TEST_ETHERSCAN_KEY || 'TESTKEY_DO_NOT_USE_0123456789';
process.env.ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
process.env.BITCOIN_API_URL = 'https://blockstream.info/api';
process.env.BLOCKCHAIN_PROVIDER_TIMEOUT = '1000';
process.env.BLOCKCHAIN_PROVIDER_MAX_RETRIES = '1';
process.env.BLOCKCHAIN_PROVIDER_RETRY_BASE_DELAY = '5';
process.env.BLOCKCHAIN_PROVIDER_RETRY_MAX_DELAY = '20';
process.env.MAX_HOPS = '3';
process.env.MAX_WALLETS_PER_INVESTIGATION = '25';
process.env.MAX_TRANSACTIONS_PER_WALLET = '50';
process.env.MAX_TOTAL_TRANSACTIONS = '250';

const config = (await import('../config/index.js')).default;
const { traceWallet } = await import('../services/tracing/traceService.js');
const ethereumProvider = (await import('../services/providers/ethereumProvider.js')).default;
const bitcoinProvider = (await import('../services/providers/bitcoinProvider.js')).default;
const { createProviderError, redactUrl, redactText, REDACTED } = await import('../services/providers/providerErrors.js');
const { createProviderMetrics } = await import('../services/providers/providerHttp.js');
const providerManager = (await import('../services/providers/providerManager.js')).default;
const { createBlockchainProvider } = await import('../services/blockchain/providerFactory.js');

const ETH_ROOT = '0xaaa1111111111111111111111111111111111111';
const BTC_ROOT = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const failures = [];
const realFetch = globalThis.fetch;
const realLog = console.log;
const realWarn = console.warn;
const realError = console.error;

function assert(condition, label, detail) {
  const ok = Boolean(condition);
  realLog(`  ${label}: ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) {
    failures.push(label);
    if (detail !== undefined) realError(`    detail: ${JSON.stringify(detail)}`);
  }
  return ok;
}

function assertEqual(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  realLog(`  ${label}: ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) {
    failures.push(label);
    realError(`    Expected: ${JSON.stringify(expected)}`);
    realError(`    Actual:   ${JSON.stringify(actual)}`);
  }
  return ok;
}

let capturedLogs = [];
function captureLogs() {
  capturedLogs = [];
  const collect = (...args) => {
    capturedLogs.push(args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  };
  console.log = collect;
  console.warn = collect;
  console.error = collect;
}

function releaseLogs() {
  console.log = realLog;
  console.warn = realWarn;
  console.error = realError;
  return capturedLogs;
}

function jsonResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (name) => headers[String(name).toLowerCase()] ?? (String(name).toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

function hangForever() {
  return new Promise((resolve, reject) => {
    const signal = globalThis.__lastSignal;
    if (signal) {
      if (signal.aborted) {
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        return;
      }
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }
  });
}

function setFetch(handler) {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : String(input?.toString?.() || input?.href || input);
    globalThis.__lastSignal = init?.signal || null;
    return handler(url, init);
  };
}

function etherscanTx(hash, from, to, block) {
  return {
    hash,
    from,
    to,
    value: '1000000000000000000',
    timeStamp: String(1700000000 + block),
    blockNumber: String(block),
    isError: '0',
    txreceipt_status: '1',
    gasUsed: '21000',
    gasPrice: '1000000000',
  };
}

function blockstreamTx(txid, from, to, height) {
  return {
    txid,
    vin: [{ prevout: { scriptpubkey_address: from } }],
    vout: [{ scriptpubkey_address: to, value: 100000000 }],
    status: { block_height: height, block_time: 1700000000, confirmed: true },
  };
}

function makeTimeoutError() {
  return createProviderError('PROVIDER_TIMEOUT', 'The ethereum provider request timed out after 1000ms.', 504, null, {
    provider: 'etherscan',
    network: 'ethereum',
    retryable: true,
  });
}

realLog('=== Provider Reliability & Timeout Verification (LIVE providers, no DemoProvider) ===\n');

// --- Test 1: Ethereum successful request -------------------------------------
realLog('Test 1: Ethereum successful request (Etherscan V2 shape)');
{
  const requested = [];
  setFetch((url) => {
    requested.push(url);
    return jsonResponse(JSON.stringify({
      status: '1',
      message: 'OK',
      result: [etherscanTx('0xdead1', ETH_ROOT, '0xbbb2222222222222222222222222222222222222', 20000000)],
    }));
  });

  const result = await ethereumProvider.getWalletTransactions(ETH_ROOT, 'ethereum', { metrics: createProviderMetrics() });
  const parsed = new URL(requested[0]);

  assertEqual(parsed.origin + parsed.pathname, 'https://api.etherscan.io/v2/api', 'Test 1a: uses configured V2 endpoint');
  assertEqual(parsed.searchParams.get('chainid'), '1', 'Test 1b: chainid=1 present');
  assertEqual(parsed.searchParams.get('module'), 'account', 'Test 1c: module=account');
  assertEqual(parsed.searchParams.get('action'), 'txlist', 'Test 1d: action=txlist');
  assertEqual(parsed.searchParams.get('address'), ETH_ROOT, 'Test 1e: address param');
  assertEqual(parsed.searchParams.get('startblock'), '0', 'Test 1f: startblock=0');
  assertEqual(parsed.searchParams.get('endblock'), '99999999', 'Test 1g: endblock=99999999');
  assertEqual(parsed.searchParams.get('page'), '1', 'Test 1h: page=1');
  assertEqual(parsed.searchParams.get('offset'), '50', 'Test 1i: offset matches MAX_TRANSACTIONS_PER_WALLET');
  assertEqual(parsed.searchParams.get('sort'), 'desc', 'Test 1j: sort=desc');
  assertEqual(parsed.searchParams.get('apikey'), config.ETHERSCAN_API_KEY, 'Test 1k: apikey present in request');
  assertEqual(result.transactions.length, 1, 'Test 1l: one transaction returned');
  assertEqual(result.transactions[0].transactionId, '0xdead1', 'Test 1m: real txid preserved');
  assertEqual(result.synthetic, false, 'Test 1n: synthetic=false');
  assertEqual(result.mode, 'LIVE', 'Test 1o: mode=LIVE');
}

// --- Test 2: Bitcoin successful request --------------------------------------
realLog('\nTest 2: Bitcoin successful request (Blockstream shape)');
{
  const requested = [];
  setFetch((url) => {
    requested.push(url);
    return jsonResponse(JSON.stringify([blockstreamTx('btctx1', BTC_ROOT, 'bc1qhop1aaaaaaaaaaaaaa', 800000)]));
  });

  const result = await bitcoinProvider.getWalletTransactions(BTC_ROOT, 'bitcoin', { metrics: createProviderMetrics() });

  assertEqual(requested[0], `https://blockstream.info/api/address/${BTC_ROOT}/txs`, 'Test 2a: GET /address/{address}/txs');
  assertEqual(result.transactions.length, 1, 'Test 2b: one transaction returned');
  assertEqual(result.transactions[0].transactionId, 'btctx1', 'Test 2c: real txid preserved');
  assertEqual(result.transactions[0].direction, 'outgoing', 'Test 2d: direction derived from wallet membership');
  assertEqual(result.synthetic, false, 'Test 2e: synthetic=false');
  assertEqual(result.mode, 'LIVE', 'Test 2f: mode=LIVE');
}

// --- Test 3: Ethereum timeout ------------------------------------------------
realLog('\nTest 3: Ethereum timeout surfaces as PROVIDER_TIMEOUT (not a generic error)');
{
  setFetch(hangForever);
  let thrown = null;
  try {
    await ethereumProvider.getWalletTransactions(ETH_ROOT, 'ethereum', { metrics: createProviderMetrics() });
  } catch (error) {
    thrown = error;
  }
  assert(thrown !== null, 'Test 3a: request failed');
  assertEqual(thrown?.code, 'PROVIDER_TIMEOUT', 'Test 3b: code is PROVIDER_TIMEOUT');
  assertEqual(thrown?.provider, 'etherscan', 'Test 3c: provider is etherscan');
  assertEqual(thrown?.network, 'ethereum', 'Test 3d: network is ethereum');
  assertEqual(thrown?.retryable, true, 'Test 3e: retryable=true');
  assertEqual(thrown?.attempts, config.BLOCKCHAIN_PROVIDER_MAX_RETRIES + 1, 'Test 3f: bounded attempts (1 + retries)');
}

// --- Test 4: Bitcoin timeout -------------------------------------------------
realLog('\nTest 4: Bitcoin timeout surfaces as PROVIDER_TIMEOUT');
{
  setFetch(hangForever);
  let thrown = null;
  try {
    await bitcoinProvider.getWalletTransactions(BTC_ROOT, 'bitcoin', { metrics: createProviderMetrics() });
  } catch (error) {
    thrown = error;
  }
  assertEqual(thrown?.code, 'PROVIDER_TIMEOUT', 'Test 4a: code is PROVIDER_TIMEOUT');
  assertEqual(thrown?.provider, 'blockstream', 'Test 4b: provider is blockstream');
  assertEqual(thrown?.network, 'bitcoin', 'Test 4c: network is bitcoin');
  assertEqual(thrown?.retryable, true, 'Test 4d: retryable=true');
}

// --- Test 5: Ethereum HTTP 429 retry ----------------------------------------
realLog('\nTest 5: Ethereum HTTP 429 is retried then succeeds');
{
  let calls = 0;
  setFetch(() => {
    calls += 1;
    if (calls === 1) return jsonResponse(JSON.stringify({ error: 'Too Many Requests' }), 429, { 'content-type': 'application/json' });
    return jsonResponse(JSON.stringify({ status: '1', message: 'OK', result: [etherscanTx('0xafter429', ETH_ROOT, '0xbbb2222222222222222222222222222222222222', 1)] }));
  });

  const metrics = createProviderMetrics();
  const result = await ethereumProvider.getWalletTransactions(ETH_ROOT, 'ethereum', { metrics });
  assertEqual(calls, 2, 'Test 5a: exactly one retry (2 total requests)');
  assertEqual(result.transactions.length, 1, 'Test 5b: data returned after retry');
  assertEqual(metrics.provider_retries, 1, 'Test 5c: provider_retries counted');
  assertEqual(metrics.provider_failures, undefined, 'Test 5d: no failure recorded on eventual success');
  assertEqual(metrics.provider_failure_count, 0, 'Test 5e: provider_failure_count stays 0');
}

// --- Test 6: Bitcoin HTTP 429 retry -----------------------------------------
realLog('\nTest 6: Bitcoin HTTP 429 is retried then succeeds');
{
  let calls = 0;
  setFetch(() => {
    calls += 1;
    if (calls === 1) return jsonResponse(JSON.stringify({ error: 'rate limited' }), 429, { 'content-type': 'application/json' });
    return jsonResponse(JSON.stringify([blockstreamTx('btcafter429', BTC_ROOT, 'bc1qhop1aaaaaaaaaaaaaa', 1)]));
  });

  const result = await bitcoinProvider.getWalletTransactions(BTC_ROOT, 'bitcoin', { metrics: createProviderMetrics() });
  assertEqual(calls, 2, 'Test 6a: exactly one retry (2 total requests)');
  assertEqual(result.transactions[0].transactionId, 'btcafter429', 'Test 6b: data returned after retry');
}

// --- Test 7: HTTP 500 retry --------------------------------------------------
realLog('\nTest 7: HTTP 500 is retried then succeeds');
{
  let calls = 0;
  setFetch(() => {
    calls += 1;
    if (calls === 1) return jsonResponse(JSON.stringify({ error: 'internal' }), 500, { 'content-type': 'application/json' });
    return jsonResponse(JSON.stringify({ status: '1', message: 'OK', result: [etherscanTx('0xafter500', ETH_ROOT, '0xbbb2222222222222222222222222222222222222', 1)] }));
  });

  const result = await ethereumProvider.getWalletTransactions(ETH_ROOT, 'ethereum', { metrics: createProviderMetrics() });
  assertEqual(calls, 2, 'Test 7a: exactly one retry (2 total requests)');
  assertEqual(result.transactions.length, 1, 'Test 7b: data returned after retry');
}

// --- Test 8: invalid API key does not retry endlessly ------------------------
realLog('\nTest 8: invalid API key is terminal (no endless retry)');
{
  let calls = 0;
  setFetch(() => {
    calls += 1;
    return jsonResponse(JSON.stringify({ status: '0', message: 'Missing/Invalid API Key', result: 'Missing/Invalid API Key' }));
  });

  let thrown = null;
  try {
    await ethereumProvider.getWalletTransactions(ETH_ROOT, 'ethereum', { metrics: createProviderMetrics() });
  } catch (error) {
    thrown = error;
  }
  assertEqual(calls, 1, 'Test 8a: exactly one request, no retries');
  assertEqual(thrown?.code, 'PROVIDER_AUTH_ERROR', 'Test 8b: code is PROVIDER_AUTH_ERROR (not PROVIDER_TIMEOUT)');
  assertEqual(thrown?.retryable, false, 'Test 8c: retryable=false');

  calls = 0;
  setFetch(() => {
    calls += 1;
    return jsonResponse(JSON.stringify({ error: 'forbidden' }), 403, { 'content-type': 'application/json' });
  });
  let thrown403 = null;
  try {
    await bitcoinProvider.getWalletTransactions(BTC_ROOT, 'bitcoin', { metrics: createProviderMetrics() });
  } catch (error) {
    thrown403 = error;
  }
  assertEqual(calls, 1, 'Test 8d: HTTP 403 is not retried');
  assertEqual(thrown403?.code, 'PROVIDER_AUTH_ERROR', 'Test 8e: 403 maps to PROVIDER_AUTH_ERROR');
  assertEqual(thrown403?.status, 403, 'Test 8f: upstream status preserved');
}

// --- Test 9: root timeout returns failure ------------------------------------
realLog('\nTest 9: root wallet timeout returns a provider failure (no empty success)');
{
  const failingProvider = {
    async getWalletTransactions() {
      throw makeTimeoutError();
    },
  };

  let thrown = null;
  try {
    await traceWallet(ETH_ROOT, 'ethereum', failingProvider, 'rel-test-root');
  } catch (error) {
    thrown = error;
  }
  assert(thrown !== null, 'Test 9a: trace threw instead of returning an empty success');
  assertEqual(thrown?.code, 'PROVIDER_TIMEOUT', 'Test 9b: failure code preserved');
  assertEqual(thrown?.statusCode, 504, 'Test 9c: HTTP status 504');
}

// --- Test 10 & 11: intermediate timeout -> partial, no fabricated nodes -------
realLog('\nTest 10/11: intermediate wallet timeout -> partial=true with no fabricated nodes');
{
  const A = ETH_ROOT;
  const B = '0xbbb2222222222222222222222222222222222222';
  const C = '0xccc3333333333333333333333333333333333333';
  const txAtoB = { transactionId: 'tx-a-b', from: A, to: B, value: 1, blockNumber: 10, status: 'confirmed', direction: 'outgoing', timestamp: '2024-01-01T00:00:00Z' };

  const partialProvider = {
    async getWalletTransactions(address) {
      const key = String(address).toLowerCase();
      if (key === A.toLowerCase()) {
        return { address, network: 'ethereum', transactions: [txAtoB], provider_tx_count: 1, pagination: { pages: 1 }, synthetic: false, mode: 'LIVE' };
      }
      if (key === B.toLowerCase()) {
        // B would have forwarded to C, but its fetch times out.
        return { address, network: 'ethereum', transactions: [], provider_tx_count: 0, pagination: { pages: 1 }, synthetic: false, mode: 'LIVE' };
      }
      throw new Error(`unexpected fetch for ${address}`);
    },
  };

  const trace = await traceWallet(A, 'ethereum', partialProvider, 'rel-test-partial');
  const addresses = trace.nodes.map((n) => String(n.address).toLowerCase());

  assertEqual(trace.trace_summary.partial, false, 'Test 10a: control trace is not partial');
  assert(!addresses.includes(C.toLowerCase()), 'Test 10b: control trace does not reach C');
  assert(trace.edges.every((e) => e.synthetic === false), 'Test 10c: control edges are not synthetic');

  // Now make B fail with a timeout after all retries.
  const timeoutTrace = await (async () => {
    const failing = {
      async getWalletTransactions(address) {
        const key = String(address).toLowerCase();
        if (key === A.toLowerCase()) {
          return { address, network: 'ethereum', transactions: [txAtoB], provider_tx_count: 1, pagination: { pages: 1 }, synthetic: false, mode: 'LIVE' };
        }
        throw makeTimeoutError();
      },
    };
    return traceWallet(A, 'ethereum', failing, 'rel-test-partial-2');
  })();

  const tAddresses = timeoutTrace.nodes.map((n) => String(n.address).toLowerCase());
  assertEqual(timeoutTrace.trace_summary.partial, true, 'Test 10d: partial=true after intermediate timeout');
  assertEqual(timeoutTrace.trace_summary.provider_error, 'PROVIDER_TIMEOUT', 'Test 10e: provider_error=PROVIDER_TIMEOUT');
  assertEqual(timeoutTrace.trace_summary.failed_wallet, B, 'Test 10f: failed_wallet reported');
  assertEqual(timeoutTrace.tracing_diagnostics.provider_timeout, true, 'Test 10g: provider_timeout=true');
  assertEqual(timeoutTrace.tracing_diagnostics.provider_failures.length, 1, 'Test 10h: one provider failure recorded');
  assertEqual(timeoutTrace.tracing_diagnostics.provider_failures[0].code, 'PROVIDER_TIMEOUT', 'Test 10i: failure code preserved');
  assertEqual(timeoutTrace.tracing_diagnostics.provider_failures[0].provider, 'etherscan', 'Test 10j: failure provider preserved');
  assertEqual(timeoutTrace.tracing_diagnostics.provider_failures[0].network, 'ethereum', 'Test 10k: failure network preserved');
  assertEqual(timeoutTrace.tracing_diagnostics.failed_wallet.address, B, 'Test 10l: diagnostics.failed_wallet set');
  assertEqual(timeoutTrace.mode, 'LIVE', 'Test 10m: mode stays LIVE (never DEMO)');
  assertEqual(timeoutTrace.synthetic, false, 'Test 10n: synthetic stays false');

  assert(!tAddresses.includes(C.toLowerCase()), 'Test 11a: no fabricated node for unreachable wallet C');
  assertEqual(tAddresses.sort(), [A.toLowerCase(), B.toLowerCase()].sort(), 'Test 11b: only root + failed wallet are present');
  assert(timeoutTrace.edges.length === 1, 'Test 11c: no fabricated downstream edges');
  assert(timeoutTrace.edges.every((e) => e.synthetic === false), 'Test 11d: all edges are real (synthetic=false)');
  assert(timeoutTrace.nodes.every((n) => n.synthetic === false), 'Test 11e: all nodes are real (synthetic=false)');
}

// --- Test 12: DEMO_MODE=false never selects DemoProvider ---------------------
realLog('\nTest 12: DEMO_MODE=false never selects DemoProvider');
{
  assertEqual(config.DEMO_MODE, false, 'Test 12a: DEMO_MODE is false');
  const provider = createBlockchainProvider();
  assertEqual(provider, providerManager, 'Test 12b: factory returns the LIVE provider manager');
  assert(provider !== undefined && provider.getProvider('bitcoin') === bitcoinProvider, 'Test 12c: bitcoin resolves to live provider');
  assert(provider.getProvider('ethereum') === ethereumProvider, 'Test 12d: ethereum resolves to live provider');
}

// --- Test 13: API key is never present in logs -------------------------------
realLog('\nTest 13: API key never appears in logs or errors');
{
  setFetch(() => jsonResponse(JSON.stringify({ status: '1', message: 'OK', result: [] })));
  captureLogs();
  await ethereumProvider.getWalletTransactions(ETH_ROOT, 'ethereum', { metrics: createProviderMetrics() });
  setFetch(() => jsonResponse(JSON.stringify({ error: 'nope' }), 500, { 'content-type': 'application/json' }));
  try {
    await ethereumProvider.getWalletTransactions(ETH_ROOT, 'ethereum', { metrics: createProviderMetrics() });
  } catch {
    /* expected */
  }
  const logs = releaseLogs();
  const joined = logs.join('\n');
  assert(logs.length > 0, 'Test 13a: diagnostics were logged');
  assert(!joined.includes(config.ETHERSCAN_API_KEY), 'Test 13b: raw API key absent from logs');
  assert(!/apikey=[^&\s]*[A-Za-z0-9]{8,}/i.test(joined.replace(/REDACTED/g, '')), 'Test 13c: apikey parameter is redacted');
  assert(joined.includes(REDACTED), 'Test 13d: redaction marker present');

  const redacted = redactUrl(`https://api.etherscan.io/v2/api?chainid=1&apikey=${config.ETHERSCAN_API_KEY}`);
  assert(!redacted.includes(config.ETHERSCAN_API_KEY), 'Test 13e: redactUrl strips the key');
  assert(redacted.includes(`apikey=${REDACTED}`), 'Test 13f: redactUrl keeps the parameter name');
  assert(!redactText(`apikey=${config.ETHERSCAN_API_KEY}`).includes(config.ETHERSCAN_API_KEY), 'Test 13h: redactText strips the key');

  let errorPayload = null;
  setFetch(() => jsonResponse(JSON.stringify({ status: '0', message: 'Missing/Invalid API Key', result: 'Missing/Invalid API Key' })));
  try {
    await ethereumProvider.getWalletTransactions(ETH_ROOT, 'ethereum', { metrics: createProviderMetrics() });
  } catch (error) {
    errorPayload = { code: error.code, provider: error.provider, network: error.network, retryable: error.retryable, message: error.message };
  }
  assert(!JSON.stringify(errorPayload).includes(config.ETHERSCAN_API_KEY), 'Test 13i: structured error carries no key');
}

// --- Test 14: duplicate wallet requests are prevented -------------------------
realLog('\nTest 14: duplicate wallet/network fetches are prevented within one investigation');
{
  const A = '0xaaa1111111111111111111111111111111111111';
  const B = '0xbbb2222222222222222222222222222222222222';
  const C = '0xccc3333333333333333333333333333333333333';
  const dataset = [
    { id: 'tx1', from: A, to: B, block: 1 },
    { id: 'tx2', from: A, to: C, block: 2 },
    { id: 'tx3', from: B, to: C, block: 3 },
  ];
  const callCounts = new Map();

  const countingProvider = {
    async getWalletTransactions(address) {
      const key = String(address).toLowerCase();
      callCounts.set(key, (callCounts.get(key) || 0) + 1);
      const mine = dataset
        .filter((t) => t.from.toLowerCase() === key || t.to.toLowerCase() === key)
        .map((t) => ({
          transactionId: t.id,
          from: t.from,
          to: t.to,
          value: 1,
          blockNumber: t.block,
          status: 'confirmed',
          direction: t.from.toLowerCase() === key ? 'outgoing' : 'incoming',
        }));
      return { address, network: 'ethereum', transactions: mine, provider_tx_count: mine.length, pagination: { pages: 1 }, synthetic: false, mode: 'LIVE' };
    },
  };

  const trace = await traceWallet(A, 'ethereum', countingProvider, 'rel-test-dedupe');
  const callValues = [...callCounts.values()];

  assertEqual([...callCounts.keys()].sort(), [A, B, C].map((a) => a.toLowerCase()).sort(), 'Test 14a: each wallet fetched exactly once as a key');
  assertEqual(Math.max(...callValues), 1, 'Test 14b: no wallet fetched more than once');
  assertEqual(trace.tracing_diagnostics.provider_requests, 3, 'Test 14c: provider_requests equals unique wallets');
  assertEqual(trace.edges.length, 3, 'Test 14d: all 3 unique transactions traced');
}

// --- Test 15: request count stays within configured limits --------------------
realLog('\nTest 15: provider request count stays within configured limits');
{
  const root = '0xaaa1111111111111111111111111111111111111';
  const targets = Array.from({ length: 40 }, (_, i) => {
    const hex = (i + 1).toString(16).padStart(40, '0');
    return `0x${hex}`;
  });

  let totalRequests = 0;
  const fanOutProvider = {
    async getWalletTransactions(address) {
      totalRequests += 1;
      if (String(address).toLowerCase() === root.toLowerCase()) {
        return {
          address,
          network: 'ethereum',
          transactions: targets.map((to, i) => ({
            transactionId: `fan-${i}`,
            from: root,
            to,
            value: 1,
            blockNumber: 1000 - i,
            status: 'confirmed',
            direction: 'outgoing',
          })),
          provider_tx_count: targets.length,
          pagination: { pages: 1 },
          synthetic: false,
          mode: 'LIVE',
        };
      }
      return { address, network: 'ethereum', transactions: [], provider_tx_count: 0, pagination: { pages: 1 }, synthetic: false, mode: 'LIVE' };
    },
  };

  const trace = await traceWallet(root, 'ethereum', fanOutProvider, 'rel-test-limits');

  assertEqual(totalRequests, config.MAX_WALLETS_PER_INVESTIGATION, 'Test 15a: provider requests capped at MAX_WALLETS_PER_INVESTIGATION');
  assert(totalRequests <= config.MAX_WALLETS_PER_INVESTIGATION, 'Test 15b: totalRequests within configured limit');
  assert(trace.tracing_diagnostics.limits_reached.includes('MAX_WALLETS_PER_INVESTIGATION'), 'Test 15c: limit is reported');
  assert(trace.tracing_diagnostics.wallets_discovered <= config.MAX_WALLETS_PER_INVESTIGATION, 'Test 15d: wallets_discovered within limit');
  assert(trace.trace_summary.transactions_analyzed <= config.MAX_TOTAL_TRANSACTIONS, 'Test 15e: transactions within MAX_TOTAL_TRANSACTIONS');
  assertEqual(trace.tracing_diagnostics.configured_limits.maxHops, config.MAX_HOPS, 'Test 15f: configured max hops reported');
  assertEqual(trace.tracing_diagnostics.configured_limits.providerTimeoutMs, config.BLOCKCHAIN_PROVIDER_TIMEOUT, 'Test 15g: configured timeout reported');
}

globalThis.fetch = realFetch;

realLog('\n=== Verification Complete ===');
if (failures.length === 0) {
  realLog('All checks passed.');
  process.exit(0);
} else {
  realLog(`FAILED (${failures.length}): ${failures.join(', ')}`);
  process.exit(1);
}
