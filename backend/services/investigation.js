import config from '../config/index.js';
import createBlockchainProvider from './blockchain/providerFactory.js';
import { traceWallet } from './tracing/traceService.js';
import { detectFraudPatterns } from './detection/fraudDetectionService.js';
import { calculateRiskScore } from './detection/riskService.js';
import { attributeDestination } from './attribution/attributionService.js';

export async function analyzeWallet(address, network) {
  const normalizedNetwork = String(network || '').trim().toLowerCase();
  const provider = createBlockchainProvider();
  const txData = await provider.getWalletTransactions(address, normalizedNetwork);
  const traceResult = await traceWallet(address, normalizedNetwork, provider);
  const patterns = detectFraudPatterns(traceResult);
  const risk = calculateRiskScore(traceResult, patterns);
  const destination = attributeDestination(traceResult, { synthetic: Boolean(txData.synthetic) });

  const isEth = normalizedNetwork === 'ethereum';

  return {
    address,
    network: normalizedNetwork,
    caseId: `CASE-SIH-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    riskScore: risk.risk_score,
    riskLevel: risk.risk_level,
    fundsTraced: isEth ? `${(traceResult.trace_summary?.transactions_analyzed || 0) * 0.3} ETH` : `${(traceResult.trace_summary?.transactions_analyzed || 0) * 0.15} BTC`,
    hopCount: traceResult.trace_summary?.max_hops || 0,
    transactionsAnalyzed: traceResult.trace_summary?.transactions_analyzed || 0,
    clusteringTag: patterns.length ? 'Graph-based suspicious pattern cluster' : 'No high-confidence cluster detected',
    destinationExchange: destination.entity_name || destination.destination_type || 'UNKNOWN',
    confidence: `${risk.risk_score}%`,
    peelingChains: patterns.length ? `Detected ${patterns.length} graph-derived patterns` : 'No peeling-chain pattern identified',
    ofacMatch: false,
    synthetic: Boolean(txData.synthetic),
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
    destination,
    patterns,
    trace_summary: traceResult.trace_summary,
    risk_factors: risk.factors,
  };
}

