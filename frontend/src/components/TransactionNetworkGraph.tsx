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
  Layers3,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Network,
  RotateCcw,
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
  runInvestigation,
  clearInvestigation,
} from './investigation-graph/investigationGraphStore';
import {
  InvestigationHeader,
  deriveTraceStatus,
} from './investigation-graph/InvestigationHeader';
import { NodeIntelligencePanel } from './investigation-graph/NodeIntelligencePanel';
import { EdgeIntelligencePanel } from './investigation-graph/EdgeIntelligencePanel';
import {
  paintNode,
  paintEdgeLabel,
  paintNodePointerArea,
  EDGE_COLOR,
  PATH_COLOR,
} from './investigation-graph/graphPainting';
import { assetForNetwork } from './investigation-graph/graphFormat';
import { Chip } from './investigation-graph/ui';

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

const LAYOUTS: { id: LayoutMode; label: string }[] = [
  { id: 'flow', label: 'Flow' },
  { id: 'radial', label: 'Radial' },
  { id: 'force', label: 'Force' },
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
  const [dims, setDims] = useState({ width: 800, height: 520 });

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
    const positioned = applyLayout(filtered.nodes, layout);
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

  const centerRoot = useCallback(() => {
    const root = nodeCacheRef.current.get(derived.rootKey ?? '');
    if (!root || graphRef.current == null) return;
    graphRef.current.centerAt(root.x ?? 0, root.y ?? 0, 700);
    graphRef.current.zoom(1.6, 700);
  }, [derived.rootKey]);

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
      const selected = selection?.kind === 'edge' && selection.edge.id === obj.id;
      const onPath = selection?.kind === 'node' && path.linkIds.has(`${s}->${t}`);
      const dimmed = dimForLink(obj);
      const sx = obj.source?.x ?? 0;
      const sy = obj.source?.y ?? 0;
      const tx = obj.target?.x ?? 0;
      const ty = obj.target?.y ?? 0;

      ctx.save();
      ctx.globalAlpha = dimmed ? 0.05 : 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.lineWidth = selected ? 2.4 : onPath ? 1.6 : 1;
      ctx.strokeStyle = selected
        ? '#E7D7BF'
        : onPath
          ? PATH_COLOR
          : EDGE_COLOR;
      ctx.stroke();

      if (!reduceMotion && !dimmed && (onPath || selected)) {
        const flowT = (Date.now() % 1600) / 1600;
        const px = sx + (tx - sx) * flowT;
        const py = sy + (ty - sy) * flowT;
        ctx.beginPath();
        ctx.arc(px, py, 1.6, 0, 2 * Math.PI);
        ctx.fillStyle = '#E7D7BF';
        ctx.fill();
      }

      ctx.beginPath();
      const angle = Math.atan2(ty - sy, tx - sx);
      const headX = tx - Math.cos(angle) * ((obj.target?.__r ?? 6) + 2);
      const headY = ty - Math.sin(angle) * ((obj.target?.__r ?? 6) + 2);
      ctx.translate(headX, headY);
      ctx.rotate(angle);
      ctx.moveTo(0, 0);
      ctx.lineTo(-4.5, 2.4);
      ctx.lineTo(-4.5, -2.4);
      ctx.closePath();
      ctx.fillStyle = selected ? '#E7D7BF' : onPath ? PATH_COLOR : 'rgba(148, 163, 184, 0.55)';
      ctx.fill();
      ctx.restore();

      if (!dimmed) {
        paintEdgeLabel(ctx, obj, globalScale, {
          selected: Boolean(selected),
          onPath: Boolean(onPath),
          dimmed: false,
          asset,
        });
      }
    },
    [selection, path, dimForLink, asset, reduceMotion]
  );

  const showEmptyGraph =
    !isRunning && !error && result && graphData.nodes.length === 0 && filter !== 'all';
  const showNoTx =
    !isRunning && !error && result && status.code === 'NO_TRANSACTIONS';

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
          <div className="absolute inset-0 cyber-grid-bg opacity-20 pointer-events-none" />

          {result && !isRunning && (
            <div className="relative z-20 mb-4">
              <InvestigationHeader result={result} status={status} />
            </div>
          )}

          <div className="relative z-20 flex flex-wrap items-center gap-1.5 pb-3 mb-2 border-b border-white/5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
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
            <span className="mx-1 w-px h-4 bg-white/10 hidden sm:block" />
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLayout(l.id)}
                className={
                  'px-2.5 py-1 rounded-md border text-[9px] font-mono uppercase tracking-wider transition-colors cursor-pointer ' +
                  (layout === l.id
                    ? 'border-[#A58B6F]/50 bg-[#A58B6F]/15 text-[#C4A482]'
                    : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/25')
                }
              >
                <Layers3 className="w-3 h-3 inline mr-1 -mt-0.5" />
                {l.label}
              </button>
            ))}
            <span className="flex-1" />
            <ToolbarButton icon={<ZoomIn className="w-3.5 h-3.5" />} label="Zoom in" onClick={() => graphRef.current?.zoom(graphRef.current?.zoom() * 1.35, 350)} />
            <ToolbarButton icon={<ZoomOut className="w-3.5 h-3.5" />} label="Zoom out" onClick={() => graphRef.current?.zoom(graphRef.current?.zoom() / 1.35, 350)} />
            <ToolbarButton icon={<Crosshair className="w-3.5 h-3.5" />} label="Fit graph" onClick={() => graphRef.current?.zoomToFit(600, 48)} />
            <ToolbarButton icon={<Network className="w-3.5 h-3.5" />} label="Center root wallet" onClick={centerRoot} disabled={!derived.rootKey} />
            <ToolbarButton icon={<RotateCcw className="w-3.5 h-3.5" />} label="Reset view" onClick={resetView} />
            <ToolbarButton icon={isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />} label="Fullscreen" onClick={toggleFullscreen} />
          </div>
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
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-500">
                  No nodes match this filter
                </span>
                <p className="text-xs font-mono text-neutral-600">
                  No node in this trace carries that classification.
                </p>
              </div>
            )}
            {!isRunning && !error && !showNoTx && graphData.nodes.length > 0 && (
              <ForceGraph2D
                ref={graphRef}
                width={dims.width}
                height={dims.height}
                graphData={graphData}
                backgroundColor="rgba(0,0,0,0)"
                nodeRelSize={3.2}
                linkColor={() => 'rgba(0,0,0,0)'}
                linkWidth={(l: any) => (dimForLink(l) ? 0.4 : 1.4)}
                linkCurvature={0.08}
                linkHoverPrecision={6}
                cooldownTicks={reduceMotion ? 0 : 120}
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
                onNodeHover={(n: any) => setHoverKey(n ? n.key : null)}
                onEngineStop={() => {
                  if (!reduceMotion) graphRef.current?.zoomToFit(700, 48);
                }}
              />
            )}
          </div>

          <div className="relative z-20 flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 mt-2 border-t border-white/5 text-[9px] font-mono text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#A58B6F' }} /> Root Wallet</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#60A5FA' }} /> Wallet</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full ring-1 ring-orange-500/70" style={{ background: '#60A5FA' }} /> High Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#34D399' }} /> Verified Entity</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#64748B' }} /> Unknown</span>
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
