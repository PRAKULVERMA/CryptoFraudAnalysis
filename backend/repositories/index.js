import config from '../config/index.js';
import MemoryRepository from './memoryRepository.js';

let repository = MemoryRepository;

if (config.MONGODB_URI) {
  console.warn('MongoDB URI configured but no live Mongo repository is implemented in this backend build. Using in-memory investigation storage.');
}

export function getInvestigationRepository() {
  return repository;
}

export default repository;
