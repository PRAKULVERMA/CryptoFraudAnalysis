import config from '../../config/index.js';
import { VerifiedDatasetProvider } from './verifiedDatasetProvider.js';
import { VERIFICATION_LEVELS } from './attributionEvidence.js';

class AttributionRegistry {
  constructor() {
    this.providers = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    this.providers = [];

    if (!config.DEMO_MODE) {
      const datasetProvider = new VerifiedDatasetProvider();
      if (await datasetProvider.isAvailable()) {
        this.providers.push(datasetProvider);
      }
    }

    this.initialized = true;
  }

  registerProvider(provider) {
    this.providers.push(provider);
  }

  async getAttribution({ address, network }) {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const provider of this.providers) {
      try {
        const result = await provider.getAttribution({ address, network });
        if (result && result.verification_level !== VERIFICATION_LEVELS.UNKNOWN) {
          return result;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  async getBatchAttribution(items) {
    if (!this.initialized) {
      await this.initialize();
    }

    const results = [];
    for (const item of items) {
      results.push(await this.getAttribution(item));
    }
    return results;
  }
}

export const attributionRegistry = new AttributionRegistry();
export default attributionRegistry;
