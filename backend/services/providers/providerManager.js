import ethereumProvider from './ethereumProvider.js';
import bitcoinProvider from './bitcoinProvider.js';
import { createProviderError } from './providerErrors.js';

class ProviderManager {
  getProvider(network = 'bitcoin') {
    const normalizedNetwork = String(network || '').trim().toLowerCase();

    if (normalizedNetwork === 'ethereum') return ethereumProvider;
    if (normalizedNetwork === 'bitcoin') return bitcoinProvider;

    throw createProviderError('INVALID_ADDRESS', 'The selected blockchain network is not supported.', 422);
  }

  getWalletTransactions(address, network) {
    return this.getProvider(network).getWalletTransactions(address, network);
  }

  getTransaction(transactionId, network) {
    return this.getProvider(network).getTransaction(transactionId, network);
  }

  getWalletInfo(address, network) {
    return this.getProvider(network).getWalletInfo(address, network);
  }
}

export default new ProviderManager();
