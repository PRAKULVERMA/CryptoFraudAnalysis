export const VERIFICATION_LEVELS = Object.freeze({
  VERIFIED: 'VERIFIED',
  PROBABLE: 'PROBABLE',
  UNVERIFIED: 'UNVERIFIED',
  UNKNOWN: 'UNKNOWN',
});

export const ENTITY_CATEGORIES = Object.freeze({
  EXCHANGE: 'exchange',
  BRIDGE: 'bridge',
  MIXER: 'mixer',
  PAYMENT_PROCESSOR: 'payment_processor',
  DEFI_PROTOCOL: 'defi_protocol',
  MINING_POOL: 'mining_pool',
  SERVICE: 'service',
  OTHER: 'other',
});

export function createAttributionResult({
  entityName = null,
  entityType = ENTITY_CATEGORIES.OTHER,
  verificationLevel = VERIFICATION_LEVELS.UNKNOWN,
  confidence = 0,
  evidence = [],
  dataSource = 'NONE',
  note = '',
  synthetic = false,
  mode = 'LIVE',
} = {}) {
  return {
    destination_type: entityType.toUpperCase(),
    entity_name: entityName,
    verification_level: verificationLevel,
    confidence: Number(Math.min(100, Math.max(0, confidence)).toFixed(2)),
    evidence,
    data_source: dataSource,
    note,
    synthetic,
    mode,
  };
}

export function createEvidence({
  type,
  description,
  source,
  sourceUrl,
  strength = 'moderate',
} = {}) {
  const item = { type, description, source, strength };

  if (sourceUrl && sourceUrl.trim()) {
    item.source_url = sourceUrl.trim();
  }

  return item;
}

export function calculateConfidence(evidenceList) {
  if (!evidenceList || evidenceList.length === 0) return 0;

  let confidence = 0;

  for (const item of evidenceList) {
    const strength = String(item.strength || 'weak').toLowerCase();

    if (strength === 'authoritative') {
      confidence += 40;
    } else if (strength === 'strong') {
      confidence += 30;
    } else if (strength === 'moderate') {
      confidence += 20;
    } else if (strength === 'weak') {
      confidence += 10;
    } else {
      confidence += 5;
    }
  }

  if (evidenceList.length >= 3) {
    confidence += 10;
  } else if (evidenceList.length >= 2) {
    confidence += 5;
  }

  return Number(Math.min(100, Math.max(0, confidence)).toFixed(2));
}

export function determineVerificationLevel(evidenceList, confidence) {
  if (!evidenceList || evidenceList.length === 0 || confidence === 0) {
    return VERIFICATION_LEVELS.UNKNOWN;
  }

  const hasAuthoritative = evidenceList.some((item) => String(item.strength || '').toLowerCase() === 'authoritative');
  const hasStrong = evidenceList.some((item) => String(item.strength || '').toLowerCase() === 'strong');
  const hasModerate = evidenceList.some((item) => String(item.strength || '').toLowerCase() === 'moderate');

  if (hasAuthoritative && evidenceList.length >= 2) {
    return VERIFICATION_LEVELS.VERIFIED;
  }

  if (hasAuthoritative && confidence >= 75) {
    return VERIFICATION_LEVELS.VERIFIED;
  }

  if (hasAuthoritative || (hasStrong && evidenceList.length >= 2)) {
    return VERIFICATION_LEVELS.PROBABLE;
  }

  if (hasModerate || evidenceList.length >= 2) {
    return VERIFICATION_LEVELS.UNVERIFIED;
  }

  return VERIFICATION_LEVELS.UNKNOWN;
}
