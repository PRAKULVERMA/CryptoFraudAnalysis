import config from '../config/index.js';
import createBlockchainProvider from './blockchain/providerFactory.js';
import { traceWallet } from './tracing/traceService.js';
import { detectFraudPatterns } from './detection/fraudDetectionService.js';
import { calculateRiskScore } from './detection/riskService.js';

export async function detectFraud(address, network, transactions = []) {
  const normalizedNetwork = String(network || '').trim().toLowerCase();
  const provider = createBlockchainProvider();
  let traceResult = { nodes: [], edges: [], trace_summary: { transactions_analyzed: 0, wallets_discovered: 0, max_hops: 0 } }; 

  if (transactions && transactions.length > 0) {
    traceResult = {
      nodes: transactions.map((tx) => ({ id: tx.from || address, address: tx.from || address, label: tx.from || address, type: 'wallet', network: normalizedNetwork, hop: 0 })),
      edges: transactions.map((tx) => ({
        source: tx.from || address,
        target: tx.to || address,
        transaction_id: tx.hash || tx.transaction_id || `${tx.from}-${tx.to}`,
        amount: tx.amount || 0,
        timestamp: tx.timestamp || new Date().toISOString(),
        hop: 1,
      })),
      trace_summary: {
        transactions_analyzed: transactions.length,
        wallets_discovered: new Set(transactions.flatMap((tx) => [tx.from, tx.to])).size,
        max_hops: 1,
      },
    };
  } else {
    traceResult = await traceWallet(address, normalizedNetwork, provider);
  }

  const patterns = detectFraudPatterns(traceResult);
  const risk = calculateRiskScore(traceResult, patterns);

  return {
    address,
    network: normalizedNetwork,
    analyzedAt: new Date().toISOString(),
    fraudProbability: Number((risk.risk_score / 100).toFixed(2)),
    riskLevel: risk.risk_level,
    patterns: patterns.map((pattern) => ({
      id: pattern.pattern_type,
      name: pattern.pattern_type,
      confidence: pattern.confidence,
      description: pattern.evidence.join(' '),
    })),
    recommendedActions: [
      'Review transaction graph for convergence or fan-out behavior',
      'Validate wallet destination clusters',
      'Escalate if multiple suspicious edges are confirmed',
    ],
    evidenceSummary: patterns.length ? patterns.map((pattern) => pattern.evidence.join(' ')).join(' ') : 'No high-confidence suspicious pattern was identified in the traced graph.',
    synthetic: config.DEMO_MODE,
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
    risk_score: risk.risk_score,
    risk_factors: risk.factors,
  };
}
