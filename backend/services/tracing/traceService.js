import config from '../../config/index.js';
import { buildGraphFromTrace } from './graphBuilder.js';
import { createLimitGuard } from './limits.js';
import { normalizeWalletAddress } from './graphBuilder.js';
import neo4jGraphService from '../graph/neo4jGraphService.js';
import { createProviderMetrics } from '../providers/providerHttp.js';
import { describeProviderError } from '../providers/providerErrors.js';

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
  const fetchedWallets = new Set();
  const walletHops = new Map([[rootKey, 0]]);
  const transactionsSeen = new Set();
  const transactions = [];
  const limitsReached = new Set();
  const providerMetrics = createProviderMetrics();
  let maxHopsReached = 0;
  let mode = config.DEMO_MODE ? 'DEMO' : 'LIVE';
  let synthetic = Boolean(config.DEMO_MODE);
  let firstError = null;
  let rootFetched = false;

  const diagnostics = {
    configured_limits: {
      maxHops: guard.limits.maxHops,
      maxWallets: guard.limits.maxWallets,
      maxTransactionsPerWallet: guard.limits.maxTransactionsPerWallet,
      maxTotalTransactions: guard.limits.maxTotalTransactions,
      providerTimeoutMs: config.BLOCKCHAIN_PROVIDER_TIMEOUT,
      providerMaxRetries: config.BLOCKCHAIN_PROVIDER_MAX_RETRIES,
    },
    provider_requests: 0,
    provider_retries: 0,
    provider_timeouts: 0,
    provider_failure_count: 0,
    provider_failures: [],
    provider_timeout: false,
    provider_tx_count: 0,
    transactions_fetched: 0,
    transactions_accepted: 0,
    transactions_skipped: [],
    wallets_discovered: 0,
    wallets_skipped: [],
    wallet_hops: { [rootKey]: 0 },
    max_hops_reached: 0,
    limits_reached: [],
    partial: false,
    mode,
    synthetic,
    pagination_pages_processed: {},
  };

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.hop >= guard.limits.maxHops) {
      limitsReached.add('MAX_HOPS');
      maxHopsReached = Math.max(maxHopsReached, current.hop);
      continue;
    }

    if (fetchedWallets.has(current.key)) {
      diagnostics.wallets_skipped.push({ address: current.address, key: current.key, hop: current.hop, reason: 'ALREADY_FETCHED' });
      continue;
    }
    fetchedWallets.add(current.key);

    let result;
    try {
      result = await provider.getWalletTransactions(current.address, network, { metrics: providerMetrics });
      if (current.hop === 0) rootFetched = true;
      diagnostics.provider_requests += 1;
      diagnostics.transactions_fetched += (result.transactions || []).length;
      diagnostics.provider_tx_count += Number(result.provider_tx_count || 0) || (result.transactions || []).length;
      const pages = Number(result.pagination?.pages || 0) || 1;
      diagnostics.pagination_pages_processed[current.key] = pages;
      if (result.pagination?.truncated) limitsReached.add('MAX_TRANSACTIONS_PER_WALLET');
      mode = result.mode || mode;
      synthetic = Boolean(result.synthetic);
    } catch (error) {
      if (current.hop === 0 || !rootFetched) throw error;
      firstError ||= error;
      const described = describeProviderError(error);
      diagnostics.provider_failures.push({
        address: current.address,
        key: current.key,
        hop: current.hop,
        code: described.code,
        provider: described.provider,
        network: described.network || network,
        status: described.status,
        retryable: described.retryable,
        attempts: described.attempts,
        message: described.message,
        timed_out: described.code === 'PROVIDER_TIMEOUT',
      });
      if (described.code === 'PROVIDER_TIMEOUT') diagnostics.provider_timeout = true;
      continue;
    }

    const fetchedTxs = result.transactions || [];
    let walletTxs = fetchedTxs;
    if (!config.INCLUDE_UNCONFIRMED_TRANSACTIONS) {
      const dropped = fetchedTxs.filter((tx) => tx.status === 'unconfirmed');
      walletTxs = fetchedTxs.filter((tx) => tx.status !== 'unconfirmed');
      for (const tx of dropped) {
        const tid = tx.transactionId || tx.transaction_id || tx.hash || `${tx.from}-${tx.to}`;
        diagnostics.transactions_skipped.push({ transactionId: tid, reason: 'UNCONFIRMED_EXCLUDED' });
      }
    }
    const walletTransactions = guard.walletTransactionLimit(walletTxs);
    if (walletTxs.length > walletTransactions.length) {
      limitsReached.add('MAX_TRANSACTIONS_PER_WALLET');
    }

    for (const transaction of walletTransactions) {
      const transactionId = transaction.transactionId || transaction.transaction_id || transaction.hash || `${transaction.from}-${transaction.to}`;
      if (transactionsSeen.has(transactionId)) {
        diagnostics.transactions_skipped.push({ transactionId, reason: 'DUPLICATE' });
        continue;
      }
      if (!guard.canAnalyzeTransaction({ transactionsSeen })) {
        diagnostics.transactions_skipped.push({ transactionId, reason: 'MAX_TOTAL_TRANSACTIONS' });
        limitsReached.add('MAX_TOTAL_TRANSACTIONS');
        break;
      }

      transactionsSeen.add(transactionId);
      diagnostics.transactions_accepted += 1;
      const direction = getTransactionDirection(transaction, current.key);
      transactions.push({ ...transaction, transactionId, transaction_id: transactionId, hop: current.hop + 1, direction });
      maxHopsReached = Math.max(maxHopsReached, current.hop + 1);
      diagnostics.max_hops_reached = maxHopsReached;

      const followBothDirections = synthetic === true;
      if (followBothDirections || direction === 'outgoing') {
        const nextHop = transaction.to;
        const nextKey = normalizeWalletAddress(nextHop);
        if (!nextKey || nextKey === current.key || visitedWallets.has(nextKey)) continue;
        if (!guard.canVisitWallet({ walletsSeen: visitedWallets }, current.hop + 1)) {
          diagnostics.wallets_skipped.push({ address: nextHop, key: nextKey, hop: current.hop + 1, reason: 'MAX_WALLETS_PER_INVESTIGATION' });
          diagnostics.transactions_skipped.push({ transactionId, reason: 'MAX_WALLETS_PER_INVESTIGATION' });
          limitsReached.add('MAX_WALLETS_PER_INVESTIGATION');
          break;
        }

        visitedWallets.add(nextKey);
        walletHops.set(nextKey, current.hop + 1);
        diagnostics.wallet_hops[nextKey] = current.hop + 1;
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

  const isPartial = !!firstError;
  graph.trace_summary.partial = isPartial;
  if (firstError) {
    const described = describeProviderError(firstError);
    graph.trace_summary.provider_error = described.code;
    graph.trace_summary.provider_error_detail = described;
    graph.trace_summary.failed_wallet = diagnostics.provider_failures[0]?.address || null;
    graph.trace_summary.provider = described.provider || null;
    graph.trace_summary.network = described.network || network;
  }

  diagnostics.wallets_discovered = visitedWallets.size;
  diagnostics.transactions_analyzed = transactions.length;
  diagnostics.max_hops_reached = maxHopsReached;
  diagnostics.provider_retries = providerMetrics.provider_retries;
  diagnostics.provider_timeouts = providerMetrics.provider_timeouts;
  diagnostics.provider_failure_count = providerMetrics.provider_failure_count;
  diagnostics.provider_timeout = diagnostics.provider_timeout || providerMetrics.provider_timeouts > 0;
  if (diagnostics.provider_failures.length === 0) {
    diagnostics.failed_wallet = null;
  } else {
    diagnostics.failed_wallet = {
      address: diagnostics.provider_failures[0].address,
      hop: diagnostics.provider_failures[0].hop,
      provider: diagnostics.provider_failures[0].provider,
      network: diagnostics.provider_failures[0].network,
      code: diagnostics.provider_failures[0].code,
      status: diagnostics.provider_failures[0].status,
      retryable: diagnostics.provider_failures[0].retryable,
    };
  }
  diagnostics.limits_reached = Array.from(limitsReached);
  diagnostics.limits_reached_detail = {
    max_hops: limitsReached.has('MAX_HOPS'),
    max_wallets: limitsReached.has('MAX_WALLETS_PER_INVESTIGATION'),
    max_transactions_per_wallet: limitsReached.has('MAX_TRANSACTIONS_PER_WALLET'),
    max_total_transactions: limitsReached.has('MAX_TOTAL_TRANSACTIONS'),
  };
  diagnostics.partial = isPartial;
  diagnostics.mode = mode;
  diagnostics.synthetic = synthetic;
  graph.tracing_diagnostics = diagnostics;

  if (isPartial) {
    console.warn(`[traceWallet] PARTIAL/LIMITED trace address=${rootAddress} network=${network} mode=${mode} synthetic=${synthetic} txs_fetched=${diagnostics.transactions_fetched} txs_accepted=${diagnostics.transactions_accepted} wallets_discovered=${diagnostics.wallets_discovered} max_hops=${maxHopsReached} provider_requests=${diagnostics.provider_requests} provider_retries=${diagnostics.provider_retries} provider_timeouts=${diagnostics.provider_timeouts} failed_wallet=${diagnostics.failed_wallet?.address || 'unknown'} failed_code=${diagnostics.failed_wallet?.code || 'unknown'} limits=${Array.from(limitsReached)}`);
  } else {
    console.log(`[traceWallet] trace complete address=${rootAddress} network=${network} mode=${mode} synthetic=${synthetic} txs_accepted=${diagnostics.transactions_accepted} wallets_discovered=${diagnostics.wallets_discovered} max_hops=${maxHopsReached} provider_requests=${diagnostics.provider_requests} pages=${JSON.stringify(diagnostics.pagination_pages_processed)}`);
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
