export class AttributionProvider {
  async getAttribution({ address, network }) {
    throw new Error('getAttribution() must be implemented by attribution provider.');
  }

  async getBatchAttribution(items) {
    const results = [];
    for (const item of items) {
      results.push(await this.getAttribution(item));
    }
    return results;
  }

  async isAvailable() {
    return true;
  }
}

export default AttributionProvider;
