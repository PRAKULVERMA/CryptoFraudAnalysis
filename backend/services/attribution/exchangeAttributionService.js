import config from '../../config/index.js';
import attributionRegistry from './attributionRegistry.js';
import {
  VERIFICATION_LEVELS,
  ENTITY_CATEGORIES,
  createAttributionResult,
  createEvidence,
  calculateConfidence,
  determineVerificationLevel,
} from './attributionEvidence.js';
import { validateWallet } from '../blockchain/validator.js';

export const ATTRIBUTION_STATUS = Object.freeze({
  VERIFIED: 'VERIFIED',
  SUPPORTED: 'SUPPORTED',
  UNKNOWN: 'UNKNOWN',
  CONFLICTING: 'CONFLICTING',
  UNAVAILABLE: 'ATTRIBUTION UNAVAILABLE',
});

const ALLOWED_NETWORKS = new Set(['ethereum', 'bitcoin']);

function clampConfidence(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (Number.isNaN(num) || num === Infinity || num === -Infinity) return 0;
  return Math.min(100, Math.max(0, num));
}

function safeString(value, maxLength = 200) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (str.length > maxLength) return str.slice(0, maxLength);
  return str;
}

function safeNetwork(value) {
  const str = String(value || '').trim().toLowerCase();
  return ALLOWED_NETWORKS.has(str) ? str : null;
}

function isValidAddressFormat(address, network) {
  if (!address || typeof address !== 'string') return false;
  try {
    if (validateWallet(network, address).valid === true) return true;
  } catch {
  }
  if (network === 'ethereum') {
    return /^0x[0-9a-fA-F]{40}$/.test(String(address).trim());
  }
  if (network === 'bitcoin') {
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(String(address).trim())
      || /^(bc1|tb1|bcrt1)[ac-hj-np-z02-9]{11,71}$/i.test(String(address).trim());
  }
  return false;
}

function buildUnknownResult(network, address) {
  return {
    entity: null,
    entityType: null,
    attributionStatus: ATTRIBUTION_STATUS.UNKNOWN,
    confidence: 0,
    evidence: [],
    source: null,
    data_source: 'NONE',
    network: safeNetwork(network),
    address: safeString(address, 200),
    note: 'No verified attribution evidence was found for this address. UNKNOWN / UNVERIFIED.',
    synthetic: false,
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
  };
}

function buildUnavailableResult(network, address, error, retryable) {
  return {
    entity: null,
    entityType: null,
    attributionStatus: ATTRIBUTION_STATUS.UNAVAILABLE,
    confidence: 0,
    evidence: [],
    source: null,
    data_source: 'NONE',
    network: safeNetwork(network),
    address: safeString(address, 200),
    note: 'Attribution providers were unavailable.',
    synthetic: false,
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
    error: {
      message: safeString(error?.message || String(error || 'Unknown error'), 500),
      retryable: Boolean(retryable),
    },
  };
}

function mapVerificationToStatus(verificationLevel, conflictDetected) {
  if (conflictDetected) return ATTRIBUTION_STATUS.CONFLICTING;
  switch (verificationLevel) {
    case VERIFICATION_LEVELS.VERIFIED:
      return ATTRIBUTION_STATUS.VERIFIED;
    case VERIFICATION_LEVELS.PROBABLE:
      return ATTRIBUTION_STATUS.SUPPORTED;
    case VERIFICATION_LEVELS.UNVERIFIED:
      return ATTRIBUTION_STATUS.SUPPORTED;
    case VERIFICATION_LEVELS.UNKNOWN:
    default:
      return ATTRIBUTION_STATUS.UNKNOWN;
  }
}

function buildAttributionResultFromEvidence({ entityName, entityType, evidenceList, network, address, conflictDetected, originalVerificationLevel, originalConfidence }) {
  const safeNetworkValue = safeNetwork(network);
  const safeAddress = safeString(address, 200);
  const safeEntity = safeString(entityName, 100);
  const safeEntityType = entityType ? String(entityType) : ENTITY_CATEGORIES.OTHER;
  const calculatedConfidence = clampConfidence(calculateConfidence(evidenceList));
  const originalClamped = clampConfidence(originalConfidence);
  const confidence = Math.max(calculatedConfidence, originalClamped);
  let verificationLevel = determineVerificationLevel(evidenceList, confidence);
  if (!conflictDetected && originalVerificationLevel === VERIFICATION_LEVELS.VERIFIED && evidenceList.length > 0) {
    verificationLevel = VERIFICATION_LEVELS.VERIFIED;
  }
  const status = mapVerificationToStatus(verificationLevel, conflictDetected);

  return {
    entity: safeEntity,
    entityType: safeEntityType,
    attributionStatus: status,
    confidence,
    evidence: evidenceList,
    source: evidenceList[0]?.source || null,
    data_source: evidenceList[0]?.source || 'CONFIGURED_DATASET',
    network: safeNetworkValue,
    address: safeAddress,
    note: conflictDetected
      ? 'Multiple providers returned different entity identifications. Attribution is conflicting and should not be trusted without additional evidence.'
      : 'Attribution is evidence-based. Not a determination of fraud or wrongdoing.',
    synthetic: false,
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
    verification_level: verificationLevel,
  };
}

export function validateAttributionInput(address, network) {
  const networkError = (() => {
    if (!network || typeof network !== 'string') return 'network is required';
    if (!ALLOWED_NETWORKS.has(String(network).trim().toLowerCase())) {
      return `Unsupported network: ${network}. Supported: ${Array.from(ALLOWED_NETWORKS).join(', ')}`;
    }
    return null;
  })();
  if (networkError) {
    return { valid: false, code: 'INVALID_NETWORK', message: networkError };
  }

  const normalizedNetwork = String(network).trim().toLowerCase();
  if (!isValidAddressFormat(address, normalizedNetwork)) {
    return { valid: false, code: 'INVALID_ADDRESS', message: 'address failed network format validation' };
  }

  return { valid: true, network: normalizedNetwork };
}

export function extractDestinationAddresses(graph) {
  if (!graph || typeof graph !== 'object') return [];
  const seen = new Set();
  const results = [];

  const push = (address, network) => {
    if (!address) return;
    const key = `${String(address).toLowerCase()}-${String(network || '').toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ address: String(address), network: String(network || '').toLowerCase() });
  };

  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  for (const node of nodes) {
    if (!node || node.hop === 0) continue;
    const address = node.address || node.id || '';
    if (address) push(address, node.network);
  }

  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  for (const edge of edges) {
    if (!edge) continue;
    const direction = String(edge.direction || '').toLowerCase();
    const target = edge.target || edge.to || '';
    if (direction === 'outgoing' && target) {
      push(target, edge.network);
    }
  }

  return results;
}

export async function attributeSingleAddress({ address, network }) {
  const validation = validateAttributionInput(address, network);
  if (!validation.valid) {
    return {
      ...buildUnknownResult(network, address),
      error: { code: validation.code, message: validation.message, retryable: false },
    };
  }

  try {
    const result = await attributionRegistry.getAttribution({
      address,
      network: validation.network,
    });

    if (!result) {
      return buildUnknownResult(validation.network, address);
    }

    if (result.verification_level === VERIFICATION_LEVELS.UNKNOWN) {
      return buildUnknownResult(validation.network, address);
    }

    const evidenceList = Array.isArray(result.evidence) ? result.evidence : [];
    return buildAttributionResultFromEvidence({
      entityName: result.entity_name,
      entityType: result.destination_type ? String(result.destination_type).toLowerCase() : (result.entity_type || ENTITY_CATEGORIES.OTHER),
      evidenceList,
      network: validation.network,
      address,
      conflictDetected: false,
      originalVerificationLevel: result.verification_level,
      originalConfidence: result.confidence,
    });
  } catch (error) {
    return buildUnavailableResult(validation.network, address, error, true);
  }
}

export async function attributeAddressesWithConflictDetection(addresses) {
  const items = Array.isArray(addresses) ? addresses : [];
  const findings = [];

  for (const item of items) {
    const single = await attributeSingleAddress({ address: item.address, network: item.network });
    findings.push(single);
  }

  const identified = findings.filter((f) => f.attributionStatus === ATTRIBUTION_STATUS.VERIFIED || f.attributionStatus === ATTRIBUTION_STATUS.SUPPORTED);

  if (identified.length === 0) {
    return findings;
  }

  const uniqueEntities = new Set(identified.map((f) => `${f.entity || 'UNKNOWN'}|${f.entityType || 'other'}`));
  if (uniqueEntities.size > 1) {
    const conflictEvidence = identified.map((f) => createEvidence({
      type: 'PROVIDER_CONFLICT',
      description: `Provider identified address as "${f.entity}" (${f.entityType}).`,
      source: f.source || 'CONFIGURED_DATASET',
      strength: 'moderate',
    }));

    const conflictResult = buildAttributionResultFromEvidence({
      entityName: null,
      entityType: null,
      evidenceList: conflictEvidence,
      network: identified[0].network,
      address: identified[0].address,
      conflictDetected: true,
    });

    findings.push({
      ...conflictResult,
      conflict_parties: identified.map((f) => ({ entity: f.entity, entityType: f.entityType, source: f.source })),
    });
  }

  return findings;
}

export async function attributeExchange({ address, network, transactions, trace, trace_summary }) {
  const inputGraph = trace && typeof trace === 'object' ? trace : null;
  const destinations = extractDestinationAddresses(inputGraph);

  if (destinations.length === 0) {
    return {
      ...buildUnknownResult(network, address),
      note: 'No terminal destinations found in trace data. UNKNOWN / UNVERIFIED.',
    };
  }

  const findings = await attributeAddressesWithConflictDetection(destinations);
  const conflict = findings.find((f) => f.attributionStatus === ATTRIBUTION_STATUS.CONFLICTING);
  if (conflict) {
    return {
      ...conflict,
      address: safeString(address, 200),
      network: safeNetwork(network),
    };
  }

  const identified = findings.find((f) => f.attributionStatus === ATTRIBUTION_STATUS.VERIFIED || f.attributionStatus === ATTRIBUTION_STATUS.SUPPORTED);
  if (identified) {
    return {
      ...identified,
      address: safeString(address, 200),
      network: safeNetwork(network),
    };
  }

  const unavailable = findings.find((f) => f.attributionStatus === ATTRIBUTION_STATUS.UNAVAILABLE);
  if (unavailable) {
    return {
      ...unavailable,
      address: safeString(address, 200),
      network: safeNetwork(network),
    };
  }

  return {
    ...buildUnknownResult(network, address),
    note: 'No terminal destinations could be verified as a known exchange or service. UNKNOWN / UNVERIFIED.',
  };
}

export function getDemoAttribution() {
  return createAttributionResult({
    entityName: 'DEMO Exchange Cluster',
    entityType: ENTITY_CATEGORIES.EXCHANGE,
    verificationLevel: VERIFICATION_LEVELS.UNVERIFIED,
    confidence: 0,
    evidence: [createEvidence({
      type: 'DEMO_LABEL',
      description: 'Synthetic destination label generated for demonstration mode only.',
      source: 'DEMO_DATASET',
      strength: 'weak',
    })],
    dataSource: 'DEMO',
    note: 'Synthetic/demo attribution for UI demonstration only.',
    synthetic: true,
    mode: 'DEMO',
  });
}

export default {
  ATTRIBUTION_STATUS,
  attributeExchange,
  attributeSingleAddress,
  attributeAddressesWithConflictDetection,
  extractDestinationAddresses,
  validateAttributionInput,
  getDemoAttribution,
};
