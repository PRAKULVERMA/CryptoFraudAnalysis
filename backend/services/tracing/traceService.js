import config from '../../config/index.js';
import { buildGraphFromTrace } from './graphBuilder.js';
import { createLimitGuard } from './limits.js';
import { normalizeWalletAddress } from './graphBuilder.js';
import neo4jGraphService from '../graph/neo4jGraphService.js';

function getTransactionDirection(transaction, walletKey) {
  const direction = transaction.direction;
  if (direction) return direction;

  const fromKey = normalizeWalletAddress(transaction.from);
  const toKey = normalizeWalletAddress(transaction.to);

  if (fromKey === walletKey && toKey === walletKey) return 'self-transfer';
  if (fromKey === walletKey) return 'outgoing';
  if (toKey === walletKey) return 'incoming';
  return 'unknown';
}

export async function traceWallet(address, network = 'bitcoin', provider, investigationId) {
  if (!provider) {
    throw Object.assign(new Error('Blockchain provider not available.'), {
      code: 'BLOCKCHAIN_PROVIDER_UNAVAILABLE',
      publicMessage: 'Live blockchain data provider is unavailable.',
      statusCode: 503,
    });
  }

  const guard = createLimitGuard();
  const rootAddress = String(address || '').trim();
  const rootKey = normalizeWalletAddress(rootAddress);
  const queue = [{ address: rootAddress, key: rootKey, hop: 0 }];
  const visitedWallets = new Set([rootKey]);
  const walletHops = new Map([[rootKey, 0]]);
  const transactionsSeen = new Set();
  const transactions = [];
  const limitsReached = new Set();
  let maxHopsReached = 0;
  let mode = config.DEMO_MODE ? 'DEMO' : 'LIVE';
  let synthetic = Boolean(config.DEMO_MODE);
  let firstError = null;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.hop >= guard.limits.maxHops) {
      limitsReached.add('MAX_HOPS');
      maxHopsReached = Math.max(maxHopsReached, current.hop);
      continue;
    }

    let result;
    try {
      result = await provider.getWalletTransactions(current.address, network);
      mode = result.mode || mode;
      synthetic = Boolean(result.synthetic);
    } catch (error) {
      if (!firstError && transactions.length === 0) throw error;
      firstError ||= error;
      continue;
    }

    const walletTransactions = guard.walletTransactionLimit(result.transactions || []);
    if ((result.transactions || []).length > walletTransactions.length) {
      limitsReached.add('MAX_TRANSACTIONS_PER_WALLET');
    }

    for (const transaction of walletTransactions) {
      const transactionId = transaction.transactionId || transaction.transaction_id || transaction.hash || `${transaction.from}-${transaction.to}`;
      if (transactionsSeen.has(transactionId)) continue;
      if (!guard.canAnalyzeTransaction({ transactionsSeen })) {
        limitsReached.add('MAX_TOTAL_TRANSACTIONS');
        break;
      }

      transactionsSeen.add(transactionId);
      const direction = getTransactionDirection(transaction, current.key);
      transactions.push({ ...transaction, transactionId, transaction_id: transactionId, hop: current.hop + 1, direction });
      maxHopsReached = Math.max(maxHopsReached, current.hop + 1);

      const followBothDirections = synthetic === true;
      if (followBothDirections || direction === 'outgoing') {
        const nextHop = transaction.to;
        const nextKey = normalizeWalletAddress(nextHop);
        if (!nextKey || nextKey === current.key || visitedWallets.has(nextKey)) continue;
        if (!guard.canVisitWallet({ walletsSeen: visitedWallets }, current.hop + 1)) {
          limitsReached.add('MAX_WALLETS_PER_INVESTIGATION');
          break;
        }

        visitedWallets.add(nextKey);
        walletHops.set(nextKey, current.hop + 1);
        queue.push({ address: nextHop, key: nextKey, hop: current.hop + 1 });
      }
    }

    if (transactionsSeen.size >= guard.limits.maxTotalTransactions) {
      limitsReached.add('MAX_TOTAL_TRANSACTIONS');
      break;
    }
  };

  const graph = buildGraphFromTrace({
    rootAddress,
    transactions,
    network,
    walletHops,
    maxHopsReached,
    limitsReached: Array.from(limitsReached),
    synthetic,
    mode,
  });

  graph.trace_summary.wallets_discovered = visitedWallets.size;
  graph.trace_summary.transactions_analyzed = transactions.length;
  graph.trace_summary.max_hops_reached = maxHopsReached;
  graph.trace_summary.limits_reached = Array.from(limitsReached);
  graph.tracing_stats = {
    wallets_discovered: visitedWallets.size,
    transactions_analyzed: transactions.length,
    max_hops_reached: maxHopsReached,
    limits_reached: Array.from(limitsReached),
  };

  if (firstError) {
    graph.trace_summary.partial = true;
    graph.trace_summary.provider_error = firstError.code || 'BLOCKCHAIN_API_ERROR';
  }

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  let graphAnalysis = {
    provider: 'memory',
    status: 'ACTIVE',
    reason: 'Neo4j not enabled or unavailable',
  };

  try {
    const stored = await neo4jGraphService.storeInvestigationGraph(
      investigationId || `${rootAddress}-${network}`,
      rootAddress,
      network,
      nodes,
      edges
    );
    if (stored) {
      graphAnalysis = {
        provider: 'neo4j',
        status: 'AVAILABLE',
      };
    }
  } catch {
    graphAnalysis = {
      provider: 'memory',
      status: 'FALLBACK',
      reason: 'Neo4j unavailable',
    };
  }

  return {
    ...graph,
    mode: graph.trace_summary.mode,
    synthetic,
    graph_analysis: graphAnalysis,
  };
}
