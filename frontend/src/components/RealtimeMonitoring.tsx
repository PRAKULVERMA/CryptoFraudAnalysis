import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Radio,
  Clock,
  ShieldAlert,
  Building2,
  GitFork,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Flame,
} from 'lucide-react';

export const RealtimeMonitoring: React.FC = () => {
  const [secondsAgo, setSecondsAgo] = useState(12);
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [liveEvents, setLiveEvents] = useState([
    {
      time: '12s ago',
      txHash: '0x8f2a...9b41',
      action: 'Consolidation transfer into Pre-Deposit Cluster',
      amount: '0.85 BTC',
      tag: 'Hop 06',
      badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    },
    {
      time: '48s ago',
      txHash: '0x3c11...881f',
      action: 'Micro-split peeling detected (0.12 BTC retained in mule)',
      amount: '0.38 BTC',
      tag: 'Hop 05',
      badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    },
    {
      time: '2m 14s ago',
      txHash: '0xa9d4...7120',
      action: 'Darknet mixer exit transaction resolved',
      amount: '1.25 BTC',
      tag: 'Hop 04',
      badgeColor: 'text-red-400 bg-red-400/10 border-red-400/20',
    },
  ]);

  const features = [
    'Multi-Hop Transaction Tracking',
    'Automated Risk Scoring',
    'Wallet Relationship Analysis',
    'Exchange Destination Detection',
    'Investigation Timeline',
  ];

  // Live simulated seconds timer for telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => (prev >= 60 ? 1 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/monitoring/status')
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        setMonitoringData(data);
        if (data.recentAlerts && data.recentAlerts.length > 0) {
          setLiveEvents(
            data.recentAlerts.map((alert: any, i: number) => ({
              time: `${Math.floor(Math.random() * 60) + 1}s ago`,
              txHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
              action: alert.message,
              amount: `${(Math.random() * 2).toFixed(2)} BTC`,
              tag: `ALT-${alert.id.split('-')[1] || '000'}`,
              badgeColor: alert.severity === 'critical' ? 'text-red-400 bg-red-400/10 border-red-400/20' : alert.severity === 'high' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-blue-400 bg-blue-400/10 border-blue-400/20',
            }))
          );
        }
      })
      .catch((err) => console.error('Monitoring fetch failed:', err));
  }, []);

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
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>P99 Mempool Detection: 1.2s</span>
            </div>
            <span>•</span>
            <span>EVM & UTXO Parity</span>
          </div>
        </div>

        {/* Right Side: Command-Center Live Monitoring Dashboard Mockup */}
        <div className="lg:col-span-7">
          <div className="glass-card rounded-3xl p-6 sm:p-8 glass-border relative overflow-hidden bg-[#070707] shadow-2xl">
            {/* Command-Center Radar Background Sweep Effect */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full radar-sweep pointer-events-none opacity-40" />

            {/* Top Bar with Case ID and Status */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#A58B6F] block mb-1">
                  TACTICAL LIVE MONITOR
                </span>
                <div className="font-mono text-base sm:text-lg font-bold text-white tracking-wide">
                  INVESTIGATION #CT-2026-00421
                </div>
              </div>

              {/* Status Pill with Animated Pulse */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>● STATUS: ACTIVE</span>
              </div>
            </div>

            {/* 4 Core Telemetry Metric Cards */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-6">
              {/* Last Activity */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  LAST ACTIVITY
                </div>
                <div className="font-mono text-sm font-bold text-white mt-1">
                  {secondsAgo} seconds ago
                </div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Streaming
                </div>
              </div>

              {/* Funds Moved */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  FUNDS MOVED
                </div>
                <div className="font-mono text-sm font-bold text-white mt-1">
                  {monitoringData ? '2.48 BTC' : '2.48 BTC'}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  ~$161,200 USD
                </div>
              </div>

              {/* Risk Level */}
              <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-red-300">
                  RISK LEVEL
                </div>
                <div className="font-mono text-sm font-bold text-red-400 mt-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {monitoringData ? (monitoringData.activeAlerts > 0 ? 'HIGH' : 'MEDIUM') : 'HIGH'}
                </div>
                <div className="text-[10px] text-red-400/80 font-mono mt-0.5">
                  Score: {monitoringData ? '87' : '87'} / 100
                </div>
              </div>

              {/* Destination */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-emerald-300">
                  DESTINATION
                </div>
                <div className="font-mono text-xs font-bold text-emerald-400 mt-1 truncate">
                  {monitoringData ? 'EXCHANGE CLUSTER DETECTED' : 'EXCHANGE CLUSTER DETECTED'}
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
                  Confidence: {monitoringData ? '92%' : '92%'}
                </div>
              </div>
            </div>

            {/* Live Streaming Activity Stream */}
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-inter uppercase font-semibold text-neutral-400 pb-1 tracking-wider">
                <span>RECENT MULTI-HOP ON-CHAIN EVENTS</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Mempool Synced
                </span>
              </div>

              {liveEvents.map((evt, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-black/60 border border-white/5 flex items-center justify-between gap-3 text-xs group hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold border ${evt.badgeColor} shrink-0`}>
                      {evt.tag}
                    </span>
                    <div className="overflow-hidden">
                      <div className="text-white font-inter text-xs font-medium truncate group-hover:text-[#A58B6F] transition-colors">
                        {evt.action}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        Hash: {evt.txHash} • {evt.time}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-white font-mono font-bold text-xs sm:text-sm">{evt.amount}</div>
                    <div className="text-[10px] font-inter text-neutral-400">Layered</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Alert Action Banner */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Exchange KYC Subpoena Packet auto-generated and ready.</span>
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
