import config from '../../config/index.js';
import { buildDemoDestination, buildUnknownDestination } from './destinationService.js';
import { findLabelForWallet } from './labelRepository.js';

export function attributeDestination(graph, { synthetic = false } = {}) {
  if (synthetic && config.DEMO_MODE) {
    return {
      ...buildDemoDestination(),
      synthetic: true,
      mode: 'DEMO',
    };
  }

  const wallet = graph.nodes?.[0]?.address || null;
  const label = wallet ? findLabelForWallet(wallet) : null;

  if (label) {
    return {
      destination_type: 'KNOWN_LABEL',
      entity_name: label,
      confidence: 0.5,
      evidence: ['Verified label entry from configured dataset.'],
      data_source: 'CONFIGURED_DATASET',
      note: 'Potential destination based on automated transaction graph analysis. Not evidence of wrongdoing.',
      synthetic: false,
      mode: 'LIVE',
    };
  }

  return {
    ...buildUnknownDestination(),
    synthetic: Boolean(synthetic),
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
  };
}
