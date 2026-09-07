import { createSanctionsProvider, normalizeAddress, normalizeProviderResult, STATUS } from './sanctionsProvider.js';

function unknownResult(address, network, reason) {
  return {
    status: STATUS.UNKNOWN,
    match_type: null,
    entity_name: null,
    confidence: 0,
    evidence: [],
    checked_at: new Date().toISOString(),
    network,
    address,
    reason,
  };
}

function addCandidate(candidates, address, network) {
  const normalizedNetwork = String(network || '').trim().toLowerCase();
  const normalizedAddress = normalizeAddress(address, normalizedNetwork);
  if (!normalizedAddress) return;

  const key = `${normalizedNetwork}:${normalizedAddress}`;
  if (!candidates.has(key)) {
    candidates.set(key, { address: normalizedAddress, network: normalizedNetwork });
  }
}

export function collectScreeningCandidates({ rootAddress, network, graph = {}, destination } = {}) {
  const candidates = new Map();
  addCandidate(candidates, rootAddress, network);

  for (const node of Array.isArray(graph.nodes) ? graph.nodes : []) {
    addCandidate(candidates, node.address || node.id, node.network || network);
  }

  for (const edge of Array.isArray(graph.edges) ? graph.edges : []) {
    addCandidate(candidates, edge.target || edge.to, edge.network || network);
  }

  if (destination?.address) addCandidate(candidates, destination.address, destination.network || network);
  return Array.from(candidates.values());
}

function summarize(results) {
  return results.reduce((summary, result) => {
    summary.checked += 1;
    if (result.status === STATUS.MATCH) summary.matches += 1;
    else if (result.status === STATUS.POSSIBLE_MATCH) summary.possible_matches += 1;
    else if (result.status === STATUS.UNKNOWN) summary.unknown += 1;
    else if (result.status === STATUS.CLEAR) summary.clear += 1;
    else summary.unverified += 1;
    return summary;
  }, {
    checked: 0,
    matches: 0,
    possible_matches: 0,
    unknown: 0,
    clear: 0,
    unverified: 0,
  });
}

export async function screenInvestigation({ rootAddress, network, graph, destination, provider = createSanctionsProvider() } = {}) {
  const candidates = collectScreeningCandidates({ rootAddress, network, graph, destination });
  const results = [];

  for (const candidate of candidates) {
    try {
      const result = await provider.screenAddress(candidate.address, candidate.network);
      results.push(normalizeProviderResult(result, candidate.address, candidate.network));
    } catch (error) {
      results.push(unknownResult(candidate.address, candidate.network, 'Sanctions screening provider failed.'));
    }
  }

  return {
    status: 'COMPLETED',
    checked_at: new Date().toISOString(),
    results,
    summary: summarize(results),
  };
}

export default { screenInvestigation, collectScreeningCandidates };
