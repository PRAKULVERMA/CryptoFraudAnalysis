import { shortAddress } from './graphFormat';
import type { DerivedNode, DerivedEdge } from './deriveGraph';

/**
 * Canvas painting for the investigation graph.
 * Restrained forensic styling: flat fills, hairline strokes, glow only for hierarchy.
 */

export const NODE_COLORS: Record<DerivedNode['kind'], string> = {
  root: '#A58B6F',
  intermediate: '#60A5FA',
  destination: '#22D3EE',
  verified: '#34D399',
  'unknown-destination': '#64748B',
};

export const RISK_RING = '#F97316';
export const PATH_COLOR = '#C4A482';
export const EDGE_COLOR = 'rgba(148, 163, 184, 0.30)';

export const nodeVisualRadius = (node: DerivedNode): number => {
  if (node.kind === 'root') return 9;
  if (node.kind === 'verified' || node.kind === 'destination' || node.kind === 'unknown-destination')
    return 7;
  return 5 + Math.min(node.inCount + node.outCount, 6) * 0.5;
};

export interface PaintState {
  selected: boolean;
  onPath: boolean;
  dimmed: boolean;
  hovered: boolean;
  riskFlagged: boolean;
}

export function paintNode(
  ctx: CanvasRenderingContext2D,
  node: DerivedNode,
  globalScale: number,
  state: PaintState
): void {
  const x = (node as any).x ?? 0;
  const y = (node as any).y ?? 0;
  const r = nodeVisualRadius(node);
  const color = NODE_COLORS[node.kind] ?? '#60A5FA';

  ctx.save();
  ctx.globalAlpha = state.dimmed ? 0.10 : 1;

  const emphasize = state.selected || state.onPath || node.kind === 'root';
  if (emphasize && !state.dimmed) {
    ctx.shadowColor = state.selected ? 'rgba(196, 164, 130, 0.55)' : 'rgba(165, 139, 111, 0.35)';
    ctx.shadowBlur = state.selected ? 14 : 8;
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.stroke();

  if (state.selected || state.onPath) {
    ctx.beginPath();
    ctx.arc(x, y, r + 3.5, 0, 2 * Math.PI);
    ctx.lineWidth = state.selected ? 1.8 : 1.2;
    ctx.strokeStyle = PATH_COLOR;
    ctx.stroke();
  }

  if (state.riskFlagged && !state.dimmed) {
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.setLineDash([2.5, 2.5]);
    ctx.strokeStyle = RISK_RING;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const important =
    state.selected ||
    state.onPath ||
    state.hovered ||
    node.kind === 'root' ||
    node.kind === 'verified' ||
    node.kind === 'unknown-destination';
  if (globalScale >= 1.35 || important) {
    const label = shortAddress(node.id, 6, 4);
    ctx.font = `${state.selected ? 600 : 400} ${5.5 / Math.max(globalScale, 0.8) + 3}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = state.selected ? '#FFFFFF' : 'rgba(212, 212, 212, 0.85)';
    ctx.fillText(label, x, y + r + 4);

    if (node.kind === 'root') {
      ctx.font = `600 ${5 / Math.max(globalScale, 0.8) + 2.5}px monospace`;
      ctx.fillStyle = '#A58B6F';
      ctx.fillText('SUSPECT WALLET', x, y - r - 12);
    } else if (state.selected && node.hop !== null) {
      ctx.font = `500 ${4.5 / Math.max(globalScale, 0.8) + 2.5}px monospace`;
      ctx.fillStyle = PATH_COLOR;
      ctx.fillText(`HOP ${node.hop}`, x, y - r - 10);
    }
  }

  ctx.restore();
}

/** Edge label drawn in 'after' mode — value + asset only where data exists. */
export function paintEdgeLabel(
  ctx: CanvasRenderingContext2D,
  edge: DerivedEdge & { source: any; target: any },
  globalScale: number,
  state: { selected: boolean; onPath: boolean; dimmed: boolean; asset: string }
): void {
  if (state.dimmed) return;
  const show =
    state.selected ||
    state.onPath ||
    globalScale >= 2.2;
  if (!show) return;

  const sx = edge.source?.x ?? 0;
  const sy = edge.source?.y ?? 0;
  const tx = edge.target?.x ?? 0;
  const ty = edge.target?.y ?? 0;
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  const parts: string[] = [];
  if (edge.value !== null) {
    const abs = Math.abs(edge.value);
    const decimals = abs === 0 ? 0 : abs < 0.0001 ? 8 : abs < 0.01 ? 6 : 4;
    parts.push(`${edge.value.toFixed(decimals)}${state.asset !== 'N/A' ? ` ${state.asset}` : ''}`);
  }
  if (parts.length === 0) return;

  ctx.save();
  ctx.font = `500 ${4 / Math.max(globalScale, 0.8) + 2.5}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = parts.join(' ');
  const width = ctx.measureText(text).width + 6;
  ctx.fillStyle = 'rgba(6, 6, 6, 0.82)';
  ctx.fillRect(mx - width / 2, my - 6, width, 12);
  ctx.fillStyle = state.selected ? '#E7D7BF' : 'rgba(196, 164, 130, 0.9)';
  ctx.fillText(text, mx, my);
  ctx.restore();
}

/** Simple containment paint for reliable hover/click hit areas. */
export function paintNodePointerArea(
  node: DerivedNode,
  color: string,
  ctx: CanvasRenderingContext2D
): void {
  const x = (node as any).x ?? 0;
  const y = (node as any).y ?? 0;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, nodeVisualRadius(node) + 5, 0, 2 * Math.PI);
  ctx.fill();
}