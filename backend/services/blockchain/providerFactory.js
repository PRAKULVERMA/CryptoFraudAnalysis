import config from '../../config/index.js';
import DemoProvider from './demoProvider.js';

export function createBlockchainProvider() {
  if (config.DEMO_MODE) {
    return DemoProvider;
  }

  return {
    async getWalletTransactions() {
      throw Object.assign(new Error('Live blockchain provider is unavailable.'), {
        code: 'BLOCKCHAIN_PROVIDER_UNAVAILABLE',
        publicMessage: 'Live blockchain data provider is unavailable.',
        statusCode: 503,
      });
    },
    async getTransaction() {
      throw Object.assign(new Error('Live blockchain provider is unavailable.'), {
        code: 'BLOCKCHAIN_PROVIDER_UNAVAILABLE',
        publicMessage: 'Live blockchain data provider is unavailable.',
        statusCode: 503,
      });
    },
    async getWalletInfo() {
      throw Object.assign(new Error('Live blockchain provider is unavailable.'), {
        code: 'BLOCKCHAIN_PROVIDER_UNAVAILABLE',
        publicMessage: 'Live blockchain data provider is unavailable.',
        statusCode: 503,
      });
    },
  };
}

export default createBlockchainProvider;
