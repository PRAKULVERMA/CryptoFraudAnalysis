import config from '../../config/index.js';
import DemoProvider from './demoProvider.js';
import providerManager from '../providers/providerManager.js';

export function createBlockchainProvider() {
  if (config.DEMO_MODE) {
    console.info('[Blockchain] DEMO provider mode enabled.');
    return DemoProvider;
  }

  console.info('[Blockchain] LIVE provider mode enabled.');
  return providerManager;
}

export default createBlockchainProvider;
