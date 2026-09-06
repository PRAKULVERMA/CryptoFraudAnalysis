import { v4 as uuidv4 } from 'uuid';
import { getInvestigationRepository } from '../../repositories/index.js';
import config from '../../config/index.js';

const repository = getInvestigationRepository();

export class InvestigationService {
  async createInvestigation({ wallet_address, network, user_id = null }) {
    const investigation = {
      investigation_id: uuidv4(),
      user_id,
      wallet_address,
      network,
      status: 'PENDING',
      progress: 0,
      current_step: 'VALIDATING WALLET',
      created_at: new Date().toISOString(),
      completed_at: null,
      error: null,
      results: null,
      synthetic: Boolean(config.DEMO_MODE),
      mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
    };

    await repository.createInvestigation(investigation);
    return investigation;
  }

  async updateInvestigation(id, updates) {
    return repository.updateInvestigation(id, updates);
  }

  async listInvestigations(userId) {
    return repository.listInvestigations(userId);
  }

  async getInvestigation(id, userId) {
    const investigation = await repository.getInvestigation(id);
    if (!investigation) return null;
    if (userId !== undefined && investigation.user_id !== userId) return null;
    return investigation;
  }

  async deleteInvestigation(id, userId) {
    if (userId !== undefined && !(await this.getInvestigation(id, userId))) return false;
    return repository.deleteInvestigation(id);
  }
}

export default new InvestigationService();
