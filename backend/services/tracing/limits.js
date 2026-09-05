import config from '../../config/index.js';

export const tracingLimits = {
  maxHops: config.MAX_HOPS,
  maxWallets: config.MAX_WALLETS,
  maxTransactions: config.MAX_TRANSACTIONS,
};

export function createLimitGuard() {
  return {
    canContinue(state) {
      return state.hopCount < tracingLimits.maxHops && state.walletsSeen.size < tracingLimits.maxWallets && state.transactionsSeen.size < tracingLimits.maxTransactions;
    },
  };
}
