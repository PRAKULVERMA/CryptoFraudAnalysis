import config from '../config/index.js';
import InvestigationRepository from './investigationRepository.js';
import MemoryRepository from './memoryRepository.js';

let repository = MemoryRepository;

if (config.MONGODB_URI) {
  repository = InvestigationRepository;
}

export function getInvestigationRepository() {
  return repository;
}

export default repository;
