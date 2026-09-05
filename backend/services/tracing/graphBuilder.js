export function buildGraphFromTrace({ rootAddress, transactions = [], synthetic = false, mode = 'DEMO' }) {
  const nodes = new Map();
  const edges = [];

  const addNode = (address, type, hop = 0) => {
    if (!address) return;
    if (!nodes.has(address)) {
      nodes.set(address, {
        id: address,
        label: address,
        address,
        type,
        network: 'bitcoin',
        hop,
        synthetic,
        mode,
      });
    }
  };

  for (const tx of transactions) {
    const source = tx.from || rootAddress;
    const target = tx.to || rootAddress;
    addNode(source, 'wallet', 0);
    addNode(target, 'wallet', 1);
    edges.push({
      source,
      target,
      transaction_id: tx.transaction_id || tx.hash || `${source}-${target}`,
      amount: tx.amount || 0,
      timestamp: tx.timestamp || new Date().toISOString(),
      hop: 1,
      synthetic,
      mode,
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    trace_summary: {
      transactions_analyzed: transactions.length,
      wallets_discovered: nodes.size,
      max_hops: 1,
      synthetic,
      mode,
    },
  };
}
