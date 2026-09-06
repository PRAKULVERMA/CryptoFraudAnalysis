import config from '../../config/index.js';

export const tracingLimits = {
  maxHops: config.MAX_HOPS,
  maxWallets: Math.min(config.MAX_WALLETS, config.MAX_WALLETS_PER_INVESTIGATION),
  maxTransactionsPerWallet: config.MAX_TRANSACTIONS_PER_WALLET,
  maxTotalTransactions: Math.min(config.MAX_TRANSACTIONS, config.MAX_TOTAL_TRANSACTIONS),
};

export function createLimitGuard() {
  return {
    limits: tracingLimits,
    canVisitWallet(state, hop) {
      return hop <= tracingLimits.maxHops && state.walletsSeen.size < tracingLimits.maxWallets;
    },
    canAnalyzeTransaction(state) {
      return state.transactionsSeen.size < tracingLimits.maxTotalTransactions;
    },
    walletTransactionLimit(transactions) {
      return transactions.slice(0, tracingLimits.maxTransactionsPerWallet);
    },
  };
}
