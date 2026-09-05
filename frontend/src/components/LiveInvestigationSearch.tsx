import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  GitFork,
  Building2,
  ExternalLink,
  FileText,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { InvestigationReportPreview } from './InvestigationReportPreview';

interface LiveInvestigationSearchProps {
  onSelectWalletForGraph?: (wallet: { address: string; network: string; risk: number }) => void;
}

export const LiveInvestigationSearch: React.FC<LiveInvestigationSearchProps> = ({
  onSelectWalletForGraph,
}) => {
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<'Bitcoin' | 'Ethereum'>('Bitcoin');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [investigationResult, setInvestigationResult] = useState<any | null>(null);
  const [showReportPreview, setShowReportPreview] = useState(false);

  const demoWallets = [
    {
      label: 'bc1q8...x4f9',
      fullAddress: 'bc1q8x9l4h9g2e75kdf8wqp39nm7x4f9',
      net: 'Bitcoin' as const,
      desc: 'LockBit Ransomware Extortion Wallet',
    },
    {
      label: '0xA12...7B89',
      fullAddress: '0xA120B48F705B35C1580A7712E11608d087B89',
      net: 'Ethereum' as const,
      desc: 'Tornado.Cash Multi-Hop Layering Ring',
    },
  ];

  const handleSelectDemo = (demo: typeof demoWallets[0]) => {
    setAddress(demo.fullAddress);
    setNetwork(demo.net);
    setValidationError(null);
    setInvestigationResult(null);
  };

  const validateAddress = (addr: string, net: 'Bitcoin' | 'Ethereum'): boolean => {
    const trimmed = addr.trim();
    if (!trimmed) {
      setValidationError('Please enter a wallet address to begin investigation.');
      return false;
    }
    if (net === 'Bitcoin') {
      const isBtc = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmed);
      if (!isBtc && !trimmed.startsWith('bc1q8')) {
        setValidationError('Invalid Bitcoin address format (Must begin with 1, 3, or bc1).');
        return false;
      }
    } else {
      const isEth = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
      if (!isEth && !trimmed.startsWith('0xA12')) {
        setValidationError('Invalid Ethereum address format (Must be 42 characters starting with 0x).');
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateAddress(address, network)) return;

    setIsLoading(true);
    setLoadingStep(1);
    setInvestigationResult(null);

    const stepTimer1 = setTimeout(() => setLoadingStep(2), 700);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 1500);
    const stepTimer3 = setTimeout(() => setLoadingStep(4), 2200);

    try {
      const response = await fetch('/api/investigate/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), network }),
      });

      const responseText = await response.text();
      let responseData: any = null;

      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        const message = responseData?.message || responseData?.error || responseText || `Investigation failed (${response.status})`;
        throw new Error(message);
      }

      const result = responseData;
      if (!result || typeof result !== 'object') {
        throw new Error('The investigation service returned an invalid response.');
      }

      setInvestigationResult(result);

      if (onSelectWalletForGraph) {
        onSelectWalletForGraph({
          address: address.trim(),
          network,
          risk: result.riskScore,
        });
      }
    } catch (error) {
      console.error('Investigation error:', error);
      setValidationError(error instanceof Error ? error.message : 'Investigation failed. Please try again.');
    } finally {
      setIsLoading(false);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
    }
  };

  return (
    <section id="investigate" className="relative z-20 py-20 px-6 sm:px-10 max-w-6xl mx-auto">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 cyber-grid-bg opacity-30 rounded-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative glass-card rounded-3xl p-8 sm:p-12 glass-border shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Subtle decorative scan line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#A58B6F] to-transparent opacity-80" />

        {/* Section Header */}
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em] mb-4">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Phase 01 / Live Investigation Search</span>
          </div>
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-tight mb-3">
            Start a Blockchain Investigation
          </h2>
          <p className="font-inter text-neutral-400 text-sm sm:text-base opacity-80 leading-relaxed">
            Enter a suspect wallet address to begin automated transaction tracing.
          </p>
        </div>

        {/* Search & Network Form */}
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch gap-3 bg-black/60 p-2 sm:p-2.5 rounded-2xl glass-border shadow-inner">
            {/* Network Selector */}
            <div className="relative flex items-center shrink-0">
              <select
                id="investigation-network-select"
                value={network}
                onChange={(e) => {
                  setNetwork(e.target.value as 'Bitcoin' | 'Ethereum');
                  setValidationError(null);
                }}
                className="w-full md:w-44 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-inter text-xs uppercase tracking-wider focus:outline-none focus:border-[#A58B6F] cursor-pointer"
              >
                <option value="Bitcoin" className="bg-[#101010] text-white">Bitcoin ▾</option>
                <option value="Ethereum" className="bg-[#101010] text-white">Ethereum ▾</option>
              </select>
            </div>

            {/* Address Input */}
            <div className="relative flex-1 flex items-center">
              <input
                id="investigation-wallet-input"
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setValidationError(null);
                }}
                placeholder="Enter Bitcoin or Ethereum wallet address........................"
                className="w-full px-4 sm:px-5 py-3.5 rounded-xl bg-transparent text-white placeholder-neutral-500 font-mono text-xs sm:text-sm focus:outline-none"
              />
              {address && (
                <button
                  type="button"
                  onClick={() => setAddress('')}
                  className="mr-2 text-[10px] uppercase font-mono text-neutral-500 hover:text-white px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Analyze Button */}
            <button
              id="investigation-analyze-btn"
              type="submit"
              disabled={isLoading}
              className="px-8 py-3.5 rounded-xl bg-[#A58B6F] text-black font-inter text-xs font-semibold uppercase tracking-widest hover:bg-[#C4A482] bronze-glow transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>TRACING...</span>
                </>
              ) : (
                <>
                  <span>ANALYZE WALLET</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs font-inter text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </motion.div>
          )}

          {/* Supported Networks & Try Demo Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 text-xs font-inter">
            <div className="flex items-center gap-2 text-neutral-400 opacity-70">
              <span className="uppercase tracking-wider font-mono text-[10px]">Supported Networks:</span>
              <span className="text-white font-medium">Bitcoin • Ethereum</span>
            </div>

            {/* Try Demo Wallets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-400 opacity-70 text-[11px]">Try demo:</span>
              {demoWallets.map((demo) => (
                <button
                  key={demo.label}
                  type="button"
                  onClick={() => handleSelectDemo(demo)}
                  className="px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-[#A58B6F]/50 text-neutral-200 font-mono text-[11px] transition-all cursor-pointer flex items-center gap-1.5"
                  title={demo.desc}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A58B6F]" />
                  <span>{demo.label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Loading Progress State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 pt-8 border-t border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#A58B6F] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#A58B6F] animate-ping" />
                  AUTOMATED FORENSIC TRAVERSAL IN PROGRESS
                </span>
                <span className="text-neutral-400">Step {loadingStep} of 4</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#A58B6F] to-[#f0f0f0] transition-all duration-500 rounded-full"
                  style={{ width: `${(loadingStep / 4) * 100}%` }}
                />
              </div>

              {/* Step Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px] font-mono text-neutral-400 pt-2">
                <div className={`p-2.5 rounded-lg border ${loadingStep >= 1 ? 'border-[#A58B6F]/40 text-white bg-white/[0.02]' : 'border-white/5 opacity-40'}`}>
                  01. Mempool & UTXO Ingestion
                </div>
                <div className={`p-2.5 rounded-lg border ${loadingStep >= 2 ? 'border-[#A58B6F]/40 text-white bg-white/[0.02]' : 'border-white/5 opacity-40'}`}>
                  02. Multi-Hop Graph Traversal
                </div>
                <div className={`p-2.5 rounded-lg border ${loadingStep >= 3 ? 'border-[#A58B6F]/40 text-white bg-white/[0.02]' : 'border-white/5 opacity-40'}`}>
                  03. Heuristic Clustering & AI
                </div>
                <div className={`p-2.5 rounded-lg border ${loadingStep >= 4 ? 'border-[#A58B6F]/40 text-white bg-white/[0.02]' : 'border-white/5 opacity-40'}`}>
                  04. Exchange Destination Match
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Investigation Dossier Result */}
        <AnimatePresence>
          {investigationResult && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 pt-8 border-t border-white/10"
            >
              <div className="p-6 sm:p-8 rounded-2xl bg-black/70 border border-[#A58B6F]/30 shadow-2xl relative overflow-hidden">
                {/* Result Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                        {investigationResult.riskLevel}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {investigationResult.caseId}
                      </span>
                    </div>
                    <div className="font-mono text-sm sm:text-base text-white break-all flex items-center gap-2">
                      <span className="text-[#A58B6F] font-bold">TARGET:</span> {investigationResult.address}
                    </div>
                  </div>

                  {/* Risk Badge */}
                  <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 px-5 py-2.5 rounded-xl">
                    <div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">RISK SCORE</div>
                      <div className="font-playfair text-2xl font-bold text-red-400">
                        {investigationResult.riskScore} <span className="text-xs font-normal text-neutral-400">/ 100</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Intelligence Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">FUNDS TRACED</div>
                    <div className="text-base font-semibold text-white mt-1">{investigationResult.fundsTraced}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Tainted Volume Tracked</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">HOP DEPTH</div>
                    <div className="text-base font-semibold text-white mt-1">{investigationResult.hopCount} Intermediary Hops</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{investigationResult.transactionsAnalyzed} Transactions Parsed</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">WALLET CLUSTER</div>
                    <div className="text-base font-semibold text-amber-300 mt-1 truncate">{investigationResult.clusteringTag}</div>
                    <div className="text-[10px] text-amber-400 mt-0.5">Automated Peeling Chain Detected</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">EXCHANGE DESTINATION</div>
                    <div className="text-base font-semibold text-emerald-400 mt-1 truncate">{investigationResult.destinationExchange}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Confidence: {investigationResult.confidence}</div>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                  <div className="text-xs text-neutral-400 font-inter">
                    <span className="text-emerald-400 font-semibold">● Ready for Intervention:</span> Subpoena-ready forensic data packet assembled for LEA submission.
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Generate Report */}
                    <button
                      type="button"
                      onClick={() => setShowReportPreview(true)}
                      className="px-5 py-2 rounded-full border border-[#A58B6F]/40 bg-[#A58B6F]/10 text-[#C4A482] text-xs font-semibold uppercase tracking-wider hover:bg-[#A58B6F]/20 hover:border-[#A58B6F]/70 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Generate Report</span>
                    </button>

                    {/* Inspect Graph */}
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('graph-network');

                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="px-5 py-2 rounded-full bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <GitFork className="w-3.5 h-3.5" />
                      <span>Inspect Graph Flow</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
                </AnimatePresence>
      </div>

      {/* Report Preview */}
      <AnimatePresence>
        {showReportPreview && investigationResult && (
          <InvestigationReportPreview
            investigation={investigationResult}
            onClose={() => setShowReportPreview(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
