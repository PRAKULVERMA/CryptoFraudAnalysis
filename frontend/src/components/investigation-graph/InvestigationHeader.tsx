import React from 'react';
import { Fingerprint, AlertTriangle, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import type { InvestigationResult } from './investigationGraphStore';
import { shortAddress } from './graphFormat';
import { Chip, CopyButton } from './ui';

export type TraceStatusCode =
  | 'IDLE'
  | 'RUNNING'
  | 'PROVIDER_ERROR'
  | 'NO_TRANSACTIONS'
  | 'PARTIAL_TRACE'
  | 'COMPLETE';

export interface TraceStatus {
  code: TraceStatusCode;
  label: string;
  className: string;
}

/**
 * Status derives ONLY from real backend fields.
 * Partial data is never presented as complete.
 */
export function deriveTraceStatus(
  result: InvestigationResult | null,
  isRunning: boolean,
  error: string | null
): TraceStatus {
  if (isRunning) {
    return {
      code: 'RUNNING',
      label: 'TRACE RUNNING',
      className: 'text-[#C4A482] border-[#A58B6F]/40 bg-[#A58B6F]/10',
    };
  }
  if (error) {
    return {
      code: 'PROVIDER_ERROR',
      label: 'PROVIDER ERROR',
      className: 'text-red-400 border-red-500/30 bg-red-500/10',
    };
  }
  if (!result) {
    return {
      code: 'IDLE',
      label: 'STANDBY',
      className: 'text-neutral-500 border-white/15 bg-white/5',
    };
  }
  const summary = result.trace_summary ?? {};
  const txCount = Number(summary.transactions_analyzed ?? result.transactionsAnalyzed ?? 0);
  if (!Number.isFinite(txCount) || txCount === 0) {
    return {
      code: 'NO_TRANSACTIONS',
      label: 'NO TRANSACTIONS',
      className: 'text-neutral-400 border-white/15 bg-white/5',
    };
  }
  const limitsReached = Array.isArray(summary.limits_reached) ? summary.limits_reached : [];
  if (summary.partial === true || limitsReached.length > 0) {
    return {
      code: 'PARTIAL_TRACE',
      label: 'PARTIAL TRACE',
      className: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    };
  }
  return {
    code: 'COMPLETE',
    label: 'TRACE COMPLETE',
    className: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  };
}

const riskChipClass = (level?: string): string => {
  switch (String(level || '').toUpperCase()) {
    case 'CRITICAL':
      return 'text-red-400 border-red-500/30 bg-red-500/10';
    case 'HIGH':
      return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    case 'MEDIUM':
      return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
    case 'LOW':
      return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    default:
      return 'text-neutral-400 border-white/15 bg-white/5';
  }
};

const Metric = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0">
    <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-neutral-500 whitespace-nowrap">
      {label}
    </div>
    <div className="text-[11px] font-mono text-neutral-100 truncate mt-0.5">{value}</div>
  </div>
);

export const InvestigationHeader = ({
  result,
  status,
}: {
  result: InvestigationResult;
  status: TraceStatus;
}) => {
  const summary = result.trace_summary ?? {};
  const graphAnalysis = result.graph_analysis ?? {};
  const attributionSummary = result.destination_intelligence?.attribution_summary ?? {};
  const riskLevel = result.riskLevel ?? null;
  const riskScore = typeof result.riskScore === 'number' ? `${result.riskScore}/100` : 'N/A';
  const hopDepth = summary.max_hops ?? summary.max_hops_reached ?? result.hopCount;
  const walletCount = summary.wallets_discovered ?? 'N/A';
  const txCount = summary.transactions_analyzed ?? result.transactionsAnalyzed ?? 'N/A';
  const fundsTraced = summary.funds_traced ?? result.fundsTraced ?? 'N/A';
  const isDemo = result.mode === 'DEMO' || result.synthetic === true;
  const isFallback = String(graphAnalysis.status ?? '').toUpperCase() === 'FALLBACK';
  const isUnknownDestination =
    String(attributionSummary.status ?? '').toUpperCase() === 'UNKNOWN';

  return (
    <div className="glass-card rounded-2xl border glass-border bg-[#0a0a0a]/90 backdrop-blur-xl px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#A58B6F]/10 border border-[#A58B6F]/25 flex items-center justify-center text-[#A58B6F]">
            <Fingerprint className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white font-semibold">
              Case {result.caseId ?? 'N/A'}
            </div>
            <div className="text-[9px] font-mono text-neutral-500">
              {result.timestamp ? String(result.timestamp).slice(0, 19).replace('T', ' ') : 'N/A'}
            </div>
          </div>
        </div>

        <div className="hidden sm:block w-px h-8 bg-white/10" />

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-6 gap-y-3 flex-1 min-w-0">
          <Metric
            label="Network"
            value={result.network ? String(result.network).toUpperCase() : 'N/A'}
          />
          <Metric
            label="Root Wallet"
            value={
              <span className="flex items-center gap-1.5">
                <span title={result.address ?? ''}>
                  {shortAddress(result.address, 6, 4)}
                </span>
                <CopyButton value={result.address} />
              </span>
            }
          />
          <Metric
            label="Risk"
            value={
              <span className="flex items-center gap-1.5">
                <Chip className={riskChipClass(riskLevel ?? undefined)}>
                  {riskLevel ?? 'N/A'}
                </Chip>
                {riskScore}
              </span>
            }
          />
          <Metric label="Trace Depth" value={hopDepth ?? 'N/A'} />
          <Metric label="Wallets" value={String(walletCount)} />
          <Metric label="Transactions" value={String(txCount)} />
        </div>

        <div className="hidden md:block w-px h-8 bg-white/10" />

        <Metric
          label="Funds Traced"
          value={<span className="text-[#C4A482]">{String(fundsTraced)}</span>}
        />

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Chip className={status.className}>{status.label}</Chip>
          {isUnknownDestination && (
            <Chip
              className="text-neutral-400 border-white/15 bg-white/5"
              title="No verified attribution for the traced destination"
            >
              <ShieldAlert className="w-2.5 h-2.5" />
              Unknown Destination
            </Chip>
          )}
          {isDemo && (
            <Chip
              className="text-sky-300 border-sky-500/30 bg-sky-500/10"
              title="Investigation ran against the demo dataset"
            >
              <Info className="w-2.5 h-2.5" />
              Demo Data
            </Chip>
          )}
          {isFallback && (
            <Chip
              className="text-amber-300/80 border-amber-500/20 bg-amber-500/5"
              title="Graph analysis service unavailable — in-memory analysis used"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              Neo4j Fallback
            </Chip>
          )}
        </div>
      </div>

      {status.code === 'PARTIAL_TRACE' && (
        <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-amber-300/80 border-t border-white/5 pt-2">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>
            Trace depth or rate limits were reached — displayed path may be incomplete.
            {Array.isArray(summary.limits_reached) && summary.limits_reached.length > 0
              ? ` Limits: ${summary.limits_reached.join(', ')}`
              : ''}
          </span>
        </div>
      )}

      {status.code === 'COMPLETE' && (
        <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-emerald-400/70 border-t border-white/5 pt-2">
          <ShieldCheck className="w-3 h-3 shrink-0" />
          <span>Full trace returned by the investigation engine</span>
        </div>
      )}
    </div>
  );
};