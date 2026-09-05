import config from '../config/index.js';
import createBlockchainProvider from './blockchain/providerFactory.js';

export async function getTransactions(address, network = 'bitcoin') {
  const provider = createBlockchainProvider();
  const data = await provider.getWalletTransactions(address, network);
  const transactions = (data.transactions || []).map((tx) => ({
    hash: tx.transaction_id,
    from: tx.from,
    to: tx.to,
    amount: tx.amount,
    currency: tx.asset,
    timestamp: tx.timestamp,
    confirmations: Math.max(1, Math.round((Date.now() - new Date(tx.timestamp).getTime()) / 60000)),
    fee: Number((tx.amount * 0.0001).toFixed(6)),
    category: tx.synthetic ? 'demo' : 'unknown',
    synthetic: Boolean(tx.synthetic),
  }));

  return {
    address,
    network,
    transactions,
    summary: {
      totalReceived: `${transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(4)} ${network === 'ethereum' ? 'ETH' : 'BTC'}`,
      totalSent: `${transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(4)} ${network === 'ethereum' ? 'ETH' : 'BTC'}`,
      balance: `${transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(4)} ${network === 'ethereum' ? 'ETH' : 'BTC'}`,
      firstSeen: transactions[0]?.timestamp || new Date().toISOString(),
    },
    synthetic: config.DEMO_MODE,
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
  };
}
