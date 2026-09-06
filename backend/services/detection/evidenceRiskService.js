import neo4jGraphService from '../graph/neo4jGraphService.js';

function normalizeValue(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

function safeDate(timestamp) {
  if (!timestamp) return null;
  const ts = new Date(timestamp).getTime();
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

function clampScore(score) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function severityFromScore(score) {
  if (score >= 40) return 'critical';
  if (score >= 25) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}

export async function analyzeEvidenceRisk({ address, network, transactions = [], trace_summary = {}, investigationId }) {
  const edges = (transactions || []).filter((tx) => tx && (tx.direction || tx.from || tx.to));
  const incoming = edges.filter((tx) => tx.direction === 'incoming');
  const outgoing = edges.filter((tx) => tx.direction === 'outgoing');
  const selfTransfer = edges.filter((tx) => tx.direction === 'self-transfer');

  const incomingValue = incoming.reduce((sum, tx) => sum + normalizeValue(tx.value), 0);
  const outgoingValue = outgoing.reduce((sum, tx) => sum + normalizeValue(tx.value), 0);
  const totalValue = incomingValue + outgoingValue + selfTransfer.reduce((sum, tx) => sum + normalizeValue(tx.value), 0);

  const uniqueIncomingSources = new Set(incoming.map((tx) => tx.from).filter(Boolean)).size;
  const uniqueOutgoingTargets = new Set(outgoing.map((tx) => tx.to).filter(Boolean)).size;

  const timestamps = edges.map((tx) => safeDate(tx.timestamp)).filter(Boolean).sort((a, b) => a - b);
  const timeSpanMs = timestamps.length >= 2 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;
  const velocity = timeSpanMs > 0 ? (edges.length / timeSpanMs) * 3600000 : edges.length > 0 ? edges.length : 0;

  const signals = [];
  let score = 0;

  if (incoming.length > 0 && outgoing.length > 0) {
    const rapidPairs = [];
    for (const inTx of incoming) {
      const inTs = safeDate(inTx.timestamp);
      if (!inTs) continue;
      const followUps = outgoing.filter((outTx) => {
        const outTs = safeDate(outTx.timestamp);
        if (!outTs) return false;
        const delay = (outTs - inTs) / 1000;
        return delay > 0 && delay <= 3600 && normalizeValue(outTx.value) > 0;
      });

      if (followUps.length > 0) {
        const best = followUps.reduce((min, tx) => {
          const delay = (safeDate(tx.timestamp) - inTs) / 1000;
          return delay < min.delay ? { delay, tx } : min;
        }, { delay: Infinity, tx: null });

        if (best.tx) {
          rapidPairs.push({
            tx_hash: best.tx.hash || best.tx.transactionId || best.tx.transaction_id,
            delay_seconds: Math.round(best.delay),
            value: normalizeValue(best.tx.value),
          });
        }
      }
    }

    if (rapidPairs.length > 0) {
      const signalScore = Math.min(25, rapidPairs.length * 10 + 5);
      score += signalScore;
      signals.push({
        code: 'RAPID_FORWARDING',
        score: signalScore,
        severity: severityFromScore(signalScore),
        description: 'Funds were forwarded to another address shortly after receipt.',
        evidence: rapidPairs.slice(0, 5),
      });
    }
  }

  const maxHops = Number(trace_summary.max_hops || trace_summary.max_hops_reached || 0);
  if (maxHops >= 3) {
    const signalScore = Math.min(20, (maxHops - 2) * 7);
    score += signalScore;
    signals.push({
      code: 'MULTI_HOP_CHAIN',
      score: signalScore,
      severity: severityFromScore(signalScore),
      description: `Funds moved through ${maxHops} sequential hops.`,
      evidence: {
        max_hops: maxHops,
      },
    });
  }

  if (incomingValue > 0 && outgoingValue > 0) {
    const ratio = outgoingValue / incomingValue;
    if (ratio >= 0.8) {
      const signalScore = Math.min(20, Math.round(ratio * 15));
      score += signalScore;
      signals.push({
        code: 'HIGH_OUTFLOW_RATIO',
        score: signalScore,
        severity: severityFromScore(signalScore),
        description: 'A large portion of received funds was forwarded onward.',
        evidence: {
          incoming_value: incomingValue,
          outgoing_value: outgoingValue,
          ratio: Number(ratio.toFixed(4)),
        },
      });
    }
  }

  if (uniqueOutgoingTargets >= 4) {
    const signalScore = Math.min(15, uniqueOutgoingTargets * 3);
    score += signalScore;
    signals.push({
      code: 'HIGH_FAN_OUT',
      score: signalScore,
      severity: severityFromScore(signalScore),
      description: 'Funds were distributed to many distinct destinations.',
      evidence: {
        distinct_targets: uniqueOutgoingTargets,
      },
    });
  }

  if (uniqueIncomingSources >= 4) {
    const signalScore = Math.min(10, uniqueIncomingSources * 2);
    score += signalScore;
    signals.push({
      code: 'HIGH_FAN_IN',
      score: signalScore,
      severity: severityFromScore(signalScore),
      description: 'Funds arrived from many distinct sources.',
      evidence: {
        distinct_sources: uniqueIncomingSources,
      },
    });
  }

  const outgoingCount = outgoing.length;
  if (outgoingCount >= 5) {
    const avgOutgoingValue = outgoingCount > 0 ? outgoingValue / outgoingCount : 0;
    if (avgOutgoingValue < (totalValue * 0.1)) {
      const signalScore = Math.min(10, outgoingCount * 2);
      score += signalScore;
      signals.push({
        code: 'VALUE_FRAGMENTATION',
        score: signalScore,
        severity: severityFromScore(signalScore),
        description: 'Outgoing funds were split into many small transfers.',
        evidence: {
          outgoing_transactions: outgoingCount,
          average_outgoing_value: Number(avgOutgoingValue.toFixed(6)),
        },
      });
    }
  }

  const repeatedTargets = new Map();
  for (const tx of outgoing) {
    const target = tx.to;
    if (!target) continue;
    repeatedTargets.set(target, (repeatedTargets.get(target) || 0) + 1);
  }
  const maxRepeats = Math.max(...[...repeatedTargets.values()], 0);
  if (maxRepeats >= 3) {
    const signalScore = Math.min(10, maxRepeats * 2);
    score += signalScore;
    signals.push({
      code: 'REPEATED_FORWARDING',
      score: signalScore,
      severity: severityFromScore(signalScore),
      description: 'Funds were repeatedly forwarded to the same destination.',
      evidence: {
        destination: [...repeatedTargets.entries()].find(([, count]) => count === maxRepeats)?.[0],
        count: maxRepeats,
      },
    });
  }

  if (velocity > 10) {
    const signalScore = Math.min(10, Math.round(velocity / 10));
    score += signalScore;
    signals.push({
      code: 'HIGH_VELOCITY',
      score: signalScore,
      severity: severityFromScore(signalScore),
      description: 'A high frequency of transactions was observed in a short time window.',
      evidence: {
        transactions_per_hour: Number(velocity.toFixed(2)),
        time_span_hours: Number((timeSpanMs / 3600000).toFixed(2)),
      },
    });
  }

  const graphAnalysis = {
    provider: 'memory',
    status: 'ACTIVE',
    reason: 'Neo4j not enabled or unavailable',
  };

  if (investigationId) {
    try {
      const cycleResult = await neo4jGraphService.detectCycles(investigationId);
      if (cycleResult && cycleResult.detected) {
        const cycleScore = Math.min(cycleResult.score, 25);
        score += cycleScore;
        signals.push({
          code: cycleResult.signal || 'CIRCULAR_FLOW',
          score: cycleScore,
          severity: severityFromScore(cycleScore),
          description: `Detected ${cycleResult.evidence?.cycle_count || 1} circular flow(s) in the transaction graph.`,
          evidence: cycleResult.evidence || {},
        });
        graphAnalysis = { ...graphAnalysis, cycles_detected: true };
      }

      const convergenceResult = await neo4jGraphService.detectConvergence(investigationId);
      if (convergenceResult && convergenceResult.detected) {
        const convergenceScore = Math.min(convergenceResult.score, 20);
        score += convergenceScore;
        signals.push({
          code: convergenceResult.signal || 'FLOW_CONVERGENCE',
          score: convergenceScore,
          severity: severityFromScore(convergenceScore),
          description: `Detected ${convergenceResult.evidence?.convergence_count || 1} flow convergence point(s).`,
          evidence: convergenceResult.evidence || {},
        });
        graphAnalysis = { ...graphAnalysis, convergence_detected: true };
      }
    } catch {
      graphAnalysis = {
        provider: 'memory',
        status: 'FALLBACK',
        reason: 'Neo4j analysis failed',
      };
    }
  }

  const finalScore = clampScore(score);

  let riskLevel = 'LOW';
  if (finalScore >= 75) riskLevel = 'CRITICAL';
  else if (finalScore >= 50) riskLevel = 'HIGH';
  else if (finalScore >= 25) riskLevel = 'MEDIUM';

  const hasTimestamps = timestamps.length === edges.length;
  const hasValues = edges.every((tx) => normalizeValue(tx.value) > 0 || tx.direction === 'incoming');
  const confidence = calculateConfidence({
    transactionCount: edges.length,
    traceDepth: maxHops,
    hasTimestamps,
    hasValues,
    isPartial: Boolean(trace_summary.partial),
  });

  return {
    riskScore: finalScore,
    riskLevel,
    riskFactors: signals.map((signal) => ({
      factor: signal.description,
      contribution: signal.score,
      code: signal.code,
      severity: signal.severity,
      evidence: signal.evidence,
    })),
    patterns: signals.map((signal) => ({
      pattern_type: signal.code,
      confidence: Number((signal.score / 100).toFixed(2)),
      evidence: [signal.description],
      affected_nodes: [],
    })),
    evidence: {
      signals,
    },
    confidence,
    graph_analysis: graphAnalysis,
  };
}

function calculateConfidence({ transactionCount, traceDepth, hasTimestamps, hasValues, isPartial }) {
  let confidence = 50;

  if (transactionCount >= 10) confidence += 15;
  else if (transactionCount >= 5) confidence += 10;
  else if (transactionCount >= 1) confidence += 5;

  if (traceDepth >= 3) confidence += 15;
  else if (traceDepth >= 2) confidence += 10;
  else if (traceDepth >= 1) confidence += 5;

  if (hasTimestamps) confidence += 10;
  if (hasValues) confidence += 10;

  if (isPartial) confidence -= 15;

  return Math.min(100, Math.max(0, confidence));
}

export default { analyzeEvidenceRisk };
