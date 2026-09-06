export function buildUnknownDestination() {
  return {
    destination_type: 'UNKNOWN',
    entity_name: null,
    verification_level: 'UNKNOWN',
    confidence: 0,
    evidence: [],
    data_source: 'NONE',
    note: 'Potential destination based on automated transaction graph analysis. Not evidence of wrongdoing.',
    synthetic: false,
    mode: 'LIVE',
  };
}

export function buildDemoDestination() {
  return {
    destination_type: 'DEMO_LABEL',
    entity_name: 'DEMO Exchange Cluster',
    verification_level: 'UNVERIFIED',
    confidence: 0,
    evidence: [{ type: 'DEMO_LABEL', description: 'Synthetic destination label generated for demonstration mode only.', source: 'DEMO_DATASET', strength: 'weak' }],
    data_source: 'DEMO',
    note: 'Potential destination based on automated transaction graph analysis. Not evidence of wrongdoing.',
    synthetic: true,
    mode: 'DEMO',
  };
}
