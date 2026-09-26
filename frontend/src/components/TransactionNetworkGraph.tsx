import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  GitFork,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  RotateCcw,
  ListFilter,
} from 'lucide-react';
import type {
  DerivedNode,
  DerivedEdge,
  GraphFilter,
  LayoutMode,
} from './investigation-graph/deriveGraph';
import {
  deriveGraph,
  applyFilter,
  computePath,
  applyLayout,
} from './investigation-graph/deriveGraph';
import {
  useInvestigationState,
} from './investigation-graph/investigationGraphStore';
import {
  InvestigationHeader,
  deriveTraceStatus,
} from './investigation-graph/InvestigationHeader';
import { NodeIntelligencePanel } from './investigation-graph/NodeIntelligencePanel';
import { EdgeIntelligencePanel } from './investigation-graph/EdgeIntelligencePanel';
import {
  paintNode,
  paintEdge,
  paintNodePointerArea,
  edgeDisplayWidth,
} from './investigation-graph/graphPainting';
import { assetForNetwork } from './investigation-graph/graphFormat';

/** Real engine pipeline labels (investigationJobService current_step vocabulary). */
const PIPELINE_STEPS = [
  'VALIDATING WALLET',
  'FETCHING TRANSACTIONS',
  'NORMALIZING TRANSACTIONS',
  'BUILDING TRACE',
  'ANALYZING RISK',
  'BUILDING GRAPH',
  'COMPLETE',
];

const FILTERS: { id: GraphFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'root', label: 'Root' },
  { id: 'high-risk', label: 'High Risk' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Outgoing' },
  { id: 'verified', label: 'Verified Entities' },
  { id: 'unknown', label: 'Unknown' },
  { id: 'exchanges', label: 'Exchanges' },
  { id: 'services', label: 'Services' },
];

const ToolbarButton = ({
  icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={
      'p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ' +
      (active
        ? 'border-[#A58B6F]/50 bg-[#A58B6F]/15 text-[#C4A482]'
        : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/25')
    }
  >
    {icon}
  </button>
);

/** Stable edge identity for selection comparisons across graph re-derivations. */
const edgeKeyOf = (link: any): string =>
  String(
    link?.id ??
      link?.transactionId ??
      link?.transaction_id ??
      link?.hash ??
      `${link?.source}->${link?.target}`
  );

export const TransactionNetworkGraph: React.FC = () => {
  const { result, isRunning, error, address, network } = useInvestigationState();
  const reduceMotion = useReducedMotion() ?? false;

  const [filter, setFilter] = useState<GraphFilter>('all');
  const [layout, setLayout] = useState<LayoutMode>('flow');
  const [selection, setSelection] = useState<
    { kind: 'node'; node: DerivedNode } | { kind: 'edge'; edge: DerivedEdge } | null
  >(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dims, setDims] = useState({ width: 800, height: 520 });

  useEffect(() => {
    if (!filtersOpen) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [filtersOpen]);

  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const nodeCacheRef = useRef<Map<string, any>>(new Map());

  const derived = useMemo(() => deriveGraph(result), [result]);
  const filtered = useMemo(() => applyFilter(derived, filter), [derived, filter]);
  const path = useMemo(() => {
    if (!selection) return { nodeIds: new Set<string>(), linkIds: new Set<string>() };
    const target =
      selection.kind === 'node' ? selection.node.key : null;
    if (!target) return { nodeIds: new Set<string>(), linkIds: new Set<string>() };
    return computePath(derived.rootKey, filtered.nodes, filtered.edges, target);
  }, [selection, derived, filtered]);

  const maxValue = useMemo(
    () =>
      filtered.edges.reduce(
        (m, e) => (e.value != null && Number.isFinite(e.value) ? Math.max(m, Math.abs(e.value)) : m),
        0
      ),
    [filtered.edges]
  );

  const maxHop = useMemo(() => {
    if (!derived.rootKey) return 0;
    return derived.nodes.reduce((m, n) => (n.hop == null ? m : Math.max(m, n.hop)), 0);
  }, [derived]);

  const txAnalyzed = useMemo(
    () =>
      Number(result?.trace_summary?.transactions_analyzed ?? result?.transactionsAnalyzed) ||
      filtered.edges.length,
    [result, filtered.edges]
  );
  const walletsDiscovered = useMemo(
    () =>
      Number(result?.trace_summary?.wallets_discovered ?? result?.walletsDiscovered) ||
      derived.nodes.length,
    [result, derived.nodes]
  );

  const flowStages = useMemo(() => {
    const stages: { label: string; hop: number | null }[] = [];
    if (!derived.rootKey) return stages;
    if (maxHop === 0) {
      stages.push({ label: 'START', hop: 0 });
      return stages;
    }
    for (let i = 0; i <= maxHop; i++) {
      if (i === 0) stages.push({ label: 'START', hop: 0 });
      else if (i === maxHop) stages.push({ label: 'FINAL DESTINATION', hop: i });
      else stages.push({ label: `HOP ${i}`, hop: i });
    }
    return stages;
  }, [maxHop, derived.rootKey]);

  const pathLinkIds = useMemo(() => {
    if (!selection || selection.kind !== 'edge') {
      return new Set<string>();
    }
    const e = selection.edge;
    const direct = new Set<string>([`${e.source}->${e.target}`]);
    const back = new Set<string>([`${e.target}->${e.source}`]);
    if (derived.rootKey) {
      const fromRoot = computePath(
        derived.rootKey,
        filtered.nodes,
        filtered.edges,
        e.target
      );
      fromRoot.linkIds.forEach((id) => direct.add(id));
    }
    return new Set<string>([...direct, ...back]);
  }, [selection, derived, filtered]);

  /** Stable node objects preserve simulation positions across re-derivations. */
  const graphData = useMemo(() => {
    const cache = nodeCacheRef.current;
    const liveKeys = new Set(filtered.nodes.map((n) => n.key));
    Array.from(cache.keys()).forEach((k) => {
      if (!liveKeys.has(k)) cache.delete(k);
    });
    const positioned = applyLayout(filtered.nodes, filtered.edges, layout);
    const nodes = positioned.map((n) => {
      let obj = cache.get(n.key);
      if (!obj) {
        obj = { ...n };
        cache.set(n.key, obj);
      } else {
        Object.assign(obj, n);
      }
      obj.fx = n.fx ?? null;
      obj.fy = n.fy ?? null;
      return obj;
    });
    const links = filtered.edges.map((e) => ({ ...e }));
    return { nodes, links };
  }, [filtered, layout]);

  const asset = assetForNetwork(network ?? result?.network);
  const status = deriveTraceStatus(result, isRunning, error);

  useEffect(() => {
    if (layout !== 'force') return;
    graphRef.current?.d3ReheatSimulation?.();
  }, [layout]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.max(320, Math.floor(entry.contentRect.width));
      const height = isFullscreen
        ? Math.max(420, window.innerHeight - 210)
        : Math.min(620, Math.max(380, Math.floor(window.innerHeight * 0.52)));
      setDims({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!selection) return;
    if (selection.kind === 'node') {
      if (!filtered.nodes.some((n) => n.key === selection.node.key)) {
        setSelection(null);
      }
    } else if (selection.kind === 'edge') {
      if (!filtered.edges.some((e) => e.id === selection.edge.id)) {
        setSelection(null);
      }
    }
  }, [filtered, selection]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    cardRef.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    setSelection({ kind: 'node', node: node as DerivedNode });
  }, []);

  const handleLinkClick = useCallback((link: any) => {
    const snapshot: DerivedEdge = {
      ...link,
      source:
        typeof link?.source === 'object' && link?.source !== null
          ? String(link.source.key ?? link.source.id ?? '')
          : String(link?.source ?? ''),
      target:
        typeof link?.target === 'object' && link?.target !== null
          ? String(link.target.key ?? link.target.id ?? '')
          : String(link?.target ?? ''),
    };
    setSelection({ kind: 'edge', edge: snapshot });
  }, []);

  const safeZoom = (factor: number) => {
    const g = graphRef.current;
    if (!g || typeof g.zoom !== 'function') return;
    const current = typeof g.zoom === 'function' ? g.zoom() : 1;
    if (!Number.isFinite(current) || current <= 0) return;
    g.zoom(current * factor, 350);
  };

  const resetView = useCallback(() => {
    setFilter('all');
    setLayout('flow');
    setSelection(null);
    graphRef.current?.zoomToFit(700, 48);
  }, []);


  const dimForNode = useCallback(
    (node: any): boolean => {
      if (!selection) return false;
      if (path.nodeIds.size === 0) return false;
      return !path.nodeIds.has(node.key);
    },
    [selection, path]
  );

  const dimForLink = useCallback(
    (link: any): boolean => {
      if (!selection) return false;
      if (selection.kind === 'edge') {
        return !pathLinkIds.has(`${link.source?.key ?? link.source}->${link.target?.key ?? link.target}`);
      }
      if (path.linkIds.size === 0) return true;
      const s = typeof link.source === 'object' ? link.source.key : link.source;
      const t = typeof link.target === 'object' ? link.target.key : link.target;
      return !path.linkIds.has(`${s}->${t}`);
    },
    [selection, path, pathLinkIds]
  );

  const nodeCanvasObject = useCallback(
    (obj: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      paintNode(ctx, obj, globalScale, {
        selected: selection?.kind === 'node' && selection.node.key === obj.key,
        onPath: path.nodeIds.has(obj.key),
        dimmed: dimForNode(obj),
        hovered: hoverKey === obj.key,
        riskFlagged: obj.riskFlagged === true,
      });
    },
    [selection, path, dimForNode, hoverKey]
  );

  const linkCanvasObject = useCallback(
    (obj: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const s = typeof obj.source === 'object' ? obj.source.key : obj.source;
      const t = typeof obj.target === 'object' ? obj.target.key : obj.target;
      paintEdge(ctx, obj, globalScale, {
        selected: selection?.kind === 'edge' && selection.edge.id === obj.id,
        onPath: selection?.kind === 'node' && path.linkIds.has(`${s}->${t}`),
        dimmed: dimForLink(obj),
        asset,
        maxValue,
      });
    },
    [selection, path, dimForLink, asset, maxValue]
  );
  const hasTransactions = result && (result.trace_summary?.transactions_analyzed ?? 0) > 0;
  const showNoTx =
    !isRunning && !error && result && status.code === 'NO_TRANSACTIONS';
  const showProviderError = !isRunning && !error && result && status.code === 'PROVIDER_ERROR';
  const showEmptyGraph =
    !isRunning && !error && result && !showNoTx && !showProviderError && graphData.nodes.length === 0;
  const emptyGraphReason =
    filter !== 'all'
      ? 'filter'
      : hasTransactions
        ? 'topology'
        : 'no-result';

  return (
    <section id="graph-network" className="relative z-10 py-24 px-6 sm:px-10 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em] mb-4">
            <GitFork className="w-3.5 h-3.5" />
            <span>Investigation Workflow Graph</span>
          </div>
          <h2 className="font-playfair text-3xl sm:text-5xl font-light text-white tracking-tight mb-3">
            Follow The Money Trail
          </h2>
          <p className="font-inter text-neutral-400 text-sm max-w-2xl opacity-80 leading-relaxed">
            Run an investigation above — the traced fund flow renders here with hop-by-hop
            path highlighting, destination attribution and transaction intelligence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider">
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[#A58B6F]/50 text-[#C4A482]">
              <Loader2 className="w-3 h-3 animate-spin" />
              IN PROGRESS
            </span>
          )}
          {PIPELINE_STEPS.map((step, idx) => {
            const done = !isRunning && result !== null;
            const active = isRunning && idx === 0;
            if (!done && !active) {
              return (
                <span key={step} className="px-2 py-1 rounded-md border border-white/10 text-neutral-600">
                  {step}
                </span>
              );
            }
            return (
              <span
                key={step}
                className={
                  'px-2 py-1 rounded-md border ' +
                  (active
                    ? 'border-[#A58B6F]/50 text-[#C4A482]'
                    : 'border-emerald-500/20 text-emerald-400/70')
                }
              >
                {step}
              </span>
            );
          })}
        </div>
      </div>

      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div
          ref={cardRef}
          className={
            'lg:col-span-8 glass-card rounded-3xl glass-border shadow-2xl bg-[#060606]/90 relative overflow-hidden flex flex-col ' +
            (isFullscreen ? 'p-4' : 'p-4 sm:p-6')
          }
        >
          {result && !isRunning && (
            <div className="relative z-20 mb-4">
              <InvestigationHeader result={result} status={status} />
            </div>
          )}

          <div className="relative z-20 flex flex-wrap items-center gap-1.5 pb-3 mb-2 border-b border-white/5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={
                  'px-2.5 py-1 rounded-md border text-[9px] font-mono uppercase tracking-wider transition-colors cursor-pointer ' +
                  (filter === 'all'
                    ? 'border-[#A58B6F]/50 bg-[#A58B6F]/15 text-[#C4A482]'
                    : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/25')
                }
              >
                <ListFilter className="w-3 h-3 inline mr-1 -mt-0.5" />
                Filters {filtersOpen ? '▴' : '▾'}
              </button>
              {filtersOpen && (
                <div className="absolute z-30 mt-1.5 left-0 flex flex-col gap-1 p-1.5 min-w-44 glass-card glass-border bg-[#0a0a0a]/95">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFilter(f.id);
                        setFiltersOpen(false);
                      }}
                      className={
                        'px-2.5 py-1 rounded-md border text-[9px] font-mono uppercase tracking-wider transition-colors cursor-pointer ' +
                        (filter === f.id
                          ? 'border-[#A58B6F]/50 bg-[#A58B6F]/15 text-[#C4A482]'
                          : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/25')
                      }
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="flex-1" />
            <ToolbarButton icon={<ZoomIn className="w-3.5 h-3.5" />} label="Zoom in" onClick={() => safeZoom(1.35)} />
            <ToolbarButton icon={<ZoomOut className="w-3.5 h-3.5" />} label="Zoom out" onClick={() => safeZoom(1 / 1.35)} />
            <ToolbarButton icon={<Crosshair className="w-3.5 h-3.5" />} label="Fit graph" onClick={() => graphRef.current?.zoomToFit(600, 48)} />
            <ToolbarButton icon={<RotateCcw className="w-3.5 h-3.5" />} label="Reset view" onClick={resetView} />
            <ToolbarButton icon={isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />} label="Fullscreen" onClick={toggleFullscreen} />
          </div>

          {!isRunning && !error && graphData.nodes.length > 0 && (
            <div className="relative z-20 mb-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[10px] font-mono tracking-[0.15em] text-neutral-500">
                <span className="text-[#A58B6F] font-semibold tracking-widest text-[11px] uppercase">
                  Money Flow
                </span>
                <span className="flex items-center gap-1.5">
                  {flowStages.map((s, i) => (
                    <React.Fragment key={s.label + i}>
                      {i > 0 && <span className="text-neutral-600/60">→</span>}
                      <span
                        className={
                          s.hop === 0
                            ? 'text-[#A58B6F] font-medium'
                            : s.hop === maxHop
                              ? 'text-cyan-300/90'
                              : 'text-neutral-400'
                        }
                      >
                        {s.label}
                      </span>
                    </React.Fragment>
                  ))}
                </span>
                <span className="flex-1 h-px bg-white/5" />
                <span className="flex items-center gap-3 text-neutral-600">
                  <span>Transactions {txAnalyzed}</span>
                  <span>·</span>
                  <span>Wallets {walletsDiscovered}</span>
                  <span>·</span>
                  <span>Max Hop {maxHop}</span>
                </span>
              </div>
            </div>
          )}

          <div className="relative z-10" style={{ height: dims.height }}>
            {isRunning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#A58B6F]" />
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
                  Tracing fund flow — fetching live chain data
                </span>
              </div>
            )}
            {!isRunning && error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-red-400">
                  Provider Error
                </span>
                <p className="text-xs font-mono text-neutral-400 max-w-md break-words">{error}</p>
              </div>
            )}
            {!isRunning && !error && showNoTx && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <ShieldAlert className="w-6 h-6 text-neutral-500" />
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
                  No Transactions
                </span>
                <p className="text-xs font-mono text-neutral-500 max-w-md">
                  The provider returned no transactions for this wallet. Nothing to graph.
                </p>
              </div>
            )}
            {!isRunning && !error && showEmptyGraph && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                {emptyGraphReason === 'filter' && (
                  <>
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-500">
                      No nodes match this filter
                    </span>
                    <p className="text-xs font-mono text-neutral-600">
                      No node in this trace carries that classification.
                    </p>
                  </>
                )}
                {emptyGraphReason === 'topology' && (
                  <>
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-500">
                      No Graph Topology Returned
                    </span>
                    <p className="text-xs font-mono text-neutral-600 max-w-md">
                      The investigation completed but no topology graph was returned for this wallet.
                    </p>
                  </>
                )}
                {emptyGraphReason === 'no-result' && (
                  <>
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-500">
                      Nothing to Graph
                    </span>
                    <p className="text-xs font-mono text-neutral-600">
                      The investigation returned no graphable data for this wallet.
                    </p>
                  </>
                )}
              </div>
            )}
            {!isRunning && !error && !showNoTx && !showEmptyGraph && graphData.nodes.length > 0 && (
              <ForceGraph2D
                ref={graphRef}
                width={dims.width}
                height={dims.height}
                graphData={graphData}
                backgroundColor="rgba(0,0,0,0)"
                nodeRelSize={3.2}
                linkColor={() => 'rgba(0,0,0,0)'}
                linkWidth={(l: any) => (dimForLink(l) ? 0.6 : edgeDisplayWidth(l, maxValue))}
                linkCurvature={0.06}
                linkHoverPrecision={14}
                cooldownTicks={reduceMotion ? 0 : layout === 'force' ? 120 : 30}
                warmupTicks={layout === 'force' ? 60 : 0}
                enableNodeDrag={layout === 'force'}
                minZoom={0.25}
                maxZoom={6}
                nodeCanvasObject={nodeCanvasObject}
                nodeCanvasObjectMode={() => 'replace'}
                nodePointerAreaPaint={paintNodePointerArea}
                linkCanvasObject={linkCanvasObject}
                linkCanvasObjectMode={() => 'after'}
                onNodeClick={handleNodeClick}
                onLinkClick={handleLinkClick}
                onBackgroundClick={() => setSelection(null)}
                onNodeHover={(n: any) => setHoverKey(n ? n.key : null)}
                onEngineStop={() => {
                  if (!reduceMotion) graphRef.current?.zoomToFit(700, 48);
                }}
              />
            )}
          </div>

          <div className="relative z-20 flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 mt-2 border-t border-white/5 text-[9px] font-mono text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#A58B6F' }} /> Start Wallet</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#60A5FA' }} /> Intermediate Hop</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full ring-1 ring-orange-500/70" style={{ background: '#60A5FA' }} /> High Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#34D399' }} /> Verified</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full ring-1 ring-cyan-400/50" style={{ background: '#22D3EE' }} /> Final Destination</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#64748B' }} /> Unknown Destination</span>
            <span className="flex items-center gap-1.5 text-[#C4A482]">Fund Movement <span aria-hidden>→</span></span>
          </div>
        </div>

        <div className="lg:col-span-4 min-w-0">
          <AnimatePresence mode="wait">
            {selection?.kind === 'node' && (
              <motion.div
                key={'node-' + selection.node.key}
                initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: 24 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <NodeIntelligencePanel
                  node={selection.node}
                  investigation={result}
                  asset={asset}
                  onClose={() => setSelection(null)}
                />
              </motion.div>
            )}
            {selection?.kind === 'edge' && (
              <motion.div
                key={'edge-' + selection.edge.id}
                initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: 24 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <EdgeIntelligencePanel
                  edge={selection.edge}
                  investigation={result}
                  asset={asset}
                  onClose={() => setSelection(null)}
                />
              </motion.div>
            )}
            {!selection && (
              <motion.div
                key="placeholder"
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-2xl border glass-border bg-[#0a0a0a]/60 p-6 text-center"
              >
                <Crosshair className="w-5 h-5 text-neutral-600 mx-auto mb-3" />
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 mb-2">
                  Intelligence Panel
                </p>
                <p className="text-xs font-mono text-neutral-600 leading-relaxed">
                  Select a wallet or a fund movement on the graph to inspect its available
                  evidence. Unknown destinations are never auto-labeled.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
