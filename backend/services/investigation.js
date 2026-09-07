import config from '../config/index.js';
import createBlockchainProvider from './blockchain/providerFactory.js';
import { traceWallet } from './tracing/traceService.js';
import { analyzeEvidenceRisk } from './detection/evidenceRiskService.js';
import { attributeDestination } from './attribution/attributionService.js';
import { attributeExchange, ATTRIBUTION_STATUS } from './attribution/exchangeAttributionService.js';
import { screenInvestigation } from './compliance/index.js';
import { buildInvestigationIntelligence } from './intelligence/intelligenceService.js';

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
  const destination = await attributeDestination(traceResult, { synthetic: Boolean(txData.synthetic) });

  let attribution;
  try {
    attribution = await attributeExchange({
      address,
      network: normalizedNetwork,
      transactions: traceResult.edges || [],
      trace: traceResult,
      trace_summary: traceResult.trace_summary || {},
    });
  } catch (error) {
    attribution = {
      entity: null,
      entityType: null,
      attributionStatus: ATTRIBUTION_STATUS.UNAVAILABLE,
      confidence: 0,
      evidence: [],
      source: null,
      data_source: 'NONE',
      network: normalizedNetwork,
      address,
      note: 'Attribution service failed; investigation continues.',
      synthetic: false,
      mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
      error: { message: String(error?.message || error), retryable: true },
    };
  }

  const compliance_screening = await screenInvestigation({
    rootAddress: address,
    network: normalizedNetwork,
    graph: traceResult,
    destination,
  });

  let investigation_intelligence;
  try {
    investigation_intelligence = await buildInvestigationIntelligence({
      nodes: traceResult.nodes || [],
      edges: traceResult.edges || [],
      trace_summary: traceResult.trace_summary || {},
      attribution,
      destination,
      compliance_screening,
      limits_reached: traceResult.trace_summary?.limits_reached || [],
      network: normalizedNetwork,
      rootAddress: address,
    });
  } catch {
    investigation_intelligence = {
      status: 'UNAVAILABLE',
      reason: 'Intelligence analysis failed.',
      evidence_confidence: 0,
    };
  }

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
    ofacMatch: compliance_screening.summary.matches > 0,
    synthetic: Boolean(txData.synthetic),
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
    destination,
    attribution,
    patterns: risk.patterns,
    nodes: Array.isArray(traceResult.nodes) ? traceResult.nodes : [],
    edges: Array.isArray(traceResult.edges) ? traceResult.edges : [],
    trace_summary: traceResult.trace_summary,
    risk_factors: risk.riskFactors,
    evidence: risk.evidence,
    graph_analysis: risk.graph_analysis,
    investigation_intelligence,
    destination_intelligence: {
      primary_destination: destination,
      attribution,
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
      verified_entities: attribution.attributionStatus === ATTRIBUTION_STATUS.VERIFIED ? [attribution] : [],
      unknown_destinations: attribution.attributionStatus === ATTRIBUTION_STATUS.UNKNOWN ? [attribution] : [],
      attribution_summary: {
        total_destinations: (traceResult.edges || []).filter((edge) => edge.direction === 'outgoing').length,
        attributed_count: attribution.attributionStatus === ATTRIBUTION_STATUS.VERIFIED || attribution.attributionStatus === ATTRIBUTION_STATUS.SUPPORTED ? 1 : 0,
        unknown_count: attribution.attributionStatus === ATTRIBUTION_STATUS.UNKNOWN ? 1 : 0,
        status: attribution.attributionStatus,
      },
    },
    compliance_screening,
  };
}

