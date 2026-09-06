const store = new Map();

export class MemoryRepository {
  async listInvestigations(userId) {
    const investigations = Array.from(store.values());
    return userId === undefined
      ? investigations
      : investigations.filter((investigation) => investigation.user_id === userId);
  }

  async getInvestigation(id) {
    return store.get(id) || null;
  }

  async createInvestigation(record) {
    store.set(record.investigation_id, record);
    return record;
  }

  async updateInvestigation(id, updates) {
    const existing = store.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates };
    store.set(id, merged);
    return merged;
  }

  async deleteInvestigation(id) {
    return store.delete(id);
  }
}

export default new MemoryRepository();
