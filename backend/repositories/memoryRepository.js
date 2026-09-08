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

  async claimInvestigation(id) {
    const existing = store.get(id);
    if (!existing || existing.status !== "queued") return null;
    const updated = { ...existing, status: "running", started_at: new Date() };
    store.set(id, updated);
    return updated;
  }

  async findStaleRunning(staleThreshold) {
    const threshold = new Date(Date.now() - staleThreshold);
    return Array.from(store.values()).filter(
      (job) => ["running", "retrying"].includes(job.status) && new Date(job.updated_at) < threshold
    );
  }

  async findRetryableFailed(maxRetries) {
    return Array.from(store.values()).filter(
      (job) => job.status === "failed" && job.retry_count < maxRetries
    );
  }
}

export default new MemoryRepository();
