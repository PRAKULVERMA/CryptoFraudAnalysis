export function normalizeWalletAddress(address) {
  return String(address || '').trim().toLowerCase();
}

export function buildGraphFromTrace({ rootAddress, transactions = [], network = 'bitcoin', synthetic = false, mode = 'DEMO', walletHops = new Map(), maxHopsReached = 0, limitsReached = [] }) {
  const nodes = new Map();
  const edges = [];
  const rootKey = normalizeWalletAddress(rootAddress);

  const addNode = (address, type, hop = 0) => {
    if (!address) return;
    const key = normalizeWalletAddress(address);
    if (!nodes.has(key)) {
      nodes.set(key, {
        id: address,
        label: address,
        address,
        type: key === rootKey ? 'suspect' : type,
        network,
        hop,
        synthetic,
        mode,
      });
    }
  };

  addNode(rootAddress, 'suspect', 0);

  let totalOutgoingValue = 0;
  let totalIncomingValue = 0;
  let tracedOutgoingValue = 0;

  for (const tx of transactions) {
    const source = tx.from || rootAddress;
    const target = tx.to || rootAddress;
    const transactionId = tx.transactionId || tx.transaction_id || tx.hash || `${source}-${target}`;
    const value = Number(tx.value ?? tx.amount ?? 0);
    const hop = Number(tx.hop || walletHops.get(normalizeWalletAddress(source)) || 1);
    const direction = tx.direction || (normalizeWalletAddress(source) === rootKey ? 'outgoing' : normalizeWalletAddress(target) === rootKey ? 'incoming' : 'unknown');

    addNode(source, 'wallet', walletHops.get(normalizeWalletAddress(source)) || 0);
    addNode(target, 'wallet', hop);

    if (direction === 'outgoing' || direction === 'self-transfer') {
      totalOutgoingValue += value;
    }
    if (direction === 'incoming' || direction === 'self-transfer') {
      totalIncomingValue += value;
    }
    if (direction === 'outgoing') {
      tracedOutgoingValue += value;
    }

    edges.push({
      id: transactionId,
      source,
      target,
      transactionId,
      hash: tx.hash || transactionId,
      value,
      timestamp: tx.timestamp || new Date().toISOString(),
      hop,
      transaction_id: transactionId,
      amount: value,
      synthetic,
      mode,
      direction,
    });
  }

  const asset = network === 'ethereum' ? 'ETH' : 'BTC';
  const precision = tracedOutgoingValue === 0 ? 0 : tracedOutgoingValue < 0.01 ? 6 : 4;

  return {
    nodes: Array.from(nodes.values()),
    edges,
    trace_summary: {
      transactions_analyzed: transactions.length,
      wallets_discovered: nodes.size,
      max_hops: maxHopsReached,
      max_hops_reached: maxHopsReached,
      limits_reached: limitsReached,
      synthetic,
      mode,
      total_outgoing_value: totalOutgoingValue,
      total_incoming_value: totalIncomingValue,
      traced_outgoing_value: tracedOutgoingValue,
      asset,
      funds_traced: `${tracedOutgoingValue.toFixed(precision)} ${asset}`,
    },
  };
}
