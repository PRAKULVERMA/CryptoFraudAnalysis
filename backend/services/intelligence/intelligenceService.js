import config from '../../config/index.js';
import { normalizeWalletAddress } from '../tracing/graphBuilder.js';

const ALLOWED_NETWORKS = new Set(['ethereum', 'bitcoin']);

function normalizeValue(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

function safeDate(timestamp) {
  if (!timestamp) return null;
  const ts = new Date(timestamp).getTime();
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

function clampInt(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function truncateString(str, maxLength) {
  if (typeof str !== 'string') return str;
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

function validateNetwork(network) {
  const normalized = String(network || '').trim().toLowerCase();
  return ALLOWED_NETWORKS.has(normalized) ? normalized : null;
}

function validateAddress(address) {
  const str = String(address || '').trim();
  if (!str || str.length > 128) return null;
  return str;
}

function safeSortTimestamps(a, b) {
  const ta = safeDate(a);
  const tb = safeDate(b);
  if (!ta && !tb) return 0;
  if (!ta) return 1;
  if (!tb) return -1;
  return ta - tb;
}

function buildEvidenceItem(tx) {
  return {
    tx_hash: truncateString(tx.hash || tx.transactionId || tx.transaction_id || '', 128),
    from: truncateString(tx.source || tx.from || '', 128),
    to: truncateString(tx.target || tx.to || '', 128),
    timestamp: tx.timestamp || null,
    value: normalizeValue(tx.value ?? tx.amount ?? 0),
    network: truncateString(tx.network || '', 32),
  };
}

function buildWalletProfile(walletAddress, edges, rootAddress, allWallets, traceDepth) {
  const key = normalizeWalletAddress(walletAddress);
  const walletEdges = edges.filter((tx) => {
    const fromKey = normalizeWalletAddress(tx.source || tx.from || '');
    const toKey = normalizeWalletAddress(tx.target || tx.to || '');
    return fromKey === key || toKey === key;
  });

  const incoming = walletEdges.filter((tx) => {
    const toKey = normalizeWalletAddress(tx.target || tx.to || '');
    return toKey === key && tx.direction === 'incoming';
  });
  const outgoing = walletEdges.filter((tx) => {
    const fromKey = normalizeWalletAddress(tx.source || tx.from || '');
    return fromKey === key && tx.direction === 'outgoing';
  });

  const incomingValue = incoming.reduce((sum, tx) => sum + normalizeValue(tx.value), 0);
  const outgoingValue = outgoing.reduce((sum, tx) => sum + normalizeValue(tx.value), 0);
  const uniqueIncomingSources = new Set(incoming.map((tx) => tx.source || tx.from).filter(Boolean)).size;
  const uniqueOutgoingDestinations = new Set(outgoing.map((tx) => tx.target || tx.to).filter(Boolean)).size;

  const timestamps = walletEdges.map((tx) => safeDate(tx.timestamp)).filter(Boolean).sort((a, b) => a - b);
  const firstSeen = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : null;
  const lastSeen = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : null;
  const activityDurationMs = timestamps.length >= 2 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;
  const activityDurationMinutes = activityDurationMs > 0 ? Math.round(activityDurationMs / 60000) : 0;
  const transactionFrequency = activityDurationMs > 0 ? Number((walletEdges.length / (activityDurationMs / 3600000)).toFixed(2)) : walletEdges.length > 0 ? walletEdges.length : 0;

  const isRoot = normalizeWalletAddress(walletAddress) === normalizeWalletAddress(rootAddress);
  const hop = allWallets.find((w) => normalizeWalletAddress(w.address || w.id || '') === key)?.hop ?? (isRoot ? 0 : traceDepth);

  const repeatedTargets = new Map();
  for (const tx of outgoing) {
    const target = tx.target || tx.to;
    if (!target) continue;
    repeatedTargets.set(target, (repeatedTargets.get(target) || 0) + 1);
  }
  const maxRepeatedTargetCount = Math.max(0, ...[...repeatedTargets.values()]);
  const forwardingBehavior = outgoing.length > 0 && incoming.length > 0;
  const fragmentationBehavior = outgoing.length >= 5 && outgoingValue > 0 && outgoingValue / outgoing.length < outgoingValue * 0.1;

  return {
    wallet: walletAddress,
    hop,
    is_root: isRoot,
    incoming_transaction_count: incoming.length,
    outgoing_transaction_count: outgoing.length,
    incoming_value: incomingValue,
    outgoing_value: outgoingValue,
    unique_incoming_sources: uniqueIncomingSources,
    unique_outgoing_destinations: uniqueOutgoingDestinations,
    fan_in: uniqueIncomingSources,
    fan_out: uniqueOutgoingDestinations,
    first_seen: firstSeen,
    last_seen: lastSeen,
    activity_duration_minutes: activityDurationMinutes,
    transaction_frequency_per_hour: transactionFrequency,
    forwarding_behavior: forwardingBehavior,
    repeated_destination_behavior: maxRepeatedTargetCount >= 3,
    repeated_destination_count: maxRepeatedTargetCount,
    fragmentation_behavior: fragmentationBehavior,
    hop_depth: hop,
  };
}

function detectBehavioralPatterns(edges, walletProfiles, rootAddress) {
  const patterns = [];
  const seenPatterns = new Set();

  const incoming = edges.filter((tx) => tx.direction === 'incoming');
  const outgoing = edges.filter((tx) => tx.direction === 'outgoing');
  const rootKey = normalizeWalletAddress(rootAddress);

  for (const inTx of incoming) {
    const inTs = safeDate(inTx.timestamp);
    if (!inTs) continue;

    const followUps = outgoing.filter((outTx) => {
      const outTs = safeDate(outTx.timestamp);
      if (!outTs) return false;
      const delayMs = outTs - inTs;
      return delayMs > 0 && delayMs <= 3600000 && normalizeValue(outTx.value) > 0;
    });

    if (followUps.length > 0) {
      const best = followUps.reduce((min, tx) => {
        const delayMs = safeDate(tx.timestamp) - inTs;
        return delayMs < min.delayMs ? { delayMs, tx } : min;
      }, { delayMs: Infinity, tx: null });

      if (best.tx) {
        const patternKey = `rapid_forwarding_${inTx.hash || inTx.transactionId}_${best.tx.hash || best.tx.transactionId}`;
        if (!seenPatterns.has(patternKey)) {
          seenPatterns.add(patternKey);
          patterns.push({
            pattern: 'RAPID_FORWARDING',
            severity: best.delayMs <= 60000 ? 'HIGH' : best.delayMs <= 1800000 ? 'MEDIUM' : 'LOW',
            evidence: {
              incoming_tx: truncateString(inTx.hash || inTx.transactionId || '', 128),
              outgoing_tx: truncateString(best.tx.hash || best.tx.transactionId || '', 128),
              time_difference_seconds: Math.round(best.delayMs / 1000),
              incoming_value: normalizeValue(inTx.value),
              outgoing_value: normalizeValue(best.tx.value),
            },
          });
        }
      }
    }
  }

  const fanInWallets = walletProfiles
    .filter((p) => p.fan_in >= 4)
    .map((p) => ({
      wallet: p.wallet,
      pattern: 'HIGH_FAN_IN',
      incoming_sources: p.unique_incoming_sources,
      outgoing_destinations: p.unique_outgoing_destinations,
      transaction_count: p.incoming_transaction_count + p.outgoing_transaction_count,
      evidence: {
        incoming_transactions: p.incoming_transaction_count,
        unique_sources: p.unique_incoming_sources,
        incoming_value: p.incoming_value,
      },
    }));

  const fanOutWallets = walletProfiles
    .filter((p) => p.fan_out >= 4)
    .map((p) => ({
      wallet: p.wallet,
      pattern: 'HIGH_FAN_OUT',
      incoming_sources: p.unique_incoming_sources,
      outgoing_destinations: p.unique_outgoing_destinations,
      transaction_count: p.incoming_transaction_count + p.outgoing_transaction_count,
      evidence: {
        outgoing_transactions: p.outgoing_transaction_count,
        unique_destinations: p.unique_outgoing_destinations,
        outgoing_value: p.outgoing_value,
      },
    }));

  patterns.push(...fanInWallets.map((fw) => ({ ...fw, severity: 'MEDIUM' })));
  patterns.push(...fanOutWallets.map((fw) => ({ ...fw, severity: 'MEDIUM' })));

  const targetTxMap = new Map();
  for (const tx of outgoing) {
    const target = tx.target || tx.to;
    if (!target || normalizeWalletAddress(target) === rootKey) continue;
    if (!targetTxMap.has(target)) {
      targetTxMap.set(target, []);
    }
    targetTxMap.get(target).push(tx);
  }

  for (const [target, txs] of targetTxMap.entries()) {
    if (txs.length >= 3) {
      const sourceWallet = txs[0].source || txs[0].from;
      const totalValue = txs.reduce((sum, tx) => sum + normalizeValue(tx.value), 0);
      patterns.push({
        pattern: 'REPEATED_DESTINATION',
        source_wallet: sourceWallet,
        destination_wallet: target,
        transaction_count: txs.length,
        total_value: totalValue,
        transaction_hashes: txs.map((tx) => truncateString(tx.hash || tx.transactionId || '', 128)),
        evidence: {
          transaction_hashes: txs.map((tx) => truncateString(tx.hash || tx.transactionId || '', 128)),
          total_value: totalValue,
          transaction_count: txs.length,
        },
        severity: 'LOW',
      });
    }
  }

  return { patterns, fan_in_wallets: fanInWallets, fan_out_wallets: fanOutWallets };
}

function detectConvergence(edges, rootKey) {
  const outgoingByTarget = new Map();
  const seenRoots = new Set();

  for (const tx of edges) {
    if (tx.direction !== 'outgoing') continue;
    const sourceKey = normalizeWalletAddress(tx.source || tx.from || '');
    if (sourceKey === rootKey) continue;

    const target = tx.target || tx.to;
    if (!target) continue;
    const targetKey = normalizeWalletAddress(target);
    if (targetKey === rootKey) continue;

    if (!outgoingByTarget.has(targetKey)) {
      outgoingByTarget.set(targetKey, new Set());
    }
    outgoingByTarget.get(targetKey).add(sourceKey);
  }

  const convergencePoints = [];
  for (const [targetKey, sources] of outgoingByTarget.entries()) {
    const sourceList = [...sources];
    if (sourceList.length >= 2) {
      convergencePoints.push({
        pattern: 'CONVERGENCE',
        destination: targetKey,
        source_wallets: sourceList,
        evidence: {
          destination: targetKey,
          source_count: sourceList.length,
          sources: sourceList,
        },
      });
    }
  }

  return convergencePoints;
}

function detectDivergence(edges, rootKey) {
  const rootOutgoing = edges.filter((tx) => {
    const sourceKey = normalizeWalletAddress(tx.source || tx.from || '');
    return sourceKey === rootKey && tx.direction === 'outgoing';
  });

  const targetMap = new Map();
  for (const tx of rootOutgoing) {
    const target = tx.target || tx.to;
    if (!target) continue;
    targetMap.set(target, (targetMap.get(target) || 0) + 1);
  }

  const divergenceChains = [];
  const distinctDestinations = [...targetMap.keys()];
  if (distinctDestinations.length >= 2) {
    const totalValue = rootOutgoing.reduce((sum, tx) => sum + normalizeValue(tx.value), 0);
    divergenceChains.push({
      source_wallet: rootKey,
      destination_count: distinctDestinations.length,
      destination_addresses: distinctDestinations,
      transaction_count: rootOutgoing.length,
      total_outgoing_value: totalValue,
      evidence: rootOutgoing.map((tx) => buildEvidenceItem(tx)),
    });
  }

  return divergenceChains;
}

function buildTimeline(edges) {
  const events = [];

  for (const tx of edges) {
    const ts = safeDate(tx.timestamp);
    events.push({
      timestamp: ts ? new Date(ts).toISOString() : null,
      timestamp_available: ts !== null,
      transaction_hash: truncateString(tx.hash || tx.transactionId || tx.transaction_id || '', 128),
      wallet: tx.target || tx.to || tx.source || tx.from || '',
      from: truncateString(tx.source || tx.from || '', 128),
      to: truncateString(tx.target || tx.to || '', 128),
      value: normalizeValue(tx.value ?? tx.amount ?? 0),
      asset: truncateString(tx.network === 'ethereum' ? 'ETH' : 'BTC', 8),
      hop: clampInt(tx.hop, 0, 1000),
      direction: tx.direction || 'unknown',
    });
  }

  events.sort((a, b) => {
    const ta = safeDate(a.timestamp);
    const tb = safeDate(b.timestamp);
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return ta - tb;
  });

  return {
    event_count: events.length,
    temporal_ordering_complete: events.every((e) => e.timestamp_available),
    events,
  };
}

function computePathIntelligence(nodes, edges, trace_summary, attribution) {
  const paths = [];
  const nodeMap = new Map();
  for (const node of nodes) {
    const key = normalizeWalletAddress(node.address || node.id || '');
    nodeMap.set(key, node);
  }

  const outgoingEdges = edges.filter((tx) => tx.direction === 'outgoing');
  const outgoingBySource = new Map();
  for (const tx of outgoingEdges) {
    const sourceKey = normalizeWalletAddress(tx.source || tx.from || '');
    if (!outgoingBySource.has(sourceKey)) {
      outgoingBySource.set(sourceKey, []);
    }
    outgoingBySource.get(sourceKey).push(tx);
  }

  const visited = new Set();
  const maxPaths = Math.min(50, outgoingBySource.size);

  for (const [sourceKey, sourceTxs] of outgoingBySource.entries()) {
    if (visited.size >= maxPaths) break;
    if (sourceTxs.length === 0) continue;

    const sourceNode = nodeMap.get(sourceKey);
    const rootKey = nodeMap.size > 0 ? normalizeWalletAddress(nodes[0]?.address || nodes[0]?.id || '') : sourceKey;

    for (const tx of sourceTxs) {
      if (visited.size >= maxPaths) break;
      const targetKey = normalizeWalletAddress(tx.target || tx.to || '');
      if (!targetKey) continue;

      const pathWallets = [sourceKey, targetKey];
      const pathTransactions = [tx];
      let currentKey = targetKey;

      while (outgoingBySource.has(currentKey)) {
        const nextTxs = outgoingBySource.get(currentKey);
        const nextTx = nextTxs[0];
        const nextKey = normalizeWalletAddress(nextTx.target || nextTx.to || '');
        if (!nextKey || nextKey === currentKey || pathWallets.includes(nextKey)) break;
        pathWallets.push(nextKey);
        pathTransactions.push(nextTx);
        currentKey = nextKey;
      }

      const timestamps = pathTransactions.map((t) => safeDate(t.timestamp)).filter(Boolean).sort((a, b) => a - b);
      const totalValue = pathTransactions.reduce((sum, t) => sum + normalizeValue(t.value), 0);

      const hasKnownEntity = pathWallets.some((w) => {
        const node = nodeMap.get(w);
        if (!node) return false;
        return node.type === 'exchange' || node.type === 'service';
      });

      const isIncomplete = !outgoingBySource.has(currentKey) || pathWallets.length < (trace_summary.max_hops || 0);

      paths.push({
        root: sourceNode?.address || sourceKey,
        destination: pathWallets[pathWallets.length - 1],
        hop_count: pathWallets.length - 1,
        wallets_in_path: pathWallets,
        transactions_in_path: pathTransactions.map((t) => truncateString(t.hash || t.transactionId || '', 128)),
        total_value: totalValue,
        first_timestamp: timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : null,
        last_timestamp: timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : null,
        contains_known_attributed_entity: hasKnownEntity,
        is_incomplete: isIncomplete,
      });

      visited.add(`${sourceKey}-${targetKey}`);
    }
  }

  return paths.slice(0, 50);
}

function computeTerminalDestinations(nodes, edges, trace_summary, limits_reached, attribution) {
  const outgoingBySource = new Map();
  for (const tx of edges) {
    if (tx.direction !== 'outgoing') continue;
    const sourceKey = normalizeWalletAddress(tx.source || tx.from || '');
    if (!outgoingBySource.has(sourceKey)) {
      outgoingBySource.set(sourceKey, new Map());
    }
    const targetKey = normalizeWalletAddress(tx.target || tx.to || '');
    const targetMap = outgoingBySource.get(sourceKey);
    if (!targetMap.has(targetKey)) {
      targetMap.set(targetKey, { address: tx.target || tx.to, count: 0, value: 0, txHashes: [] });
    }
    const entry = targetMap.get(targetKey);
    entry.count += 1;
    entry.value += normalizeValue(tx.value);
    entry.txHashes.push(truncateString(tx.hash || tx.transactionId || '', 128));
  }

  const nodeMap = new Map();
  for (const node of nodes) {
    const key = normalizeWalletAddress(node.address || node.id || '');
    nodeMap.set(key, node);
  }

  const terminals = [];
  const seen = new Set();

  for (const [sourceKey, targetMap] of outgoingBySource.entries()) {
    for (const [targetKey, targetData] of targetMap.entries()) {
      if (seen.has(targetKey)) continue;
      seen.add(targetKey);

      const hasOutgoing = outgoingBySource.has(targetKey);
      if (!hasOutgoing) {
        const node = nodeMap.get(targetKey);
        let terminationReason = 'NO_OUTGOING_TRANSACTIONS';

        if (limits_reached && limits_reached.includes('MAX_HOPS')) {
          terminationReason = 'MAX_HOPS_REACHED';
        } else if (limits_reached && limits_reached.includes('MAX_WALLETS_PER_INVESTIGATION')) {
          terminationReason = 'MAX_WALLETS_REACHED';
        } else if (limits_reached && limits_reached.includes('MAX_TOTAL_TRANSACTIONS')) {
          terminationReason = 'MAX_TRANSACTIONS_REACHED';
        }

        const incomingCount = edges.filter((tx) => {
          const toKey = normalizeWalletAddress(tx.target || tx.to || '');
          return toKey === targetKey && tx.direction === 'incoming';
        }).length;

        terminals.push({
          address: targetData.address,
          network: node?.network || 'unknown',
          hop: node?.hop ?? 0,
          incoming_status: incomingCount > 0 ? 'HAS_INCOMING' : 'NO_INCOMING',
          outgoing_status: 'NO_OUTGOING',
          value: targetData.value,
          transaction_count: targetData.count,
          attribution_status: attribution?.attributionStatus || 'UNKNOWN',
          entity: attribution?.entity || null,
          entity_type: attribution?.entityType || null,
          confidence: clampInt(attribution?.confidence || 0, 0, 100),
          evidence: targetData.txHashes.map((h) => ({ tx_hash: h })),
          reason_for_termination: terminationReason,
        });
      }
    }
  }

  return terminals.slice(0, 100);
}

function computeConfidence(edges, trace_summary, walletProfiles) {
  let confidence = 30;

  const txCount = edges.length;
  if (txCount >= 20) confidence += 20;
  else if (txCount >= 10) confidence += 15;
  else if (txCount >= 5) confidence += 10;
  else if (txCount >= 1) confidence += 5;

  const traceDepth = trace_summary.max_hops || trace_summary.max_hops_reached || 0;
  if (traceDepth >= 4) confidence += 15;
  else if (traceDepth >= 2) confidence += 10;
  else if (traceDepth >= 1) confidence += 5;

  const hasTimestamps = edges.every((tx) => safeDate(tx.timestamp) !== null);
  if (hasTimestamps) confidence += 10;

  const hasValues = edges.every((tx) => normalizeValue(tx.value) >= 0);
  if (hasValues) confidence += 10;

  const hasProfiles = walletProfiles.length > 1;
  if (hasProfiles) confidence += 5;

  if (trace_summary.partial) confidence -= 15;
  if (trace_summary.limits_reached && trace_summary.limits_reached.length > 0) confidence -= 5;

  return clampInt(confidence, 0, 100);
}

function buildInvestigationSummary({ rootAddress, network, trace_summary, walletProfiles, patterns, convergencePoints, fanInWallets, fanOutWallets, divergenceChains, repeatedDestinations, timeline, pathIntelligence, terminalDestinations, evidenceConfidence }) {
  const traceDepth = trace_summary.max_hops || trace_summary.max_hops_reached || 0;

  return {
    root_wallet: rootAddress,
    network: network || 'unknown',
    trace_depth: traceDepth,
    wallet_count: trace_summary.wallets_discovered || 0,
    transaction_count: trace_summary.transactions_analyzed || 0,
    funds_traced: trace_summary.funds_traced || '0',
    behavioral_patterns: patterns.slice(0, 20),
    convergence_points: convergencePoints.slice(0, 20),
    fan_in_wallets: fanInWallets.slice(0, 20),
    fan_out_wallets: fanOutWallets.slice(0, 20),
    divergence_chains: divergenceChains.slice(0, 20),
    repeated_destinations: repeatedDestinations.slice(0, 20),
    terminal_destinations: terminalDestinations.slice(0, 50),
    timeline_events: timeline?.events?.length || 0,
    evidence_confidence: evidenceConfidence,
  };
}

export async function buildInvestigationIntelligence(input = {}) {
  const { nodes = [], edges = [], trace_summary = {}, attribution, destination, compliance_screening, limits_reached = [], network, rootAddress } = input || {};
  const startTime = Date.now();

  try {
    const normalizedNetwork = validateNetwork(network);
    const validatedRoot = validateAddress(rootAddress);
    if (!normalizedNetwork || !validatedRoot) {
      return {
        status: 'UNAVAILABLE',
        reason: normalizedNetwork ? 'Invalid root address' : 'Invalid or unsupported network',
        evidence_confidence: 0,
      };
    }

    const safeNodes = Array.isArray(nodes) ? nodes.filter((n) => n && (n.address || n.id)) : [];
    const safeEdges = Array.isArray(edges) ? edges.filter((e) => e && (e.source || e.target || e.from || e.to)) : [];
    const safeTraceSummary = trace_summary && typeof trace_summary === 'object' ? trace_summary : {};
    const safeLimitsReached = Array.isArray(limits_reached) ? limits_reached : [];

    if (safeNodes.length === 0 && safeEdges.length === 0) {
      return {
        status: 'COMPLETED',
        evidence_confidence: 0,
        wallet_profiles: [],
        behavioral_patterns: [],
        convergence_points: [],
        fan_in_wallets: [],
        fan_out_wallets: [],
        divergence_chains: [],
        repeated_destinations: [],
        timeline: {
          event_count: 0,
          temporal_ordering_complete: true,
          events: [],
        },
        path_intelligence: [],
        terminal_destinations: [],
        investigation_summary: {
          root_wallet: validatedRoot,
          network: normalizedNetwork,
          trace_depth: 0,
          wallet_count: 0,
          transaction_count: 0,
          funds_traced: '0',
          behavioral_patterns: [],
          convergence_points: [],
          fan_in_wallets: [],
          fan_out_wallets: [],
          divergence_chains: [],
          repeated_destinations: [],
          terminal_destinations: [],
          timeline_events: 0,
          evidence_confidence: 0,
        },
      };
    }

    const walletProfiles = [];
    const processedWallets = new Set();
    const maxWallets = Math.min(100, safeNodes.length);

    for (const node of safeNodes) {
      if (processedWallets.size >= maxWallets) break;
      const walletAddress = node.address || node.id;
      if (!walletAddress) continue;
      const key = normalizeWalletAddress(walletAddress);
      if (processedWallets.has(key)) continue;
      processedWallets.add(key);
      walletProfiles.push(buildWalletProfile(walletAddress, safeEdges, validatedRoot, safeNodes, safeTraceSummary.max_hops || 0));
    }

    const { patterns, fan_in_wallets, fan_out_wallets } = detectBehavioralPatterns(safeEdges, walletProfiles, validatedRoot);

    const convergencePoints = detectConvergence(safeEdges, normalizeWalletAddress(validatedRoot));

    const divergenceChains = detectDivergence(safeEdges, normalizeWalletAddress(validatedRoot));

    const repeatedDestinations = patterns.filter((p) => p.pattern === 'REPEATED_DESTINATION');

    const timeline = buildTimeline(safeEdges);

    const pathIntelligence = computePathIntelligence(safeNodes, safeEdges, safeTraceSummary, attribution);

    const terminalDestinations = computeTerminalDestinations(safeNodes, safeEdges, safeTraceSummary, safeLimitsReached, destination || attribution);

    const evidenceConfidence = computeConfidence(safeEdges, safeTraceSummary, walletProfiles);

    const investigationSummary = buildInvestigationSummary({
      rootAddress: validatedRoot,
      network: normalizedNetwork,
      trace_summary: safeTraceSummary,
      walletProfiles,
      patterns,
      convergencePoints,
      fanInWallets: fan_in_wallets,
      fanOutWallets: fan_out_wallets,
      divergenceChains,
      repeatedDestinations,
      timeline,
      pathIntelligence,
      terminalDestinations,
      evidenceConfidence,
    });

    const isPartial = Boolean(safeTraceSummary.partial);

    return {
      status: isPartial ? 'PARTIAL' : 'COMPLETED',
      evidence_confidence: evidenceConfidence,
      wallet_profiles: walletProfiles,
      behavioral_patterns: patterns.slice(0, 50),
      convergence_points: convergencePoints.slice(0, 50),
      fan_in_wallets: fan_in_wallets,
      fan_out_wallets: fan_out_wallets,
      divergence_chains: divergenceChains,
      repeated_destinations: repeatedDestinations,
      timeline,
      path_intelligence: pathIntelligence,
      terminal_destinations: terminalDestinations,
      investigation_summary: investigationSummary,
    };
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      reason: `Intelligence analysis failed: ${String(error?.message || error)}`,
      evidence_confidence: 0,
    };
  }
}

export default { buildInvestigationIntelligence };
