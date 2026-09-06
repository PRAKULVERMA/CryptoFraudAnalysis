import config from '../config/index.js';
import createBlockchainProvider from './blockchain/providerFactory.js';
import { traceWallet } from './tracing/traceService.js';
import { analyzeEvidenceRisk } from './detection/evidenceRiskService.js';
import { attributeDestination } from './attribution/attributionService.js';

export async function analyzeWallet(address, network, investigationId) {
  const normalizedNetwork = String(network || '').trim().toLowerCase();
  const provider = createBlockchainProvider();
  const txData = await provider.getWalletTransactions(address, normalizedNetwork);
  const traceResult = await traceWallet(address, normalizedNetwork, provider, investigationId);
  const risk = analyzeEvidenceRisk({
    address,
    network: normalizedNetwork,
    transactions: traceResult.edges || [],
    trace_summary: traceResult.trace_summary || {},
    investigationId: investigationId || `${address}-${normalizedNetwork}`,
  });
  const destination = attributeDestination(traceResult, { synthetic: Boolean(txData.synthetic) });

  const isEth = normalizedNetwork === 'ethereum';

  return {
    address,
    network: normalizedNetwork,
    caseId: `CASE-SIH-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    fundsTraced: traceResult.trace_summary?.funds_traced || `0 ${isEth ? 'ETH' : 'BTC'}`,
    hopCount: traceResult.trace_summary?.max_hops || 0,
    transactionsAnalyzed: traceResult.trace_summary?.transactions_analyzed || 0,
    clusteringTag: risk.patterns.length ? 'Graph-based suspicious pattern cluster' : 'No high-confidence cluster detected',
    destinationExchange: destination.entity_name || destination.destination_type || 'UNKNOWN',
    confidence: `${risk.confidence}%`,
    peelingChains: risk.patterns.length ? `Detected ${risk.patterns.length} graph-derived patterns` : 'No peeling-chain pattern identified',
    ofacMatch: false,
    synthetic: Boolean(txData.synthetic),
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
    destination,
    patterns: risk.patterns,
    trace_summary: traceResult.trace_summary,
    risk_factors: risk.riskFactors,
    evidence: risk.evidence,
    graph_analysis: risk.graph_analysis,
    destination_intelligence: {
      primary_destination: destination,
      destinations: (traceResult.edges || [])
        .filter((edge) => edge.direction === 'outgoing')
        .map((edge) => ({
          address: edge.target || edge.to,
          network: normalizedNetwork,
          transaction_id: edge.transactionId || edge.transaction_id || edge.hash,
          value: edge.value || edge.amount || 0,
          timestamp: edge.timestamp,
          direction: edge.direction,
          hop: edge.hop,
        })),
      verified_entities: destination.verification_level === 'VERIFIED' ? [destination] : [],
      unknown_destinations: destination.verification_level === 'UNKNOWN' ? [destination] : [],
      attribution_summary: {
        total_destinations: (traceResult.edges || []).filter((edge) => edge.direction === 'outgoing').length,
        attributed_count: destination.verification_level !== 'UNKNOWN' ? 1 : 0,
        unknown_count: destination.verification_level === 'UNKNOWN' ? 1 : 0,
      },
    },
  };
}

