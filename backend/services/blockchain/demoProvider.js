import config from '../../config/index.js';

function randomHex(length) {
  return Array.from({ length }).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randomAddress(network) {
  if (network === 'ethereum') return '0x' + randomHex(40);
  const prefixes = ['1', '3', 'bc1'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return prefix + randomHex(34);
}

function makeTx(network, index) {
  const amount = Number((Math.random() * 3 + 0.05).toFixed(6));
  return {
    transaction_id: `${network === 'ethereum' ? '0x' : ''}${randomHex(64)}`,
    from: randomAddress(network),
    to: randomAddress(network),
    amount,
    asset: network === 'ethereum' ? 'ETH' : 'BTC',
    timestamp: new Date(Date.now() - index * 3600000).toISOString(),
    block_height: 800000 + index,
    network,
    synthetic: true,
    demo: true,
  };
}

export class DemoProvider {
  async getWalletTransactions(address, network = 'bitcoin') {
    const txCount = config.MAX_TRANSACTIONS > 0 ? Math.min(config.MAX_TRANSACTIONS, 12) : 12;
    const transactions = Array.from({ length: txCount }).map((_, i) => makeTx(network, i + 1));
    return {
      address,
      network,
      transactions,
      synthetic: true,
      mode: 'DEMO',
    };
  }

  async getTransaction(txHash, network = 'bitcoin') {
    return {
      transaction_id: txHash,
      from: randomAddress(network),
      to: randomAddress(network),
      amount: Number((Math.random() * 1.5).toFixed(6)),
      asset: network === 'ethereum' ? 'ETH' : 'BTC',
      timestamp: new Date().toISOString(),
      block_height: 800000,
      network,
      synthetic: true,
      mode: 'DEMO',
    };
  }

  async getWalletInfo(address, network = 'bitcoin') {
    return {
      address,
      network,
      balance: network === 'ethereum' ? '1.42 ETH' : '0.34 BTC',
      transaction_count: 16,
      synthetic: true,
      mode: 'DEMO',
    };
  }
}

export default new DemoProvider();
