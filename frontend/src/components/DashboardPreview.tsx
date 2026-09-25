import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Search,
  Wallet,
  GitFork,
  Activity,
  Building2,
  FileText,
  Settings,
  Bell,
  User,
  ShieldAlert,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const DashboardPreview: React.FC = () => {
  const [activeNav, setActiveNav] = useState('OVERVIEW');
  const [searchFilter, setSearchFilter] = useState('');

  const sidebarItems = [
    { label: 'OVERVIEW', icon: LayoutDashboard },
    { label: 'INVESTIGATIONS', icon: Search },
    { label: 'WALLETS', icon: Wallet },
    { label: 'NETWORK GRAPH', icon: GitFork },
    { label: 'TRANSACTIONS', icon: Activity },
    { label: 'EXCHANGE INTELLIGENCE', icon: Building2 },
    { label: 'REPORTS', icon: FileText },
    { label: 'SETTINGS', icon: Settings },
  ];

  const recentInvestigations = [];

  const filteredCases = [];

  return (
    <section id="dashboard-preview" className="relative z-10 py-24 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em] mb-4">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Unified Tactical Command</span>
        </div>
        <h2 className="font-playfair text-3xl sm:text-5xl font-light text-white tracking-tight mb-4">
          Forensics Command Center
        </h2>
        <p className="font-inter text-neutral-400 opacity-80 text-sm sm:text-base leading-relaxed">
          The operational workspace used by law enforcement, financial intelligence units, and forensic investigators to manage active cases and asset recovery workflows.
        </p>
      </div>

      {/* Realistic Dashboard Frame Mockup */}
      <div className="glass-card rounded-3xl glass-border shadow-2xl overflow-hidden bg-[#070707] border border-white/10">
        {/* Mock Browser/Window Header */}
        <div className="px-6 py-3.5 bg-black/80 border-b border-white/10 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/70 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/70 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/70 inline-block" />
            <span className="text-neutral-500 text-[11px] ml-3 hidden sm:inline">
              chaintrace-forensics.internal // node-auth: 0x9812-LEA-RESTRICTED
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-neutral-400">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ENC-VPN: SECURE
            </span>
            <span className="hidden sm:inline text-neutral-600">|</span>
            <span className="hidden sm:inline">OFFICIAL USE ONLY</span>
          </div>
        </div>

        {/* Dashboard Body Layout: Sidebar + Main Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* Left Sidebar (User Specified: OVERVIEW, INVESTIGATIONS, WALLETS, NETWORK GRAPH, TRANSACTIONS, EXCHANGE INTELLIGENCE, REPORTS, SETTINGS) */}
          <div className="lg:col-span-3 bg-black/60 border-r border-white/10 p-5 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Agency User Profile Badge */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="w-9 h-9 rounded-xl bg-[#A58B6F]/20 border border-[#A58B6F]/40 flex items-center justify-center text-[#A58B6F] font-bold text-xs">
                  IN
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-white truncate">Inv. R. Sharma</div>
                  <div className="text-[10px] font-mono text-neutral-400 truncate">
                    Cyber Forensics Cell
                  </div>
                </div>
              </div>

              {/* Sidebar Menu Items */}
              <nav className="space-y-1 font-mono text-[11px] uppercase tracking-wider">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.label;

                  return (
                    <button
                      key={item.label}
                      onClick={() => setActiveNav(item.label)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#A58B6F] text-black font-bold shadow-md'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-[#A58B6F]'}`} />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Engine Health Indicator */}
            <div className="pt-6 border-t border-white/5 text-[10px] font-mono text-neutral-500 space-y-1">
              <div className="flex items-center justify-between text-neutral-400">
                <span>GRAPH NODES</span>
                <span className="text-white">16,384</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>AVG LATENCY</span>
                <span className="text-emerald-400">1.4ms</span>
              </div>
            </div>
          </div>

          {/* Right Main Dashboard Area */}
          <div className="lg:col-span-9 p-6 sm:p-8 space-y-6 bg-[#080808]">
            {/* Top Greeting & Metric KPI Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#A58B6F]">
                  INVESTIGATION DASHBOARD
                </span>
                <h3 className="font-playfair text-2xl font-light text-white tracking-tight mt-0.5">
                  GOOD MORNING, INVESTIGATOR
                </h3>
              </div>

              {/* Action search bar inside mockup */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter cases or wallets..."
                  className="pl-9 pr-4 py-2 rounded-full bg-black/60 border border-white/10 text-white placeholder-neutral-500 text-xs font-mono focus:outline-none focus:border-[#A58B6F] w-full sm:w-56"
                />
              </div>
            </div>

            {/* 4 Core KPIs - Empty state when no real investigations */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  Active Investigations
                </div>
                <div className="font-inter text-3xl font-bold tracking-tight text-white mt-1">0</div>
                <div className="text-[10px] text-neutral-500 font-mono mt-1">
                  No active cases
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  High Risk Wallets
                </div>
                <div className="font-inter text-3xl font-bold tracking-tight text-white mt-1">0</div>
                <div className="text-[10px] text-neutral-500 font-mono mt-1">
                  No risk wallets
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  Funds Traced
                </div>
                <div className="font-inter text-3xl font-bold tracking-tight text-white mt-1">$0</div>
                <div className="text-[10px] text-neutral-500 font-mono mt-1">
                  No funds traced
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  Exchange Leads
                </div>
                <div className="font-inter text-3xl font-bold tracking-tight text-white mt-1">0</div>
                <div className="text-[10px] text-neutral-500 font-mono mt-1">
                  No leads identified
                </div>
              </div>
            </div>

            {/* Middle Row - Empty state */}
            <div className="space-y-6">
              <div className="p-8 rounded-2xl bg-black/60 border border-white/5 text-center">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#A58B6F] mb-3">
                  RISK DISTRIBUTION
                </div>
                <p className="text-neutral-400 text-sm">No investigation data available. Start a live investigation to populate risk analytics.</p>
              </div>

              <div className="p-8 rounded-2xl bg-black/60 border border-white/5 text-center">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#A58B6F] mb-3">
                  TRANSACTION VELOCITY
                </div>
                <p className="text-neutral-400 text-sm">No transaction data available. Run a live investigation to see velocity metrics.</p>
              </div>
            </div>

            {/* Recent Investigations Table - Empty state */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                <span className="text-white font-semibold">RECENT INVESTIGATIONS TABLE</span>
                <span>SHOWING 0 CASES</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/40">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] uppercase text-neutral-400">
                    <tr>
                      <th className="py-3 px-4">Case ID</th>
                      <th className="py-3 px-4">Suspect Wallet</th>
                      <th className="py-3 px-4">Risk Score</th>
                      <th className="py-3 px-4">Network</th>
                      <th className="py-3 px-4">Funds Traced</th>
                      <th className="py-3 px-4">Exchange Lead</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr className="text-center text-neutral-500 py-8">
                      <td colSpan={7}>No investigations found. Start a live investigation to see results here.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
