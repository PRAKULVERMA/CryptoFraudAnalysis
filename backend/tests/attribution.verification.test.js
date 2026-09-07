import config from '../config/index.js';
import {
  attributeExchange,
  attributeSingleAddress,
  attributeAddressesWithConflictDetection,
  extractDestinationAddresses,
  validateAttributionInput,
  getDemoAttribution,
  ATTRIBUTION_STATUS,
} from '../services/attribution/exchangeAttributionService.js';
import attributionRegistry from '../services/attribution/attributionRegistry.js';
import { findVerifiedEntity } from '../services/attribution/labelData.js';

function assertEqual(actual, expected, label) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${label}: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) {
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
  }
  return pass;
}

function buildGraph({ nodes = [], edges = [] } = {}) {
  return { nodes, edges };
}

const BINANCE_ETH = '0x28C6C06298d514Db089934071355E5743bf21d60';
const COINBASE_ETH = '0xbf72d64822d5f8d7d380355500c8b20e9b26672d';

async function runTests() {
  console.log('=== STEP 7 — Verified Exchange/Service Attribution ===\n');
  console.log(`DEMO_MODE: ${config.DEMO_MODE}\n`);
  let allPassed = true;

  // ----------------------------------------------------------------
  // Test 1 — Verified attribution: known fixture returns expected entity
  // ----------------------------------------------------------------
  console.log('Test 1: Verified attribution (Binance Ethereum)');
  const verifiedGraph = buildGraph({
    nodes: [
      { address: '0xroot', network: 'ethereum', hop: 0 },
      { address: BINANCE_ETH, network: 'ethereum', hop: 1 },
    ],
    edges: [
      { source: '0xroot', target: BINANCE_ETH, network: 'ethereum', direction: 'outgoing', transactionId: '0x1', value: 1, hop: 1 },
    ],
  });
  const verifiedResult = await attributeExchange({
    address: '0xroot',
    network: 'ethereum',
    trace: verifiedGraph,
  });
  allPassed = assertEqual(verifiedResult.attributionStatus, ATTRIBUTION_STATUS.VERIFIED, 'status is VERIFIED') && allPassed;
  allPassed = assertEqual(verifiedResult.entity, 'Binance', 'entity is Binance') && allPassed;
  allPassed = assertEqual(verifiedResult.entityType, 'exchange', 'entity type is exchange') && allPassed;
  allPassed = assertEqual(verifiedResult.network, 'ethereum', 'network is ethereum') && allPassed;
  allPassed = assertEqual(verifiedResult.confidence >= 0 && verifiedResult.confidence <= 100, true, 'confidence in bounds') && allPassed;
  allPassed = assertEqual(verifiedResult.confidence >= 70, true, 'verified entry has high confidence') && allPassed;
  allPassed = assertEqual(verifiedResult.evidence.length > 0, true, 'evidence present') && allPassed;

  // ----------------------------------------------------------------
  // Test 2 — Unknown address: returns UNKNOWN
  // ----------------------------------------------------------------
  console.log('\nTest 2: Unknown address returns UNKNOWN');
  const unknownGraph = buildGraph({
    nodes: [
      { address: '0xroot', network: 'ethereum', hop: 0 },
      { address: '0x1111111111111111111111111111111111111111', network: 'ethereum', hop: 1 },
    ],
    edges: [
      { source: '0xroot', target: '0x1111111111111111111111111111111111111111', network: 'ethereum', direction: 'outgoing', transactionId: '0x2', value: 0.5, hop: 1 },
    ],
  });
  const unknownResult = await attributeExchange({
    address: '0xroot',
    network: 'ethereum',
    trace: unknownGraph,
  });
  allPassed = assertEqual(unknownResult.attributionStatus, ATTRIBUTION_STATUS.UNKNOWN, 'status is UNKNOWN') && allPassed;
  allPassed = assertEqual(unknownResult.entity, null, 'entity is null') && allPassed;
  allPassed = assertEqual(unknownResult.confidence, 0, 'confidence is 0') && allPassed;
  allPassed = assertEqual(unknownResult.evidence.length, 0, 'no evidence') && allPassed;

  // ----------------------------------------------------------------
  // Test 3 — Evidence requirement
  // ----------------------------------------------------------------
  console.log('\nTest 3: Evidence requirement');
  const evidenceCheck = await attributeSingleAddress({ address: BINANCE_ETH, network: 'ethereum' });
  allPassed = assertEqual(Array.isArray(evidenceCheck.evidence), true, 'evidence is array') && allPassed;
  allPassed = assertEqual(evidenceCheck.evidence.length > 0, true, 'evidence non-empty for verified') && allPassed;
  allPassed = assertEqual(typeof evidenceCheck.source === 'string' && evidenceCheck.source.length > 0, true, 'source populated') && allPassed;
  const noSourceEvidence = evidenceCheck.evidence.every((e) => e && e.source && e.description);
  allPassed = assertEqual(noSourceEvidence, true, 'every evidence item has source + description') && allPassed;

  // ----------------------------------------------------------------
  // Test 4 — Confidence is deterministic
  // ----------------------------------------------------------------
  console.log('\nTest 4: Confidence is deterministic');
  const run1 = await attributeSingleAddress({ address: BINANCE_ETH, network: 'ethereum' });
  const run2 = await attributeSingleAddress({ address: BINANCE_ETH, network: 'ethereum' });
  allPassed = assertEqual(run1.confidence, run2.confidence, 'same input → same confidence') && allPassed;
  allPassed = assertEqual(run1.attributionStatus, run2.attributionStatus, 'same input → same status') && allPassed;
  allPassed = assertEqual(run1.evidence.length, run2.evidence.length, 'same input → same evidence count') && allPassed;

  // ----------------------------------------------------------------
  // Test 5 — Network mismatch
  // ----------------------------------------------------------------
  console.log('\nTest 5: Network mismatch');
  const wrongNetwork = await attributeSingleAddress({ address: BINANCE_ETH, network: 'bitcoin' });
  allPassed = assertEqual(wrongNetwork.attributionStatus, ATTRIBUTION_STATUS.UNKNOWN, 'Binance ETH address on bitcoin network is UNKNOWN') && allPassed;
  allPassed = assertEqual(wrongNetwork.entity, null, 'no entity attribution on wrong network') && allPassed;
  allPassed = assertEqual(wrongNetwork.network, 'bitcoin', 'network is preserved as bitcoin') && allPassed;

  // ----------------------------------------------------------------
  // Test 6 — Invalid input validation
  // ----------------------------------------------------------------
  console.log('\nTest 6: Input validation');
  const invalidNetwork = await attributeSingleAddress({ address: BINANCE_ETH, network: 'dogecoin' });
  allPassed = assertEqual(invalidNetwork.attributionStatus, ATTRIBUTION_STATUS.UNKNOWN, 'invalid network returns UNKNOWN') && allPassed;
  const invalidAddress = await attributeSingleAddress({ address: 'not-a-real-address', network: 'ethereum' });
  allPassed = assertEqual(invalidAddress.attributionStatus, ATTRIBUTION_STATUS.UNKNOWN, 'invalid address returns UNKNOWN') && allPassed;
  const validCheck = validateAttributionInput(BINANCE_ETH, 'ethereum');
  allPassed = assertEqual(validCheck.valid, true, 'valid input passes') && allPassed;
  const invalidCheck = validateAttributionInput(BINANCE_ETH, 'dogecoin');
  allPassed = assertEqual(invalidCheck.valid, false, 'invalid network fails') && allPassed;

  // ----------------------------------------------------------------
  // Test 7 — Conflict detection (synthetic multi-source scenario)
  // ----------------------------------------------------------------
  console.log('\nTest 7: Conflict detection between sources');
    const originalGetAttribution = attributionRegistry.getAttribution.bind(attributionRegistry);
    let callCount = 0;
    attributionRegistry.getAttribution = async ({ address, network }) => {
      callCount += 1;
      if (address === '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') {
        return {
          destination_type: 'EXCHANGE',
          entity_name: 'Binance',
          verification_level: 'VERIFIED',
          confidence: 85,
          evidence: [{ type: 'DATASET_MATCH', source: 'SourceA', description: 'match', strength: 'authoritative' }],
          data_source: 'SourceA',
          note: 'A says Binance',
        };
      }
      if (address === '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb') {
        return {
          destination_type: 'EXCHANGE',
          entity_name: 'Coinbase',
          verification_level: 'VERIFIED',
          confidence: 85,
          evidence: [{ type: 'DATASET_MATCH', source: 'SourceB', description: 'match', strength: 'authoritative' }],
          data_source: 'SourceB',
          note: 'B says Coinbase',
        };
      }
      return null;
    };
    try {
      const conflictFindings = await attributeAddressesWithConflictDetection([
        { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', network: 'ethereum' },
        { address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', network: 'ethereum' },
      ]);
      const conflict = conflictFindings.find((f) => f.attributionStatus === ATTRIBUTION_STATUS.CONFLICTING);
      allPassed = assertEqual(Boolean(conflict), true, 'conflict detected') && allPassed;
      if (conflict) {
        allPassed = assertEqual(conflict.evidence.length >= 2, true, 'conflict includes both source pieces of evidence') && allPassed;
        allPassed = assertEqual(conflict.entity, null, 'no entity chosen in conflict') && allPassed;
      }
    } finally {
      attributionRegistry.getAttribution = originalGetAttribution;
    }

  // ----------------------------------------------------------------
  // Test 8 — Provider failure does not corrupt investigation
  // ----------------------------------------------------------------
  console.log('\nTest 8: Provider failure');
  const originalGetAttribution8 = attributionRegistry.getAttribution.bind(attributionRegistry);
  attributionRegistry.getAttribution = async () => {
    throw new Error('simulated provider outage');
  };
  try {
    const failResult = await attributeSingleAddress({ address: BINANCE_ETH, network: 'ethereum' });
    allPassed = assertEqual(failResult.attributionStatus, ATTRIBUTION_STATUS.UNAVAILABLE, 'returns ATTRIBUTION UNAVAILABLE') && allPassed;
    allPassed = assertEqual(failResult.entity, null, 'no entity claimed') && allPassed;
    allPassed = assertEqual(failResult.error?.retryable, true, 'retryable flag set') && allPassed;
  } finally {
    attributionRegistry.getAttribution = originalGetAttribution8;
  }

  // ----------------------------------------------------------------
  // Test 9 — Demo mode isolation
  // ----------------------------------------------------------------
  console.log('\nTest 9: Demo mode isolation');
  const demoResult = getDemoAttribution();
  allPassed = assertEqual(demoResult.synthetic, true, 'demo result is synthetic') && allPassed;
  allPassed = assertEqual(demoResult.mode, 'DEMO', 'demo mode flag') && allPassed;
  allPassed = assertEqual(demoResult.verification_level, 'UNVERIFIED', 'demo never VERIFIED') && allPassed;

  // ----------------------------------------------------------------
  // Test 10 — No hardcoded live labels (labelData is config-backed, not hardcoded)
  // ----------------------------------------------------------------
  console.log('\nTest 10: No hardcoded live labels in service code');
  const { default: fs } = await import('fs');
  const { default: path } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const servicePath = path.join(__dirname, '..', 'services', 'attribution', 'exchangeAttributionService.js');
  const serviceSource = fs.readFileSync(servicePath, 'utf-8');
  const hasHardcodedBinance = /['"]0x28C6C06298d514Db089934071355E5743bf21d60['"]/i.test(serviceSource);
  allPassed = assertEqual(hasHardcodedBinance, false, 'no hardcoded Binance address in service') && allPassed;
  const hasHardcodedCoinbase = /['"]0xbf72d64822d5f8d7d380355500c8b20e9b26672d['"]/i.test(serviceSource);
  allPassed = assertEqual(hasHardcodedCoinbase, false, 'no hardcoded Coinbase address in service') && allPassed;
  allPassed = assertEqual(!serviceSource.includes('entity_name = "Binance"'), true, 'no hardcoded entity name') && allPassed;

  // ----------------------------------------------------------------
  // Test 11 — Terminal destination extraction (root excluded)
  // ----------------------------------------------------------------
  console.log('\nTest 11: Terminal destination extraction');
  const mixedGraph = buildGraph({
    nodes: [
      { address: '0xroot', network: 'ethereum', hop: 0 },
      { address: '0xintermediate', network: 'ethereum', hop: 1 },
      { address: BINANCE_ETH, network: 'ethereum', hop: 2 },
    ],
    edges: [
      { source: '0xroot', target: '0xintermediate', network: 'ethereum', direction: 'outgoing', transactionId: '0xa', hop: 1 },
      { source: '0xintermediate', target: BINANCE_ETH, network: 'ethereum', direction: 'outgoing', transactionId: '0xb', hop: 2 },
    ],
  });
  const destinations = extractDestinationAddresses(mixedGraph);
  const hasRoot = destinations.some((d) => d.address === '0xroot');
  const hasTerminal = destinations.some((d) => d.address === BINANCE_ETH);
  allPassed = assertEqual(hasRoot, false, 'root address excluded from destinations') && allPassed;
  allPassed = assertEqual(hasTerminal, true, 'terminal hop included') && allPassed;
  allPassed = assertEqual(destinations.length >= 1, true, 'at least one destination extracted') && allPassed;

  // ----------------------------------------------------------------
  // Test 12 — Confidence bounds: NaN/Infinity safe
  // ----------------------------------------------------------------
  console.log('\nTest 12: Confidence bounds safety');
  const originalGetAttribution12 = attributionRegistry.getAttribution.bind(attributionRegistry);
  attributionRegistry.getAttribution = async () => ({
    destination_type: 'EXCHANGE',
    entity_name: 'Fake',
    verification_level: 'VERIFIED',
    confidence: Number.NaN,
    evidence: [{ type: 'X', source: 'X', description: 'X', strength: 'authoritative' }],
    data_source: 'X',
  });
  try {
    const nanResult = await attributeSingleAddress({ address: BINANCE_ETH, network: 'ethereum' });
    allPassed = assertEqual(nanResult.confidence >= 0 && nanResult.confidence <= 100, true, 'NaN confidence clamped to bounds') && allPassed;
  } finally {
    attributionRegistry.getAttribution = originalGetAttribution12;
  }

  // ----------------------------------------------------------------
  // Test 13 — Live dataset is loaded from labelData (not hardcoded)
  // ----------------------------------------------------------------
  console.log('\nTest 13: Live dataset is config-backed');
  const liveEntity = findVerifiedEntity(BINANCE_ETH, 'ethereum');
  allPassed = assertEqual(liveEntity?.entity_name, 'Binance', 'Binance entity from labelData') && allPassed;
  allPassed = assertEqual(liveEntity?.source, 'Public blockchain explorer labels', 'source documented') && allPassed;

  // ----------------------------------------------------------------
  // Test 14 — Empty trace
  // ----------------------------------------------------------------
  console.log('\nTest 14: Empty trace returns UNKNOWN');
  const emptyResult = await attributeExchange({
    address: '0xroot',
    network: 'ethereum',
    trace: buildGraph({ nodes: [], edges: [] }),
  });
  allPassed = assertEqual(emptyResult.attributionStatus, ATTRIBUTION_STATUS.UNKNOWN, 'empty trace is UNKNOWN') && allPassed;
  allPassed = assertEqual(emptyResult.entity, null, 'no entity for empty trace') && allPassed;

  // ----------------------------------------------------------------
  // Test 15 — API response contract preserved
  // ----------------------------------------------------------------
  console.log('\nTest 15: API response contract preserved');
  const apiResult = await attributeExchange({
    address: '0xroot',
    network: 'ethereum',
    trace: verifiedGraph,
  });
  const hasContract = typeof apiResult.entity === 'string' || apiResult.entity === null
    && typeof apiResult.entityType === 'string' || apiResult.entityType === null
    && typeof apiResult.attributionStatus === 'string'
    && typeof apiResult.confidence === 'number'
    && Array.isArray(apiResult.evidence);
  allPassed = assertEqual(hasContract, true, 'response has all required contract fields') && allPassed;

  // ----------------------------------------------------------------
  // Test 16 — Trace with hop 0 is not treated as a destination
  // ----------------------------------------------------------------
  console.log('\nTest 16: Hop 0 (root) excluded from destinations');
  const singleHopGraph = buildGraph({
    nodes: [{ address: '0xroot', network: 'ethereum', hop: 0 }],
    edges: [],
  });
  const singleHopResult = await attributeExchange({
    address: '0xroot',
    network: 'ethereum',
    trace: singleHopGraph,
  });
  allPassed = assertEqual(singleHopResult.attributionStatus, ATTRIBUTION_STATUS.UNKNOWN, 'no destinations means UNKNOWN') && allPassed;

  console.log('\n=== Attribution Verification Complete ===');
  console.log(allPassed ? 'All checks passed.' : 'Some checks failed.');
  process.exit(allPassed ? 0 : 1);
}

runTests();
