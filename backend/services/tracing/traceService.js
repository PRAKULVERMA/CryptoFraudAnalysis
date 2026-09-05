import config from '../../config/index.js';
import { buildGraphFromTrace } from './graphBuilder.js';
import { createLimitGuard } from './limits.js';

export async function traceWallet(address, network = 'bitcoin', provider) {
  if (!provider) {
    throw Object.assign(new Error('Blockchain provider not available.'), {
      code: 'BLOCKCHAIN_PROVIDER_UNAVAILABLE',
      publicMessage: 'Live blockchain data provider is unavailable.',
      statusCode: 503,
    });
  }

  const result = await provider.getWalletTransactions(address, network);
  const graph = buildGraphFromTrace({
    rootAddress: address,
    transactions: result.transactions || [],
    synthetic: Boolean(result.synthetic),
    mode: result.mode || (config.DEMO_MODE ? 'DEMO' : 'LIVE'),
  });

  const guard = createLimitGuard();
  const state = {
    hopCount: 0,
    walletsSeen: new Set([address]),
    transactionsSeen: new Set(),
  };

  for (const tx of graph.edges) {
    state.walletsSeen.add(tx.source);
    state.walletsSeen.add(tx.target);
    state.transactionsSeen.add(tx.transaction_id);
  }

  if (!guard.canContinue(state)) {
    throw Object.assign(new Error('Trace limits exceeded.'), {
      code: 'TRACE_LIMIT_EXCEEDED',
      publicMessage: 'The investigation exceeded the configured traversal limits.',
      statusCode: 400,
    });
  }

  return {
    ...graph,
    mode: graph.trace_summary.mode,
    synthetic: Boolean(result.synthetic),
  };
}
