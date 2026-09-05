export function buildUnknownDestination() {
  return {
    destination_type: 'UNKNOWN',
    entity_name: null,
    confidence: 0,
    evidence: [],
    data_source: 'NONE',
    note: 'Potential destination based on automated transaction graph analysis. Not evidence of wrongdoing.',
    synthetic: true,
  };
}

export function buildDemoDestination() {
  return {
    destination_type: 'DEMO_LABEL',
    entity_name: 'DEMO Exchange Cluster',
    confidence: 0.42,
    evidence: ['Synthetic destination label generated for demonstration mode only.'],
    data_source: 'DEMO',
    note: 'Potential destination based on automated transaction graph analysis. Not evidence of wrongdoing.',
    synthetic: true,
  };
}
