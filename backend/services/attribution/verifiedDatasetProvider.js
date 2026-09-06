import AttributionProvider from './attributionProvider.js';
import { findVerifiedEntity } from './labelData.js';
import { createAttributionResult, createEvidence, VERIFICATION_LEVELS, ENTITY_CATEGORIES } from './attributionEvidence.js';

export class VerifiedDatasetProvider extends AttributionProvider {
  async getAttribution({ address, network }) {
    const entity = findVerifiedEntity(address, network);

    if (!entity) {
      return createAttributionResult({
        entityName: null,
        entityType: ENTITY_CATEGORIES.OTHER,
        verificationLevel: VERIFICATION_LEVELS.UNKNOWN,
        confidence: 0,
        evidence: [],
        dataSource: 'NONE',
        note: 'No verified attribution evidence found for this address.',
        synthetic: false,
        mode: 'LIVE',
      });
    }

    const evidence = [
      createEvidence({
        type: 'DATASET_MATCH',
        description: `Address matches verified ${entity.entity_name} ${entity.entity_type} address in configured dataset.`,
        source: entity.source,
        sourceUrl: entity.source_url,
        strength: 'authoritative',
      }),
    ];

    const confidence = entity.verification_status === 'VERIFIED' ? 85 : 50;

    return createAttributionResult({
      entityName: entity.entity_name,
      entityType: entity.entity_type,
      verificationLevel: entity.verification_status || VERIFICATION_LEVELS.PROBABLE,
      confidence,
      evidence,
      dataSource: 'CONFIGURED_DATASET',
      note: 'Attribution based on verified public address dataset. Not evidence of wrongdoing.',
      synthetic: false,
      mode: 'LIVE',
    });
  }
}

export default new VerifiedDatasetProvider();
