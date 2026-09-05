export function calculateRiskScore(graph, patterns = []) {
  let score = 0;

  score += patterns.length * 12;
  score += Math.min((graph.trace_summary?.transactions_analyzed || 0) / 10, 25);
  score += Math.min((graph.trace_summary?.wallets_discovered || 0) * 2, 20);
  score += patterns.reduce((sum, pattern) => sum + Math.round((pattern.confidence || 0) * 20), 0);

  const clamped = Math.min(100, Math.max(0, Math.round(score)));

  let riskLevel = 'LOW';
  if (clamped >= 81) riskLevel = 'CRITICAL';
  else if (clamped >= 61) riskLevel = 'HIGH';
  else if (clamped >= 31) riskLevel = 'MEDIUM';

  return {
    risk_score: clamped,
    risk_level: riskLevel,
    factors: [
      { factor: 'Suspicious patterns', contribution: Math.min(patterns.length * 12, 30) },
      { factor: 'Graph size', contribution: Math.min((graph.trace_summary?.wallets_discovered || 0) * 2, 20) },
      { factor: 'Transaction volume', contribution: Math.min((graph.trace_summary?.transactions_analyzed || 0) / 10, 25) },
    ],
  };
}
