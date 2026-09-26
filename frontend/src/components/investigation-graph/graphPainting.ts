import { shortAddress } from './graphFormat';
import { readAttributionStatus, type DerivedNode, type DerivedEdge } from './deriveGraph';

/**
 * Canvas painting for the investigation money-flow diagram.
 * Clean, card-like nodes with hop-tier labels and directional arrows.
 * No decorative neon effects — information hierarchy over decoration.
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
export const EDGE_SELECTED = '#E7D7BF';

export const nodeVisualRadius = (node: DerivedNode): number => {
  if (node.kind === 'root') return 13;
  if (node.kind === 'verified' || node.kind === 'destination' || node.kind === 'unknown-destination')
    return 8;
  return 6 + Math.min(node.inCount + node.outCount, 6) * 0.45;
};

/** Edge thickness proportional to transaction value with hard min/max limits. */
export const edgeDisplayWidth = (edge: DerivedEdge, maxValue: number): number => {
  if (edge.value == null || !Number.isFinite(edge.value)) return 1.6;
  const max = maxValue > 0 ? maxValue : 1;
  const ratio = Math.min(Math.abs(edge.value) / max, 1);
  const width = 1.5 + 4.5 * Math.sqrt(ratio);
  return Math.min(Math.max(width, 1.5), 6);
};

export interface PaintState {
  selected: boolean;
  onPath: boolean;
  dimmed: boolean;
  hovered: boolean;
  riskFlagged: boolean;
}

const isTerminalNode = (node: DerivedNode): boolean =>
  node.kind !== 'root' && node.outCount === 0;

const nodeAttributionTag = (
  node: DerivedNode
): { text: string; verified: boolean } | null => {
  if (!node.attribution) return null;
  const status = readAttributionStatus(node.attribution);
  const entity = node.attribution.entity ?? node.attribution.entity_name ?? null;
  if (status === 'VERIFIED' || status === 'SUPPORTED') {
    if (entity && String(entity).length <= 24) return { text: String(entity), verified: true };
    return { text: 'VERIFIED', verified: true };
  }
  return {
    text: status === 'CONFLICTING' ? 'CONFLICTING' : 'UNKNOWN',
    verified: false,
  };
};

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
  const terminal = isTerminalNode(node);

  ctx.save();
  ctx.globalAlpha = state.dimmed ? 0.12 : 1;

  // Base fill + hairline stroke.
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.stroke();

  // Anchor rings (no neon glow) — START (bronze) and FINAL DESTINATION (cyan).
  if (!state.dimmed) {
    if (node.kind === 'root') {
      ctx.beginPath();
      ctx.arc(x, y, r + 4.5, 0, 2 * Math.PI);
      ctx.lineWidth = state.selected ? 2.2 : 1.7;
      ctx.strokeStyle = 'rgba(165, 139, 111, 0.5)';
      ctx.stroke();
    } else if (terminal) {
      ctx.beginPath();
      ctx.arc(x, y, r + 4.5, 0, 2 * Math.PI);
      ctx.lineWidth = state.selected ? 2.2 : 1.6;
      ctx.strokeStyle = 'rgba(34, 211, 239, 0.45)';
      ctx.stroke();
    }
  }

  if (state.selected || state.onPath) {
    ctx.beginPath();
    ctx.arc(x, y, r + 6.5, 0, 2 * Math.PI);
    ctx.lineWidth = state.selected ? 2.2 : 1.3;
    ctx.strokeStyle = PATH_COLOR;
    ctx.stroke();
  }

  if (state.riskFlagged && !state.dimmed) {
    ctx.beginPath();
    ctx.arc(x, y, r + 8, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2.5]);
    ctx.strokeStyle = RISK_RING;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Every node labels its hop tier so the money story reads at a glance.
  if (!state.dimmed) {
    const scale = 5 / Math.max(globalScale, 0.9) + 2;
    ctx.textAlign = 'center';

    let above = '';
    let aboveColor = 'rgba(212, 212, 220, 0.8)';
    if (node.kind === 'root') {
      above = 'START · SUSPECT · HOP 0';
      aboveColor = '#A58B6F';
    } else if (terminal) {
      above = node.hop != null ? `FINAL DESTINATION · HOP ${node.hop}` : 'FINAL DESTINATION';
      aboveColor = '#22D3EE';
    } else if (node.hop != null) {
      above = `HOP ${node.hop}`;
    }

    if (above) {
      ctx.textBaseline = 'top';
      ctx.font = `600 ${scale}px monospace`;
      ctx.fillStyle = aboveColor;
      ctx.fillText(above, x, y - r - 9);
    }

    const addr = shortAddress(node.id, 6, 4);
    ctx.textBaseline = 'top';
    ctx.font = `${state.selected ? 600 : 400} ${scale}px monospace`;
    ctx.fillStyle = state.selected || node.kind === 'root' ? '#FFFFFF' : 'rgba(218, 218, 220, 0.85)';
    ctx.fillText(addr, x, y + r + 5);

    // Real backend attribution only — never inferred or demo labels.
    if (terminal) {
      const tag = nodeAttributionTag(node);
      if (tag) {
        ctx.font = `500 ${scale - 1}px monospace`;
        ctx.fillStyle = tag.verified ? '#34D399' : 'rgba(148, 163, 184, 0.65)';
        ctx.fillText(tag.text, x, y + r + 5 + scale + 3);
      }
    }
  }

  ctx.restore();
}

export interface EdgePaintState {
  selected: boolean;
  onPath: boolean;
  dimmed: boolean;
  asset: string;
  maxValue: number;
}

/** Draw a money-flow edge: directional line weighted by value, arrowhead and value label. */
export function paintEdge(
  ctx: CanvasRenderingContext2D,
  edge: DerivedEdge & { source: any; target: any },
  globalScale: number,
  state: EdgePaintState
): void {
  const sx = edge.source?.x ?? 0;
  const sy = edge.source?.y ?? 0;
  const tx = edge.target?.x ?? 0;
  const ty = edge.target?.y ?? 0;

  ctx.save();
  ctx.globalAlpha = state.dimmed ? 0.1 : 1;

  const angle = Math.atan2(ty - sy, tx - sx);
  const sourceNode = typeof edge.source === 'object' && edge.source ? edge.source : null;
  const targetNode = typeof edge.target === 'object' && edge.target ? edge.target : null;
  const sourceRadius = sourceNode ? nodeVisualRadius(sourceNode) : 6;
  const targetRadius = targetNode ? nodeVisualRadius(targetNode) : 6;

  const width = Math.max(edgeDisplayWidth(edge, state.maxValue), 1.5) * (state.selected || state.onPath ? 1.35 : 1);
  const color = state.selected
    ? EDGE_SELECTED
    : state.onPath
      ? PATH_COLOR
      : EDGE_COLOR;

  const headX = tx - Math.cos(angle) * (targetRadius + 2.5);
  const headY = ty - Math.sin(angle) * (targetRadius + 2.5);
  const startX = sx + Math.cos(angle) * (sourceRadius + 2);
  const startY = sy + Math.sin(angle) * (sourceRadius + 2);

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(headX, headY);
  ctx.lineWidth = Math.min(width, 8);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Directional arrowhead (real transaction direction, derived from backend data).
  ctx.translate(headX, headY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4.6, 2.6);
  ctx.lineTo(-4.6, -2.6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  if (!state.dimmed) {
    paintEdgeLabel(ctx, edge, globalScale, {
      selected: state.selected,
      onPath: state.onPath,
      dimmed: false,
      asset: state.asset,
    });
  }
}

/** Edge label: transaction value (always) + short hash (on selection/zoom). Real data only. */
export function paintEdgeLabel(
  ctx: CanvasRenderingContext2D,
  edge: DerivedEdge & { source: any; target: any },
  globalScale: number,
  state: { selected: boolean; onPath: boolean; dimmed: boolean; asset: string }
): void {
  if (state.dimmed) return;
  const show = state.selected || state.onPath || globalScale >= 1.2;
  if (!show) return;

  const sx = edge.source?.x ?? 0;
  const sy = edge.source?.y ?? 0;
  const tx = edge.target?.x ?? 0;
  const ty = edge.target?.y ?? 0;
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  const lines: string[] = [];
  if (edge.value !== null && Number.isFinite(edge.value)) {
    const abs = Math.abs(edge.value);
    const decimals = abs === 0 ? 0 : abs < 0.0001 ? 8 : abs < 0.01 ? 6 : 4;
    lines.push(`${edge.value.toFixed(decimals)}${state.asset !== 'N/A' ? ` ${state.asset}` : ''}`);
  } else {
    lines.push('VALUE: N/A');
  }
  if (state.selected || state.onPath || globalScale >= 1.2) {
    if (edge.hash) lines.push(`TX: ${shortAddress(edge.hash, 8, 6)}`);
  }

  ctx.save();
  const fs = 4.2 / Math.max(globalScale, 0.85) + 2.2;
  ctx.font = `500 ${fs}px monospace`;
  ctx.textAlign = 'center';
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const pad = 5;
  const boxW = textW + pad * 2;
  const boxH = lines.length * (fs + 3) + pad * 2;
  ctx.fillStyle = 'rgba(8, 8, 10, 0.84)';
  ctx.fillRect(mx - boxW / 2, my - boxH / 2, boxW, boxH);
  ctx.fillStyle = state.selected ? '#E7D7BF' : 'rgba(196, 164, 130, 0.9)';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, mx, my - boxH / 2 + pad + i * (fs + 3)));
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