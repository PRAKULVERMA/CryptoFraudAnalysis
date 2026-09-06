import config from '../../config/index.js';
import attributionRegistry from './attributionRegistry.js';
import { buildDemoDestination, buildUnknownDestination } from './destinationService.js';
import { createAttributionResult, VERIFICATION_LEVELS, ENTITY_CATEGORIES } from './attributionEvidence.js';
import { findLabelForWallet } from './labelRepository.js';

export async function attributeDestination(graph, { synthetic = false } = {}) {
  if (synthetic && config.DEMO_MODE) {
    return {
      ...buildDemoDestination(),
      synthetic: true,
      mode: 'DEMO',
    };
  }

  const wallets = Array.isArray(graph.nodes) ? graph.nodes : [];
  const uniqueDestinations = [];
  const seen = new Set();

  for (const node of wallets) {
    const address = node.address || node.id || '';
    if (!address) continue;
    const key = `${address}-${node.network || ''}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueDestinations.push({ address, network: node.network });
  }

  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  for (const edge of edges) {
    const target = edge.target || edge.to || '';
    if (!target) continue;
    const key = `${target}-${edge.network || ''}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueDestinations.push({ address: target, network: edge.network });
  }

  let verifiedResult = null;
  for (const destination of uniqueDestinations) {
    try {
      const result = await attributionRegistry.getAttribution(destination);
      if (result && result.verification_level !== VERIFICATION_LEVELS.UNKNOWN) {
        verifiedResult = result;
        break;
      }
    } catch {
      continue;
    }
  }

  if (verifiedResult) {
    return verifiedResult;
  }

  const demoLabel = wallets[0] ? findLabelForWallet(wallets[0].address || wallets[0].id || '') : null;
  if (demoLabel && config.DEMO_MODE) {
    return createAttributionResult({
      entityName: demoLabel,
      entityType: ENTITY_CATEGORIES.EXCHANGE,
      verificationLevel: VERIFICATION_LEVELS.UNVERIFIED,
      confidence: 0,
      evidence: [{ type: 'DEMO_LABEL', description: 'Demo label for demonstration purposes.', source: 'DEMO_DATASET', strength: 'weak' }],
      dataSource: 'DEMO',
      note: 'Synthetic/demo attribution for UI demonstration only.',
      synthetic: true,
      mode: 'DEMO',
    });
  }

  return {
    ...buildUnknownDestination(),
    synthetic: Boolean(synthetic),
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
  };
}
