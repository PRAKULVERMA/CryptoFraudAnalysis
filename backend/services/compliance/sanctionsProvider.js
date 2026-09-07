import config from '../../config/index.js';
import { validateBitcoinAddress, validateEthereumAddress } from '../blockchain/validator.js';

const STATUS = Object.freeze({
  CLEAR: 'CLEAR',
  MATCH: 'MATCH',
  POSSIBLE_MATCH: 'POSSIBLE_MATCH',
  UNKNOWN: 'UNKNOWN',
  UNVERIFIED: 'UNVERIFIED',
});

function checkedAt() {
  return new Date().toISOString();
}

function unknownResult(address, network, reason) {
  return {
    status: STATUS.UNKNOWN,
    match_type: null,
    entity_name: null,
    confidence: 0,
    evidence: [],
    checked_at: checkedAt(),
    network,
    address,
    reason,
  };
}

function normalizeNetwork(network) {
  return String(network || '').trim().toLowerCase();
}

export function normalizeAddress(address, network) {
  const normalizedNetwork = normalizeNetwork(network);
  const rawAddress = String(address || '').trim();

  if (!rawAddress || !['bitcoin', 'ethereum'].includes(normalizedNetwork)) return null;
  if (normalizedNetwork === 'bitcoin') {
    if (!validateBitcoinAddress(rawAddress)) return null;
    return rawAddress.toLowerCase();
  }
  if (normalizedNetwork === 'ethereum') {
    const lowered = rawAddress.toLowerCase();
    if (!validateEthereumAddress(lowered)) return null;
    return lowered;
  }
  return null;
}

function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence)) return [];
  return evidence
    .filter((item) => item && typeof item === 'object' && typeof item.type === 'string' && typeof item.description === 'string')
    .map((item) => {
      const normalized = {
        type: item.type,
        description: item.description,
        strength: ['STRONG', 'MODERATE', 'WEAK'].includes(item.strength) ? item.strength : 'WEAK',
      };
      if (typeof item.source === 'string' && item.source.trim()) normalized.source = item.source.trim();
      if (typeof item.source_url === 'string' && /^https:\/\//i.test(item.source_url)) normalized.source_url = item.source_url;
      return normalized;
    });
}

export function normalizeProviderResult(result, address, network) {
  const normalizedAddress = normalizeAddress(address, network) || String(address || '').trim().toLowerCase();
  const normalizedNetwork = normalizeNetwork(network);
  const evidence = normalizeEvidence(result?.evidence);
  const status = Object.values(STATUS).includes(result?.status) ? result.status : STATUS.UNKNOWN;
  const isPositive = status === STATUS.MATCH || status === STATUS.POSSIBLE_MATCH;

  if (isPositive && evidence.length === 0) {
    return unknownResult(normalizedAddress, normalizedNetwork, 'Provider returned a positive result without evidence.');
  }

  return {
    status,
    match_type: typeof result?.match_type === 'string' ? result.match_type : null,
    entity_name: typeof result?.entity_name === 'string' ? result.entity_name : null,
    confidence: Number.isFinite(Number(result?.confidence)) ? Math.max(0, Math.min(1, Number(result.confidence))) : 0,
    evidence,
    checked_at: checkedAt(),
    network: normalizedNetwork,
    address: normalizedAddress,
    ...(typeof result?.reason === 'string' ? { reason: result.reason } : {}),
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.BLOCKCHAIN_PROVIDER_TIMEOUT);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

class UnconfiguredSanctionsProvider {
  async screenAddress(address, network) {
    return unknownResult(address, network, 'Sanctions screening source is not configured.');
  }
}

class HttpSanctionsProvider {
  async screenAddress(address, network) {
    const url = config.SANCTIONS_API_URL;
    if (!url || !/^https:\/\//i.test(url)) {
      return unknownResult(address, network, 'Sanctions screening source is not configured.');
    }

    const headers = { Accept: 'application/json' };
    if (config.SANCTIONS_API_KEY) headers.Authorization = `Bearer ${config.SANCTIONS_API_KEY}`;

    try {
      const response = await fetchWithTimeout(`${url}?address=${encodeURIComponent(address)}&network=${encodeURIComponent(network)}`, { headers });
      if (!response.ok) return unknownResult(address, network, `Sanctions provider returned HTTP ${response.status}.`);
      const payload = await response.json();
      return normalizeProviderResult(payload, address, network);
    } catch (error) {
      return unknownResult(address, network, error?.name === 'AbortError' ? 'Sanctions provider request timed out.' : 'Sanctions provider is unavailable.');
    }
  }
}

export function createSanctionsProvider() {
  if (!config.SANCTIONS_ENABLED || config.SANCTIONS_PROVIDER !== 'http') return new UnconfiguredSanctionsProvider();
  return new HttpSanctionsProvider();
}

export { STATUS };
