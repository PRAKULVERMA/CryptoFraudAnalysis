import test from 'node:test';
import assert from 'node:assert/strict';
import { collectScreeningCandidates, screenInvestigation } from '../services/compliance/complianceService.js';
import { normalizeAddress, normalizeProviderResult, STATUS } from '../services/compliance/sanctionsProvider.js';

const ETHEREUM_ADDRESS = '0x0000000000000000000000000000000000000001';
const BITCOIN_ADDRESS = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT';

function matchProvider() {
  return {
    async screenAddress(address, network) {
      if (network === 'ethereum' && address === ETHEREUM_ADDRESS) {
        return {
          status: STATUS.MATCH,
          match_type: 'EXACT_ADDRESS',
          entity_name: 'Authoritative Test Entity',
          confidence: 1,
          evidence: [{
            type: 'SANCTIONS_LIST',
            description: 'Exact address match in an injected authoritative test provider.',
            source: 'TEST_PROVIDER',
            source_url: 'https://example.test/authoritative-record',
            strength: 'STRONG',
          }],
        };
      }
      return { status: STATUS.CLEAR, confidence: 1, evidence: [] };
    },
  };
}

test('normalizes addresses by network and rejects malformed inputs', () => {
  assert.equal(normalizeAddress(ETHEREUM_ADDRESS.toUpperCase(), 'ethereum'), ETHEREUM_ADDRESS);
  assert.equal(normalizeAddress(BITCOIN_ADDRESS, 'bitcoin'), BITCOIN_ADDRESS.toLowerCase());
  assert.equal(normalizeAddress('not-an-address', 'ethereum'), null);
  assert.equal(normalizeAddress(ETHEREUM_ADDRESS, 'bitcoin'), null);
  assert.equal(normalizeAddress(ETHEREUM_ADDRESS, 'solana'), null);
});

test('returns evidence-backed exact matches and deterministic output', async () => {
  const input = {
    rootAddress: ETHEREUM_ADDRESS,
    network: 'ethereum',
    graph: { nodes: [{ address: ETHEREUM_ADDRESS, network: 'ethereum' }], edges: [] },
  };
  const first = await screenInvestigation({ ...input, provider: matchProvider() });
  const second = await screenInvestigation({ ...input, provider: matchProvider() });
  assert.equal(first.summary.matches, 1);
  assert.equal(first.results[0].status, STATUS.MATCH);
  assert.equal(first.results[0].evidence.length, 1);
  assert.equal(first.results[0].evidence[0].source_url, 'https://example.test/authoritative-record');
  assert.equal(first.results[0].confidence, 1);
  assert.equal(first.results[0].address, ETHEREUM_ADDRESS);
  assert.equal(first.results[0].network, 'ethereum');
  assert.deepEqual({ ...first, checked_at: undefined, results: first.results.map(({ checked_at, ...result }) => result) }, { ...second, checked_at: undefined, results: second.results.map(({ checked_at, ...result }) => result) });
});

test('deduplicates network-aware candidates', () => {
  const candidates = collectScreeningCandidates({
    rootAddress: ETHEREUM_ADDRESS.toUpperCase(),
    network: 'ethereum',
    graph: {
      nodes: [
        { address: ETHEREUM_ADDRESS, network: 'ethereum' },
        { address: ETHEREUM_ADDRESS.toUpperCase(), network: 'ethereum' },
        { address: BITCOIN_ADDRESS, network: 'bitcoin' },
      ],
      edges: [
        { target: ETHEREUM_ADDRESS, network: 'ethereum' },
        { target: BITCOIN_ADDRESS, network: 'bitcoin' },
      ],
    },
  });
  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates.map((item) => `${item.network}:${item.address}`).sort(), [`bitcoin:${BITCOIN_ADDRESS.toLowerCase()}`, `ethereum:${ETHEREUM_ADDRESS}`].sort());
});

test('returns UNKNOWN when provider is unavailable or unconfigured', async () => {
  const input = { rootAddress: ETHEREUM_ADDRESS, network: 'ethereum', graph: { nodes: [], edges: [] } };
  const unavailable = await screenInvestigation({
    ...input,
    provider: { async screenAddress() { throw new Error('provider unavailable'); } },
  });
  assert.equal(unavailable.results[0].status, STATUS.UNKNOWN);
  assert.match(unavailable.results[0].reason, /failed/i);

  const unconfigured = await screenInvestigation({ ...input, provider: { async screenAddress() { return { status: STATUS.UNKNOWN, reason: 'Sanctions screening source is not configured.' }; } } });
  assert.equal(unconfigured.results[0].status, STATUS.UNKNOWN);
  assert.match(unconfigured.results[0].reason, /not configured/i);
});

test('does not accept positive results without evidence or fabricated URLs', () => {
  const result = normalizeProviderResult({
    status: STATUS.MATCH,
    entity_name: 'Unsupported Entity',
    confidence: 1,
    evidence: [{ type: 'SANCTIONS_LIST', description: 'Missing source evidence.' }],
  }, ETHEREUM_ADDRESS, 'ethereum');
  assert.equal(result.status, STATUS.MATCH);
  assert.equal(result.evidence[0].source_url, undefined);

  const noEvidence = normalizeProviderResult({ status: STATUS.MATCH, entity_name: 'Unsupported Entity' }, ETHEREUM_ADDRESS, 'ethereum');
  assert.equal(noEvidence.status, STATUS.UNKNOWN);
});

test('preserves UNKNOWN compliance when provider times out', async () => {
  const result = await screenInvestigation({
    rootAddress: BITCOIN_ADDRESS,
    network: 'bitcoin',
    graph: { nodes: [], edges: [] },
    provider: { async screenAddress() { const error = new Error('timeout'); error.name = 'AbortError'; throw error; } },
  });
  assert.equal(result.summary.unknown, 1);
  assert.equal(result.results[0].status, STATUS.UNKNOWN);
});

test('returns UNKNOWN when no provider is configured (live mode safety)', async () => {
  const unconfiguredProvider = { async screenAddress() { return { status: STATUS.UNKNOWN, reason: 'Sanctions screening source is not configured.' }; } };
  const result = await screenInvestigation({
    rootAddress: ETHEREUM_ADDRESS,
    network: 'ethereum',
    graph: { nodes: [], edges: [] },
    provider: unconfiguredProvider,
  });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.results[0].status, STATUS.UNKNOWN);
  assert.match(result.results[0].reason, /not configured/i);
  assert.equal(result.summary.unknown, 1);
  assert.equal(result.summary.matches, 0);
});

test('investigation integration preserves existing fields', async () => {
  const input = {
    rootAddress: ETHEREUM_ADDRESS,
    network: 'ethereum',
    graph: {
      nodes: [{ address: ETHEREUM_ADDRESS, network: 'ethereum', hop: 0 }],
      edges: [{ target: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', network: 'ethereum', direction: 'outgoing', hop: 1 }],
    },
    destination: { address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', network: 'ethereum', entity_name: 'Unknown' },
    provider: matchProvider(),
  };
  const result = await screenInvestigation(input);
  assert.ok(result.compliance_screening === undefined, 'compliance_screening should not be duplicated');
  assert.equal(result.status, 'COMPLETED');
  assert.ok(typeof result.checked_at === 'string', 'checked_at should be ISO string');
  assert.equal(result.summary.checked, 2);
  assert.equal(result.results.length, 2);
  const addresses = result.results.map((r) => r.address);
  assert.ok(addresses.includes(ETHEREUM_ADDRESS), 'root address screened');
  assert.ok(addresses.includes('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'), 'destination address screened');
});

test('does not create fake CLEAR results when provider returns UNKNOWN', async () => {
  const alwaysUnknown = { async screenAddress() { return { status: STATUS.UNKNOWN, reason: 'No data.' }; } };
  const result = await screenInvestigation({
    rootAddress: ETHEREUM_ADDRESS,
    network: 'ethereum',
    graph: { nodes: [], edges: [] },
    provider: alwaysUnknown,
  });
  assert.equal(result.results[0].status, STATUS.UNKNOWN);
  assert.equal(result.summary.clear, 0);
  assert.equal(result.summary.unknown, 1);
});
