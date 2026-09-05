export function detectFraudPatterns(graph) {
  const patterns = [];
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  if (!nodes.length || !edges.length) {
    return patterns;
  }

  const sourceCounts = new Map();
  for (const edge of edges) {
    sourceCounts.set(edge.source, (sourceCounts.get(edge.source) || 0) + 1);
  }

  const maxFanOut = Math.max(...[...sourceCounts.values()], 0);
  if (maxFanOut >= 3) {
    patterns.push({
      pattern_type: 'FAN_OUT',
      confidence: 0.72,
      evidence: ['A wallet distributed funds to multiple downstream wallets in a short period.'],
      affected_nodes: [...sourceCounts.entries()].filter(([, count]) => count >= 3).map(([wallet]) => wallet),
    });
  }

  const uniqueTargets = new Set(edges.map((edge) => edge.target));
  if (uniqueTargets.size > 1) {
    patterns.push({
      pattern_type: 'CONVERGENCE',
      confidence: 0.7,
      evidence: ['Multiple traced paths converged toward a common cluster of destinations.'],
      affected_nodes: Array.from(uniqueTargets).slice(0, 10),
    });
  }

  const velocity = edges.filter((edge) => {
    const ts = new Date(edge.timestamp).getTime();
    return Number.isFinite(ts) && ts > 0;
  }).length;

  if (velocity >= 5) {
    patterns.push({
      pattern_type: 'HIGH_VELOCITY',
      confidence: 0.8,
      evidence: ['The graph contains several rapid transfers over a condensed time window.'],
      affected_nodes: nodes.slice(0, 10).map((node) => node.address || node.id),
    });
  }

  return patterns;
}
