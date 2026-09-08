import config from '../config/index.js';
import InvestigationRepository from './investigationRepository.js';
import MemoryRepository from './memoryRepository.js';

let repository = MemoryRepository;

if (config.MONGODB_URI) {
  const mongoRepo = InvestigationRepository;
  const memoryRepo = MemoryRepository;
  repository = {
    async createInvestigation(record) {
      try { return await mongoRepo.createInvestigation(record); }
      catch { return memoryRepo.createInvestigation(record); }
    },
    async getInvestigation(id) {
      try { return await mongoRepo.getInvestigation(id); }
      catch { return memoryRepo.getInvestigation(id); }
    },
    async listInvestigations(userId) {
      try { return await mongoRepo.listInvestigations(userId); }
      catch { return memoryRepo.listInvestigations(userId); }
    },
    async updateInvestigation(id, updates) {
      try { return await mongoRepo.updateInvestigation(id, updates); }
      catch { return memoryRepo.updateInvestigation(id, updates); }
    },
    async deleteInvestigation(id) {
      try { return await mongoRepo.deleteInvestigation(id); }
      catch { return memoryRepo.deleteInvestigation(id); }
    },
    async claimInvestigation(id) {
      try { return await mongoRepo.claimInvestigation(id); }
      catch { return memoryRepo.claimInvestigation(id); }
    },
  };
}

export function getInvestigationRepository() {
  return repository;
}

export default repository;
