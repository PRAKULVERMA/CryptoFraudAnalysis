import React, { useState, useEffect } from 'react';
import {
  Radio,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useInvestigationState } from './investigation-graph/investigationGraphStore';

/** Never render a fabricated value — unknown backend data shows as N/A. */
const val = (v: any): string => {
  if (v === null || v === undefined || v === '') return 'N/A';
  return String(v);
};

const formatClock = (value: any): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleTimeString();
};

export const RealtimeMonitoring: React.FC = () => {
  const { result, isRunning, error, address } = useInvestigationState();
  const [monitoringData, setMonitoringData] = useState<any>(null);

  const features = [
    'Multi-Hop Transaction Tracking',
    'Automated Risk Scoring',
    'Wallet Relationship Analysis',
    'Exchange Destination Detection',
    'Investigation Timeline',
  ];

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/monitoring/status', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || controller.signal.aborted) return;
        setMonitoringData(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('Monitoring fetch failed:', err);
      });

    return () => controller.abort();
  }, []);

  const edges = Array.isArray(result?.edges) ? result.edges : [];
  const liveEvents = edges.slice(0, 6);

  return (
    <section id="live-monitoring" className="relative z-10 py-24 px-6 sm:px-10 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Editorial & Feature Bullets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em]">
            <Radio className="w-3.5 h-3.5 text-[#A58B6F] animate-pulse" />
            <span>Active Mempool Sentinel</span>
          </div>

          <h2 className="font-playfair text-3xl sm:text-5xl font-light text-white tracking-tight leading-[1.1]">
            Monitor Fund Movement in Real Time
          </h2>

          <p className="font-inter text-neutral-400 text-sm sm:text-base opacity-80 leading-relaxed">
            Track how suspicious funds move through blockchain networks and receive intelligence as new transaction activity is detected.
          </p>

          {/* User Required 5 Features with bullet dots */}
          <div className="space-y-3 pt-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3 font-inter text-sm text-neutral-200">
                <span className="w-2 h-2 rounded-full bg-[#A58B6F] shadow-[0_0_8px_rgba(165,139,111,0.6)]" />
                <span className="tracking-wide font-medium">{feature}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center gap-4 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  monitoringData ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
                }`}
              />
              <span>
                Provider: {monitoringData ? val(monitoringData.blockchain_provider) : 'unavailable'}
              </span>
            </div>
            <span>•</span>
            <span>EVM &amp; UTXO Parity</span>
          </div>
        </div>

        {/* Right Side: Command Center bound to the live investigation state */}
        <div className="lg:col-span-7">
          <div className="glass-card rounded-3xl p-6 sm:p-8 glass-border relative overflow-hidden bg-[#070707] shadow-2xl">
            {/* Command-Center Radar Background Sweep Effect */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full radar-sweep pointer-events-none opacity-40" />

            {/* Top Bar with Case ID and Status */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#A58B6F] block mb-1">
                  TACTICAL LIVE MONITOR
                </span>
                <div className="font-mono text-sm sm:text-lg font-bold text-white tracking-wide break-all">
                  {result ? val(result.caseId) : 'NO ACTIVE INVESTIGATION'}
                </div>
              </div>

              {/* Status Pill */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-xs font-bold uppercase tracking-wider shadow-sm ${
                  isRunning
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : error
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : result
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/[0.03] border-white/10 text-neutral-500'
                }`}
              >
                {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
                {!isRunning && <span className="w-2 h-2 rounded-full bg-current" />}
                <span>
                  {isRunning ? 'TRACING' : error ? 'FAILED' : result ? 'COMPLETED' : 'IDLE'}
                </span>
              </div>
            </div>

            {/* 4 Core Telemetry Metric Cards — real investigation values only */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-6">
              {/* Last Activity */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  LAST ACTIVITY
                </div>
                <div className="font-mono text-sm font-bold text-white mt-1 break-all">
                  {formatClock(result?.trace_summary?.last_timestamp ?? result?.timestamp)}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  {result ? 'From ledger data' : 'Awaiting trace'}
                </div>
              </div>

              {/* Funds Moved */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  FUNDS TRACED
                </div>
                <div className="font-mono text-sm font-bold text-white mt-1 break-all">
                  {val(result?.fundsTraced)}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  {val(result?.transactionsAnalyzed)} transactions
                </div>
              </div>

              {/* Risk Level */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  RISK LEVEL
                </div>
                <div className="font-mono text-sm font-bold text-red-400 mt-1 flex items-center gap-1.5 break-all">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  {val(result?.riskLevel)}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  Score: {val(result?.riskScore)} / 100
                </div>
              </div>

              {/* Destination */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  DESTINATION
                </div>
                <div className="font-mono text-xs font-bold text-emerald-400 mt-1 break-all">
                  {val(result?.destinationExchange)}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  Confidence: {val(result?.confidence)}
                </div>
              </div>
            </div>

            {/* Live Transaction Stream — real backend edges */}
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-inter uppercase font-semibold text-neutral-400 pb-1 tracking-wider">
                <span>RECENT MULTI-HOP ON-CHAIN EVENTS</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {result ? `${edges.length} edges traced` : 'No trace'}
                </span>
              </div>

              {liveEvents.length > 0 ? (
                liveEvents.map((edge: any, i: number) => (
                  <div
                    key={String(edge.transactionId ?? edge.hash ?? i)}
                    className="p-3 rounded-xl bg-black/60 border border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold border border-[#A58B6F]/30 text-[#C4A482] shrink-0">
                        HOP {val(edge.hop)}
                      </span>
                      <div className="overflow-hidden min-w-0">
                        <div className="text-white font-inter text-xs font-medium truncate">
                          {val(edge.direction)} transfer
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400 truncate">
                          Hash: {val(edge.hash ?? edge.transactionId)} • {formatClock(edge.timestamp)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-white font-mono font-bold text-xs sm:text-sm break-all">
                        {val(edge.value)}
                      </div>
                      <div className="text-[10px] font-inter text-neutral-400">
                        {val(result?.trace_summary?.asset)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-xl border border-white/5 bg-white/[0.015] text-center">
                  <p className="text-xs font-mono text-neutral-500">
                    {isRunning
                      ? 'Tracing fund flow — live events will appear here.'
                      : 'No investigation data yet. Run a wallet investigation above to stream real on-chain events.'}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Alert Action Banner */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-amber-300 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="break-all">
                  {result
                    ? `Subpoena-ready packet available for ${address ?? val(result.address)}.`
                    : 'No subpoena packet generated. No investigation has been run.'}
                </span>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('dashboard-preview');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-[10px] font-mono uppercase tracking-widest text-[#A58B6F] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Open in Command Center</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
