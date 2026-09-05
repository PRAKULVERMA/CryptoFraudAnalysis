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
    { label: 'INVESTIGATIONS', icon: Search, badge: '24' },
    { label: 'WALLETS', icon: Wallet },
    { label: 'NETWORK GRAPH', icon: GitFork },
    { label: 'TRANSACTIONS', icon: Activity },
    { label: 'EXCHANGE INTELLIGENCE', icon: Building2, badge: '8 Leads' },
    { label: 'REPORTS', icon: FileText },
    { label: 'SETTINGS', icon: Settings },
  ];

  const recentInvestigations = [
    {
      caseId: 'CT-2026-00421',
      targetWallet: 'bc1q8x9l4h9g2e75kdf8wqp39nm7x4f9',
      riskScore: 87,
      riskLevel: 'HIGH',
      network: 'Bitcoin',
      funds: '2.48 BTC ($161.2K)',
      status: 'Active Tracing',
      statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      lead: 'Binance Hot Wallet #14',
    },
    {
      caseId: 'CT-2026-00418',
      targetWallet: '0xA120B48F705B35C1580A7712E11608d087B89',
      riskScore: 94,
      riskLevel: 'CRITICAL',
      network: 'Ethereum',
      funds: '148.5 ETH ($386.1K)',
      status: 'Subpoena Ready',
      statusColor: 'text-red-400 bg-red-500/10 border-red-500/20',
      lead: 'Tornado.Cash Ring Exit',
    },
    {
      caseId: 'CT-2026-00392',
      targetWallet: 'bc1qpeel773910293410293481239',
      riskScore: 68,
      riskLevel: 'MEDIUM',
      network: 'Bitcoin',
      funds: '0.92 BTC ($59.8K)',
      status: 'Mule Layering',
      statusColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      lead: 'OKX Deposit Gateway',
    },
    {
      caseId: 'CT-2026-00385',
      targetWallet: '0x71C3A90100481923091028301928301',
      riskScore: 91,
      riskLevel: 'CRITICAL',
      network: 'Ethereum',
      funds: '82.4 ETH ($214.2K)',
      status: 'Seizure Freeze Order',
      statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      lead: 'Kraken Institutional Custody',
    },
  ];

  const filteredCases = recentInvestigations.filter((c) =>
    c.caseId.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.targetWallet.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.network.toLowerCase().includes(searchFilter.toLowerCase())
  );

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
                      {item.badge && (
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            isActive
                              ? 'bg-black/20 text-black'
                              : 'bg-white/10 text-neutral-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
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

            {/* 4 Core KPIs Required by User Prompt:
                Active Investigations: 24
                High Risk Wallets: 17
                Funds Traced: $2.4M
                Exchange Leads: 8 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  Active Investigations
                </div>
                <div className="font-inter text-3xl font-bold tracking-tight text-white mt-1">24</div>
                <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +3 this week
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-red-300">
                  High Risk Wallets
                </div>
                <div className="font-inter text-3xl font-bold tracking-tight text-red-400 mt-1">17</div>
                <div className="text-[10px] text-red-400/80 font-mono mt-1">
                  OFAC / Mixer Tainted
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-neutral-400">
                  Funds Traced
                </div>
                <div className="font-inter text-3xl font-bold tracking-tight text-white mt-1">$2.4M</div>
                <div className="text-[10px] text-[#A58B6F] font-mono mt-1">
                  Across 7 blockchains
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
                <div className="text-[10px] font-inter font-semibold uppercase tracking-wider text-emerald-300">
                  Exchange Leads
                </div>
                <div className="font-inter text-3xl font-bold tracking-tight text-emerald-400 mt-1">8</div>
                <div className="text-[10px] text-emerald-400/80 font-mono mt-1">
                  KYC Identified
                </div>
              </div>
            </div>

            {/* Middle Row: Risk Distribution Chart + Transaction Activity Graph */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Risk Distribution Chart (md:col-span-5) */}
              <div className="md:col-span-5 p-5 rounded-2xl bg-black/60 border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-4">
                    <span>RISK DISTRIBUTION</span>
                    <span className="text-[#A58B6F]">TOTAL: 148 WALLETS</span>
                  </div>

                  {/* Visual Multi-Segment Risk Bar */}
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex gap-1 mb-4">
                    <div className="h-full bg-red-500 rounded-l-full" style={{ width: '42%' }} title="Critical Risk (42%)" />
                    <div className="h-full bg-orange-500" style={{ width: '28%' }} title="High Risk (28%)" />
                    <div className="h-full bg-amber-400" style={{ width: '18%' }} title="Medium Risk (18%)" />
                    <div className="h-full bg-blue-500 rounded-r-full" style={{ width: '12%' }} title="Low Risk (12%)" />
                  </div>

                  {/* Breakdown Legend */}
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Critical (Mixers / OFAC)
                      </span>
                      <span className="font-bold text-red-400">42% (62 wallets)</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        High (Layering Chains)
                      </span>
                      <span className="font-bold text-orange-400">28% (41 wallets)</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Medium (Mule Intermediaries)
                      </span>
                      <span className="font-bold text-amber-300">18% (27 wallets)</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Low (Unverified Forwarders)
                      </span>
                      <span className="font-bold text-blue-400">12% (18 wallets)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 text-[10px] font-mono text-neutral-500 flex items-center justify-between">
                  <span>Dynamic heuristic re-scoring enabled</span>
                  <span className="text-emerald-400">Auto-Update</span>
                </div>
              </div>

              {/* Transaction Activity Graph (md:col-span-7) */}
              <div className="md:col-span-7 p-5 rounded-2xl bg-black/60 border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-3">
                    <span>TRANSACTION VELOCITY & TAINT PROGRESSION</span>
                    <span className="text-emerald-400">LAST 24 HOURS</span>
                  </div>

                  {/* Custom SVG Activity Line / Bar Chart */}
                  <div className="h-36 w-full relative pt-2">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 100">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A58B6F" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#A58B6F" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                      <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                      <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

                      {/* Area Fill */}
                      <polygon
                        fill="url(#chartGradient)"
                        points="0,100 0,70 40,60 80,85 120,45 160,30 200,65 240,25 280,40 320,15 360,35 400,20 400,100"
                      />

                      {/* Main Trend Line */}
                      <polyline
                        fill="none"
                        stroke="#A58B6F"
                        strokeWidth="2.5"
                        points="0,70 40,60 80,85 120,45 160,30 200,65 240,25 280,40 320,15 360,35 400,20"
                      />

                      {/* Peak markers */}
                      <circle cx="240" cy="25" r="3.5" fill="#ef4444" />
                      <circle cx="320" cy="15" r="3.5" fill="#A58B6F" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-2 border-t border-white/5">
                    <span>00:00 UTC</span>
                    <span>06:00 UTC</span>
                    <span>12:00 UTC</span>
                    <span>18:00 UTC</span>
                    <span>CURRENT</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 text-xs font-mono text-neutral-400">
                  <span>Peak Layering Velocity: <strong className="text-white">14.2 BTC/hr</strong></span>
                  <span className="text-[#A58B6F]">High Anomaly Triggered</span>
                </div>
              </div>
            </div>

            {/* Recent Investigations Table with Status Indicators */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                <span className="text-white font-semibold">RECENT INVESTIGATIONS TABLE</span>
                <span>SHOWING {filteredCases.length} OF 24 CASES</span>
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
                    {filteredCases.map((item) => (
                      <tr key={item.caseId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {item.caseId}
                        </td>
                        <td className="py-3 px-4 text-neutral-300 font-mono text-[11px] truncate max-w-[150px]">
                          {item.targetWallet}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-red-400 font-bold">{item.riskScore}</span>
                          <span className="text-neutral-500 text-[10px]">/100</span>
                        </td>
                        <td className="py-3 px-4 text-neutral-300">
                          {item.network}
                        </td>
                        <td className="py-3 px-4 text-white font-medium whitespace-nowrap">
                          {item.funds}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 text-[11px] truncate max-w-[140px]">
                          {item.lead}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.statusColor}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
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
