import type { InvestigationResult } from './investigationGraphStore';
import { normalizeAddressKey } from './graphFormat';

export type NodeKind =
  | 'root'
  | 'intermediate'
  | 'destination'
  | 'verified'
  | 'unknown-destination';

export interface DerivedNode {
  id: string;
  key: string;
  kind: NodeKind;
  hop: number | null;
  inCount: number;
  outCount: number;
  inSum: number;
  outSum: number;
  riskFlagged: boolean;
  attribution: Record<string, any> | null;
  fx?: number | null;
  fy?: number | null;
}

export interface DerivedEdge {
  id: string;
  hash: string;
  source: string;
  target: string;
  value: number | null;
  timestamp: string | null;
  direction: string;
  hop: number | null;
}

export interface DerivedGraph {
  nodes: DerivedNode[];
  edges: DerivedEdge[];
  rootKey: string | null;
  asset: string;
  flaggedKeys: Set<string>;
  hasRiskFlags: boolean;
}

export type GraphFilter =
  | 'all'
  | 'root'
  | 'high-risk'
  | 'incoming'
  | 'outgoing'
  | 'verified'
  | 'unknown'
  | 'exchanges'
  | 'services';

export type LayoutMode = 'force' | 'flow' | 'radial';

const asNumber = (value: any): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const edgeIdOf = (edge: any, source: string, target: string): string =>
  String(
    edge?.id ??
      edge?.transactionId ??
      edge?.transaction_id ??
      edge?.hash ??
      `${source}->${target}`
  );

const hashOf = (edge: any, fallback: string): string =>
  String(edge?.hash ?? edge?.transactionId ?? edge?.transaction_id ?? fallback);

export const readAttributionStatus = (attribution: any): string =>
  String(attribution?.attributionStatus ?? attribution?.status ?? '').toUpperCase();

export const entityTypeOf = (attribution: any): string =>
  String(
    attribution?.entityType ??
      attribution?.entity_type ??
      attribution?.destination_type ??
      attribution?.destinationType ??
      ''
  ).toLowerCase();

/** Collect every attribution record the backend actually provides, keyed by address. */
function buildAttributionMap(result: InvestigationResult): Map<string, Record<string, any>> {
  const map = new Map<string, Record<string, any>>();
  const put = (record: any) => {
    if (!record || typeof record !== 'object') return;
    const key = normalizeAddressKey(record.address ?? record.wallet_address);
    if (!key) return;
    map.set(key, { ...map.get(key), ...record });
  };

  put(result?.attribution);
  const intel = result?.destination_intelligence;
  if (Array.isArray(intel?.verified_entities)) intel.verified_entities.forEach(put);
  if (Array.isArray(intel?.unknown_destinations)) intel.unknown_destinations.forEach(put);
  if (Array.isArray(intel?.destinations)) {
    intel.destinations.forEach((entry: any) => {
      const key = normalizeAddressKey(entry?.address);
      if (key && !map.has(key)) map.set(key, { address: entry.address });
    });
  }
  return map;
}

/** Addresses referenced by real risk evidence (RAPID_FORWARDING tx hashes etc.). */
function collectFlaggedKeys(edges: DerivedEdge[], result: InvestigationResult): Set<string> {
  const flagged = new Set<string>();
  const hashToEdge = new Map<string, DerivedEdge>();
  edges.forEach((edge) => {
    if (edge.hash) hashToEdge.set(String(edge.hash).toLowerCase(), edge);
    if (edge.id) hashToEdge.set(String(edge.id).toLowerCase(), edge);
  });

  const signals = Array.isArray(result?.evidence?.signals) ? result.evidence.signals : [];
  signals.forEach((signal: any) => {
    const evidence = signal?.evidence;
    const items = Array.isArray(evidence) ? evidence : [];
    items.forEach((item: any) => {
      const hash = String(item?.tx_hash ?? item?.hash ?? item?.transaction_id ?? '').toLowerCase();
      const edge = hash ? hashToEdge.get(hash) : undefined;
      if (edge) {
        flagged.add(edge.source);
        flagged.add(edge.target);
      }
    });
  });
  return flagged;
}

function bfsHops(rootKey: string | null, edges: DerivedEdge[]): Map<string, number> {
  const levels = new Map<string, number>();
  if (!rootKey) return levels;
  const adjacency = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.target)!.push(edge.source);
  });
  levels.set(rootKey, 0);
  const queue = [rootKey];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const nexts = adjacency.get(current) || [];
    for (const next of nexts) {
      if (!levels.has(next)) {
        levels.set(next, (levels.get(current) || 0) + 1);
        queue.push(next);
      }
    }
  }
  return levels;
}

/**
 * Derives the forensic graph strictly from the backend response.
 * No address, value, timestamp or relationship is ever synthesized.
 */
export function deriveGraph(result: InvestigationResult): DerivedGraph {
  const rootKey = normalizeAddressKey(result?.address) || null;
  const asset = String(result?.trace_summary?.asset ?? '').trim() || 'N/A';

  const rawEdges: any[] = Array.isArray(result?.edges) ? result.edges : [];
  const edges: DerivedEdge[] = [];
  rawEdges.forEach((edge) => {
    const source = String(edge?.from ?? edge?.source ?? '').trim();
    const target = String(edge?.to ?? edge?.target ?? '').trim();
    if (!source || !target) return;
    const id = edgeIdOf(edge, source, target);
    const rawValue = edge?.value ?? edge?.amount;
    edges.push({
      id,
      hash: hashOf(edge, id),
      source,
      target,
      value:
        rawValue === null || rawValue === undefined || rawValue === ''
          ? null
          : asNumber(rawValue),
      timestamp: edge?.timestamp ? String(edge.timestamp) : null,
      direction: String(edge?.direction ?? 'unknown'),
      hop: edge?.hop === undefined || edge?.hop === null ? null : asNumber(edge.hop),
    });
  });

  // Fallback when only destination intelligence exists — still real backend data.
  if (edges.length === 0 && rootKey) {
    const destinations = Array.isArray(result?.destination_intelligence?.destinations)
      ? result.destination_intelligence.destinations
      : [];
    destinations.forEach((entry: any, index: number) => {
      const target = String(entry?.address ?? '').trim();
      if (!target) return;
      const id = String(entry?.transaction_id ?? `destination-${index}`);
      edges.push({
        id,
        hash: String(entry?.transaction_id ?? ''),
        source: result.address,
        target,
        value:
          entry?.value === undefined || entry?.value === null ? null : asNumber(entry.value),
        timestamp: entry?.timestamp ? String(entry.timestamp) : null,
        direction: String(entry?.direction ?? 'outgoing'),
        hop: entry?.hop === undefined || entry?.hop === null ? null : asNumber(entry.hop),
      });
    });
  }

  const attributionMap = buildAttributionMap(result);
  const flaggedKeys = collectFlaggedKeys(edges, result);

  const keys = new Set<string>([
    ...(rootKey ? [rootKey] : []),
    ...edges.flatMap((e) => [e.source, e.target]),
  ]);
  const targets = new Set(edges.map((e) => e.target));
  const sources = new Set(edges.map((e) => e.source));
  const bfs = bfsHops(rootKey, edges);

  const nodes: DerivedNode[] = [];
  keys.forEach((key) => {
    const inEdges = edges.filter((e) => e.target === key);
    const outEdges = edges.filter((e) => e.source === key);
    const attribution = attributionMap.get(key) ?? null;
    const status = attribution ? readAttributionStatus(attribution) : '';
    const isRoot = key === rootKey;
    const isLeaf = !sources.has(key) && targets.has(key);

    let kind: NodeKind = 'intermediate';
    if (isRoot) kind = 'root';
    else if (status === 'VERIFIED') kind = 'verified';
    else if (
      isLeaf &&
      (status === 'UNKNOWN' || status === '' || status === 'ATTRIBUTION UNAVAILABLE')
    )
      kind = 'unknown-destination';
    else if (isLeaf) kind = 'destination';

    nodes.push({
      id: key,
      key,
      kind,
      hop: bfs.has(key) ? (bfs.get(key) as number) : null,
      inCount: inEdges.length,
      outCount: outEdges.length,
      inSum: inEdges.reduce((sum, e) => sum + (e.value ?? 0), 0),
      outSum: outEdges.reduce((sum, e) => sum + (e.value ?? 0), 0),
      riskFlagged: flaggedKeys.has(key),
      attribution,
    });
  });

  return { nodes, edges, rootKey, asset, flaggedKeys, hasRiskFlags: flaggedKeys.size > 0 };
}

/** Filter semantics operate strictly on derived real data; empty result = honest empty state. */
export function applyFilter(
  graph: DerivedGraph,
  filter: GraphFilter
): { nodes: DerivedNode[]; edges: DerivedEdge[] } {
  const { nodes, edges } = graph;
  const nodeKeys = new Set(nodes.map((n) => n.key));
  const pickEdges = (predicate: (e: DerivedEdge) => boolean): DerivedEdge[] =>
    edges.filter((e) => nodeKeys.has(e.source) && nodeKeys.has(e.target) && predicate(e));
  const withNeighbors = (keys: Set<string>): DerivedNode[] =>
    nodes.filter((n) => keys.has(n.key));

  switch (filter) {
    case 'root': {
      if (!graph.rootKey) return { nodes: [], edges: [] };
      const keys = new Set<string>([graph.rootKey]);
      edges.forEach((e) => {
        if (e.source === graph.rootKey) keys.add(e.target);
        if (e.target === graph.rootKey) keys.add(e.source);
      });
      return {
        nodes: withNeighbors(keys),
        edges: pickEdges((e) => keys.has(e.source) && keys.has(e.target)),
      };
    }
    case 'high-risk': {
      if (!graph.hasRiskFlags) return { nodes: [], edges: [] };
      const keys = graph.flaggedKeys;
      return {
        nodes: withNeighbors(keys),
        edges: pickEdges((e) => keys.has(e.source) && keys.has(e.target)),
      };
    }
    case 'incoming': {
      const keys = new Set(
        edges.filter((e) => e.direction === 'incoming').flatMap((e) => [e.source, e.target])
      );
      return { nodes: withNeighbors(keys), edges: pickEdges((e) => e.direction === 'incoming') };
    }
    case 'outgoing': {
      const keys = new Set(
        edges
          .filter((e) => e.direction === 'outgoing' || e.direction === 'self-transfer')
          .flatMap((e) => [e.source, e.target])
      );
      return {
        nodes: withNeighbors(keys),
        edges: pickEdges(
          (e) => e.direction === 'outgoing' || e.direction === 'self-transfer'
        ),
      };
    }
    case 'verified': {
      const keys = new Set(nodes.filter((n) => n.kind === 'verified').map((n) => n.key));
      return {
        nodes: withNeighbors(keys),
        edges: pickEdges((e) => keys.has(e.source) && keys.has(e.target)),
      };
    }
    case 'unknown': {
      const keys = new Set(
        nodes.filter((n) => n.kind === 'unknown-destination').map((n) => n.key)
      );
      return {
        nodes: withNeighbors(keys),
        edges: pickEdges((e) => keys.has(e.source) && keys.has(e.target)),
      };
    }
    case 'exchanges': {
      const keys = new Set(
        nodes
          .filter((n) => n.attribution && entityTypeOf(n.attribution).includes('exchange'))
          .map((n) => n.key)
      );
      return {
        nodes: withNeighbors(keys),
        edges: pickEdges((e) => keys.has(e.source) && keys.has(e.target)),
      };
    }
    case 'services': {
      const serviceTypes = ['service', 'mixer', 'gambling', 'marketplace', 'wallet', 'merchant'];
      const keys = new Set(
        nodes
          .filter(
            (n) =>
              n.attribution &&
              serviceTypes.some((type) => entityTypeOf(n.attribution).includes(type))
          )
          .map((n) => n.key)
      );
      return {
        nodes: withNeighbors(keys),
        edges: pickEdges((e) => keys.has(e.source) && keys.has(e.target)),
      };
    }
    case 'all':
    default:
      return { nodes, edges };
  }
}

/** BFS shortest investigation path ROOT → target over the visible graph. */
export function computePath(
  rootKey: string | null,
  nodes: DerivedNode[],
  edges: DerivedEdge[],
  targetKey: string | null
): { nodeIds: Set<string>; linkIds: Set<string> } {
  const empty = { nodeIds: new Set<string>(), linkIds: new Set<string>() };
  if (!rootKey || !targetKey || rootKey === targetKey) return empty;

  const adjacencyOut = new Map<string, string[]>();
  const adjacencyIn = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!adjacencyOut.has(edge.source)) adjacencyOut.set(edge.source, []);
    adjacencyOut.get(edge.source)!.push(edge.target);
    if (!adjacencyIn.has(edge.target)) adjacencyIn.set(edge.target, []);
    adjacencyIn.get(edge.target)!.push(edge.source);
  });

  const parent = new Map<string, { key: string; via: string }>();
  const seen = new Set<string>([rootKey]);
  const queue = [rootKey];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetKey) break;
    for (const next of adjacencyOut.get(current) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        parent.set(next, { key: current, via: `${current}->${next}` });
        queue.push(next);
      }
    }
    for (const next of adjacencyIn.get(current) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        parent.set(next, { key: current, via: `${next}->${current}` });
        queue.push(next);
      }
    }
  }
  if (!seen.has(targetKey)) return empty;

  const nodeIds = new Set<string>([targetKey]);
  const linkIds = new Set<string>();
  let cursor = targetKey;
  while (cursor !== rootKey) {
    const step = parent.get(cursor);
    if (!step) break;
    linkIds.add(step.via);
    nodeIds.add(step.key);
    cursor = step.key;
  }
  nodeIds.add(rootKey);
  return { nodeIds, linkIds };
}

/** Precomputed fixed layouts (flow = hop columns, radial = hop rings). Force clears pins. */
export function applyLayout(
  nodes: DerivedNode[],
  mode: LayoutMode
): DerivedNode[] {
  if (mode === 'force') {
    return nodes.map((n) => ({ ...n, fx: null, fy: null }));
  }

  const levels = new Map<number, DerivedNode[]>();
  nodes.forEach((node) => {
    const level = node.hop === null ? 99 : node.hop;
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level)!.push(node);
  });
  const sortedLevels = [...levels.keys()].sort((a, b) => a - b);
  const lastLevel = sortedLevels.length > 0 ? sortedLevels[sortedLevels.length - 1] : 1;

  return nodes.map((node) => {
    const level = node.hop === null ? 99 : node.hop;
    const siblings = levels.get(level) || [];
    const indexInLevel = siblings.indexOf(node);
    const countInLevel = siblings.length;

    if (mode === 'flow') {
      const x = level === 99 ? (lastLevel + 1) * 240 : level * 240;
      const y = countInLevel === 1 ? 0 : (indexInLevel - (countInLevel - 1) / 2) * 110;
      return { ...node, fx: x, fy: y };
    }

    if (level === 0) return { ...node, fx: 0, fy: 0 };
    const radius = level === 99 ? (lastLevel + 1) * 230 : level * 230;
    const angle =
      countInLevel === 1
        ? 0
        : (2 * Math.PI * indexInLevel) / countInLevel + (level * Math.PI) / 8;
    return { ...node, fx: Math.cos(angle) * radius, fy: Math.sin(angle) * radius };
  });
}