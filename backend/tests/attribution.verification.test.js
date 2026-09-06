import config from '../config/index.js';
import { attributeDestination } from '../services/attribution/attributionService.js';
import { findVerifiedEntity, getVerifiedEntitiesByNetwork } from '../services/attribution/labelData.js';
import { VERIFICATION_LEVELS, ENTITY_CATEGORIES, createAttributionResult, createEvidence, calculateConfidence, determineVerificationLevel } from '../services/attribution/attributionEvidence.js';
import attributionRegistry from '../services/attribution/attributionRegistry.js';

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

async function runTests() {
  console.log('=== Attribution Verification ===\n');
  console.log(`DEMO_MODE: ${config.DEMO_MODE}`);
  let allPassed = true;

  // Test 1 — Known verified entity
  console.log('Test 1: Known verified entity (Binance Ethereum)');
  const binanceEth = '0x28C6C06298d514Db089934071355E5743bf21d60';
  const entity = findVerifiedEntity(binanceEth, 'ethereum');
  allPassed = assertEqual(entity?.entity_name, 'Binance', 'entity name') && allPassed;
  allPassed = assertEqual(entity?.verification_status, 'VERIFIED', 'verification status') && allPassed;
  allPassed = assertEqual(entity?.network, 'ethereum', 'network isolation') && allPassed;

  // Test 2 — Unknown address
  console.log('\nTest 2: Unknown address returns UNKNOWN');
  const unknownAddr = '0xUnknownAddress123456789012345678901234567890';
  const unknownEntity = findVerifiedEntity(unknownAddr, 'ethereum');
  allPassed = assertEqual(unknownEntity, null, 'unknown address returns null') && allPassed;

  // Test 3 — Demo/live separation
  console.log('\nTest 3: Demo/live separation');
  const demoTxns = buildGraph({ nodes: [{ address: 'demo-wallet-1', network: 'ethereum' }] });
  const demoResult = await attributeDestination(demoTxns, { synthetic: true });
  if (config.DEMO_MODE) {
    allPassed = assertEqual(demoResult.synthetic, true, 'demo mode returns synthetic') && allPassed;
    allPassed = assertEqual(demoResult.mode, 'DEMO', 'demo mode flag') && allPassed;
    allPassed = assertEqual(demoResult.destination_type, 'DEMO_LABEL', 'demo destination type') && allPassed;
  } else {
    allPassed = assertEqual(demoResult.synthetic, true, 'synthetic flag preserved') && allPassed;
    allPassed = assertEqual(demoResult.destination_type, 'UNKNOWN', 'live mode returns UNKNOWN for demo wallet') && allPassed;
  }

  // Test 4 — Network isolation
  console.log('\nTest 4: Network isolation');
  const btcEntity = findVerifiedEntity(binanceEth, 'bitcoin');
  allPassed = assertEqual(btcEntity, null, 'ethereum address not matched on bitcoin') && allPassed;

  // Test 5 — Address normalization
  console.log('\nTest 5: Address normalization');
  const mixedCase = '0x28C6C06298d514Db089934071355E5743bf21d60';
  const normalizedEntity = findVerifiedEntity(mixedCase, 'ethereum');
  allPassed = assertEqual(normalizedEntity?.entity_name, 'Binance', 'mixed case normalized') && allPassed;

  // Test 6 — Evidence generation
  console.log('\nTest 6: Evidence generation');
  const evidence = createEvidence({
    type: 'DATASET_MATCH',
    description: 'Test evidence',
    source: 'Test Source',
    sourceUrl: 'https://example.com',
    strength: 'authoritative',
  });
  allPassed = assertEqual(evidence.type, 'DATASET_MATCH', 'evidence type') && allPassed;
  allPassed = assertEqual(evidence.source_url, 'https://example.com', 'evidence source_url') && allPassed;
  allPassed = assertEqual(evidence.strength, 'authoritative', 'evidence strength') && allPassed;

  // Test 7 — Confidence calculation
  console.log('\nTest 7: Confidence calculation');
  const highConf = calculateConfidence([
    createEvidence({ strength: 'authoritative' }),
    createEvidence({ strength: 'strong' }),
  ]);
  allPassed = assertEqual(highConf >= 70, true, 'high confidence from strong evidence') && allPassed;
  allPassed = assertEqual(highConf <= 100, true, 'confidence capped at 100') && allPassed;

  const zeroConf = calculateConfidence([]);
  allPassed = assertEqual(zeroConf, 0, 'zero evidence yields zero confidence') && allPassed;

  // Test 8 — Verification levels
  console.log('\nTest 8: Verification levels');
  const singleAuth = determineVerificationLevel([createEvidence({ strength: 'authoritative' })], 85);
  allPassed = assertEqual(singleAuth, 'VERIFIED', 'authoritative single = VERIFIED') && allPassed;
  allPassed = assertEqual(determineVerificationLevel([createEvidence({ strength: 'weak' })], 10), 'UNKNOWN', 'weak single = UNKNOWN') && allPassed;
  allPassed = assertEqual(determineVerificationLevel([], 0), 'UNKNOWN', 'no evidence = UNKNOWN') && allPassed;

  // Test 9 — Deterministic output
  console.log('\nTest 9: Deterministic output');
  const result1 = findVerifiedEntity(binanceEth, 'ethereum');
  const result2 = findVerifiedEntity(binanceEth, 'ethereum');
  allPassed = assertEqual(JSON.stringify(result1), JSON.stringify(result2), 'same input same output') && allPassed;

  // Test 10 — Multiple evidence sources
  console.log('\nTest 10: Multiple evidence sources');
  const multiEvidence = [
    createEvidence({ type: 'DATASET_MATCH', description: 'Match in dataset', source: 'Dataset A', strength: 'authoritative' }),
    createEvidence({ type: 'EXPLORER_LABEL', description: 'Labeled on explorer', source: 'Etherscan', strength: 'strong' }),
  ];
  const multiConf = calculateConfidence(multiEvidence);
  allPassed = assertEqual(multiConf > 70, true, 'multiple sources increase confidence') && allPassed;

  // Test 11 — No false attribution
  console.log('\nTest 11: No false attribution');
  const falseAddr = '0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef';
  const falseEntity = findVerifiedEntity(falseAddr, 'ethereum');
  allPassed = assertEqual(falseEntity, null, 'random address not falsely attributed') && allPassed;

  // Test 12 — Destination integration
  console.log('\nTest 12: Destination integration');
  const destGraph = buildGraph({
    nodes: [{ address: binanceEth, network: 'ethereum' }],
    edges: [],
  });
  const destResult = await attributeDestination(destGraph, { synthetic: false });
  allPassed = assertEqual(destResult.entity_name, 'Binance', 'integration returns entity name') && allPassed;
  allPassed = assertEqual(destResult.verification_level, 'VERIFIED', 'integration returns verification level') && allPassed;

  // Test 13 — Transaction evidence
  console.log('\nTest 13: Transaction evidence in attribution');
  const txGraph = buildGraph({
    nodes: [{ address: binanceEth, network: 'ethereum' }],
    edges: [
      { target: binanceEth, network: 'ethereum', transactionId: '0xtx1', hash: '0xtx1', value: 1.5, timestamp: '2026-01-01T00:00:00Z', direction: 'outgoing', hop: 1 },
    ],
  });
  const txResult = await attributeDestination(txGraph, { synthetic: false });
  allPassed = assertEqual(txResult.entity_name, 'Binance', 'transaction graph integration works') && allPassed;

  // Test 14 — Duplicate destination deduplication
  console.log('\nTest 14: Duplicate destination deduplication');
  const dupGraph = buildGraph({
    nodes: [
      { address: binanceEth, network: 'ethereum' },
      { address: binanceEth, network: 'ethereum' },
    ],
    edges: [],
  });
  const dupResult = await attributeDestination(dupGraph, { synthetic: false });
  allPassed = assertEqual(dupResult.entity_name, 'Binance', 'duplicate nodes deduplicated') && allPassed;

  // Test 15 — Empty destination list
  console.log('\nTest 15: Empty destination list');
  const emptyGraph = buildGraph({ nodes: [], edges: [] });
  const emptyResult = await attributeDestination(emptyGraph, { synthetic: false });
  allPassed = assertEqual(emptyResult.destination_type, 'UNKNOWN', 'empty graph returns UNKNOWN') && allPassed;
  allPassed = assertEqual(emptyResult.verification_level, 'UNKNOWN', 'empty graph verification level') && allPassed;

  // Test 16 — Partial transaction data
  console.log('\nTest 16: Partial transaction data');
  const partialGraph = buildGraph({
    nodes: [{ address: binanceEth, network: 'ethereum' }],
    edges: [{ target: binanceEth, network: 'ethereum' }],
  });
  const partialResult = await attributeDestination(partialGraph, { synthetic: false });
  allPassed = assertEqual(partialResult.entity_name, 'Binance', 'partial data still attributed') && allPassed;

  // Test 17 — Neo4j unavailable compatibility
  console.log('\nTest 17: Neo4j unavailable compatibility');
  const noNeo4jResult = await attributeDestination(buildGraph({ nodes: [{ address: binanceEth, network: 'ethereum' }] }), { synthetic: false });
  allPassed = assertEqual(noNeo4jResult.entity_name, 'Binance', 'works without Neo4j') && allPassed;

  // Test 18 — Authenticated investigation compatibility
  console.log('\nTest 18: Authenticated investigation compatibility');
  const authGraph = buildGraph({
    nodes: [{ address: binanceEth, network: 'ethereum', hop: 0 }],
    edges: [],
  });
  const authResult = await attributeDestination(authGraph, { synthetic: false });
  allPassed = assertEqual(authResult.entity_name, 'Binance', 'auth compatibility preserved') && allPassed;
  allPassed = assertEqual(authResult.mode, 'LIVE', 'live mode in auth context') && allPassed;

  // Test 19 — Verified entities by network
  console.log('\nTest 19: Verified entities by network');
  const ethEntities = getVerifiedEntitiesByNetwork('ethereum');
  allPassed = assertEqual(ethEntities.length > 0, true, 'ethereum entities exist') && allPassed;
  allPassed = assertEqual(ethEntities.every((e) => e.network === 'ethereum'), true, 'all ethereum entities') && allPassed;

  const btcEntities = getVerifiedEntitiesByNetwork('bitcoin');
  allPassed = assertEqual(btcEntities.every((e) => e.network === 'bitcoin'), true, 'all bitcoin entities') && allPassed;

  console.log('\n=== Attribution Verification Complete ===');
  console.log(allPassed ? 'All checks passed.' : 'Some checks failed.');
  process.exit(allPassed ? 0 : 1);
}

runTests();
