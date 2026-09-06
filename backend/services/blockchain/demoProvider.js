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
  const transactionId = `${network === 'ethereum' ? '0x' : ''}${randomHex(64)}`;
  const from = randomAddress(network);
  const to = randomAddress(network);
  const timestamp = new Date(Date.now() - index * 3600000).toISOString();
  const blockNumber = 800000 + index;

  return {
    transactionId,
    from,
    to,
    value: amount,
    timestamp,
    hash: transactionId,
    network,
    blockNumber,
    transaction_id: transactionId,
    amount,
    asset: network === 'ethereum' ? 'ETH' : 'BTC',
    block_height: blockNumber,
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
    const from = randomAddress(network);
    const to = randomAddress(network);
    const value = Number((Math.random() * 1.5).toFixed(6));
    const blockNumber = 800000;
    const timestamp = new Date().toISOString();

    return {
      transactionId: txHash,
      from,
      to,
      value,
      timestamp,
      hash: txHash,
      network,
      blockNumber,
      transaction_id: txHash,
      amount: value,
      asset: network === 'ethereum' ? 'ETH' : 'BTC',
      block_height: blockNumber,
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
