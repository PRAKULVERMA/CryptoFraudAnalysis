import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  GitFork,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { InvestigationReportPreview } from './InvestigationReportPreview';
import {
  beginInvestigation,
  clearInvestigation,
  publishInvestigation,
} from './investigation-graph/investigationGraphStore';
import { useInvestigationRunner } from '../hooks/useInvestigationRunner';
import { fetchBackendMode } from '../services/investigationApi';

type NetworkOption = 'bitcoin' | 'ethereum';

interface LiveInvestigationSearchProps {
  onSelectWalletForGraph?: (wallet: { address: string; network: string; risk: number }) => void;
}

/** Strict address validation — no demo/default/example addresses are ever accepted. */
const isValidBitcoinAddress = (value: string): boolean =>
  /^(bc1|tb1|bcrt1)[ac-hj-np-z02-9]{11,71}$/i.test(value) || /^[13mn][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(value);

const isValidEthereumAddress = (value: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(value);

const validateAddress = (address: string, network: NetworkOption): string | null => {
  const trimmed = address.trim();
  if (!trimmed) return 'Please enter a wallet address to begin investigation.';
  if (network === 'bitcoin') {
    if (!isValidBitcoinAddress(trimmed)) {
      return 'Invalid Bitcoin address format (Must begin with 1, 3, bc1, tb1 or bcrt1).';
    }
    return null;
  }
  if (!isValidEthereumAddress(trimmed)) {
    return 'Invalid Ethereum address format (Must be 0x followed by 40 hex characters).';
  }
  return null;
};

const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** Human labels for the backend's own current_step vocabulary. */
const STAGE_LABELS: Record<string, string> = {
  VALIDATING_WALLET: 'Validating wallet address',
  FETCHING_WALLET_TRANSACTIONS: 'Fetching on-chain transactions',
  FETCHING_TRANSACTIONS: 'Fetching on-chain transactions',
  NORMALIZING_TRANSACTIONS: 'Normalizing transactions',
  BUILDING_TRACE: 'Tracing multi-hop fund flow',
  'INVESTIGATION COMPLETED': 'Investigation complete',
  COMPLETED: 'Investigation complete',
};

const STAGE_SEQUENCE = [
  'Validating wallet address',
  'Fetching on-chain transactions',
  'Tracing multi-hop fund flow',
  'Analysis and risk scoring',
  'Investigation complete',
];

const stageIndexOf = (stage: string | null): number => {
  if (!stage) return 0;
  const key = stage.trim().toUpperCase();
  if (key === 'COMPLETED' || key === 'INVESTIGATION COMPLETED') return STAGE_SEQUENCE.length - 1;
  const label = STAGE_LABELS[key];
  if (!label) return 0;
  const index = STAGE_SEQUENCE.indexOf(label);
  return index >= 0 ? index : 0;
};

export const LiveInvestigationSearch: React.FC<LiveInvestigationSearchProps> = ({
  onSelectWalletForGraph,
}) => {
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<NetworkOption>('bitcoin');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [lastRequest, setLastRequest] = useState<{ address: string; network: NetworkOption } | null>(
    null
  );

  const handleSettled = useCallback(
    (result: any) => {
      publishInvestigation(result, {
        address: lastRequest?.address ?? result.address ?? '',
        network: lastRequest?.network ?? String(result.network ?? '').toLowerCase(),
        source: 'search',
      });
      onSelectWalletForGraph?.({
        address: lastRequest?.address ?? result.address ?? '',
        network: lastRequest?.network ?? String(result.network ?? '').toUpperCase(),
        risk: Number(result.riskScore ?? 0),
      });
    },
    [lastRequest, onSelectWalletForGraph]
  );

  const { state, run, reset } = useInvestigationRunner(handleSettled);

  const isLoading = state.phase === 'loading';
  const investigationResult = state.result;

  // Demo wallets are only ever offered when the backend explicitly runs in DEMO_MODE.
  useEffect(() => {
    const controller = new AbortController();
    fetchBackendMode(controller.signal).then((mode) => {
      if (!controller.signal.aborted) setDemoMode(mode === 'DEMO');
    });
    return () => controller.abort();
  }, []);

  const startInvestigation = useCallback(
    (target: string, targetNetwork: NetworkOption) => {
      const trimmed = target.trim();
      const invalid = validateAddress(trimmed, targetNetwork);
      if (invalid) {
        setValidationError(invalid);
        return;
      }

      setValidationError(null);
      setShowReportPreview(false);
      reset();
      setLastRequest({ address: trimmed, network: targetNetwork });
      beginInvestigation({ address: trimmed, network: targetNetwork, source: 'search' });
      run(trimmed, targetNetwork);
    },
    [reset, run]
  );

  const handleAnalyze = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startInvestigation(address, network);
  };

  const handleRetry = () => {
    const request = lastRequest ?? { address, network };
    setAddress(request.address);
    setNetwork(request.network);
    startInvestigation(request.address, request.network);
  };

  const handleDismissError = () => {
    setValidationError(null);
    reset();
    clearInvestigation();
  };

  /** Never render undefined/null as blank space — fall back to N/A. */
  const val = (v: any): string => {
    if (v === null || v === undefined || v === '') return 'N/A';
    return String(v);
  };

  const isLiveResult =
    investigationResult != null &&
    String(investigationResult.synthetic) !== 'true' &&
    String(investigationResult.mode ?? 'LIVE').toUpperCase() !== 'DEMO';

  const activeStageIndex = stageIndexOf(state.stage);
  const hasBackendProgress = typeof state.progress === 'number';
  const progressPercent = hasBackendProgress ? (state.progress as number) : 0;
  const stageLabel = useMemo(() => {
    if (state.phase === 'completed') return 'COMPLETED';
    if (state.phase === 'error') return 'FAILED';
    return STAGE_LABELS[String(state.stage ?? '').trim().toUpperCase()] ?? 'Tracing fund flow';
  }, [state.phase, state.stage]);

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
            <AlertTriangle className="w-3.5 h-3.5" />
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
                  setNetwork(e.target.value as NetworkOption);
                  setValidationError(null);
                }}
                className="w-full md:w-44 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-inter text-xs uppercase tracking-wider focus:outline-none focus:border-[#A58B6F] cursor-pointer"
              >
                <option value="bitcoin" className="bg-[#101010] text-white">Bitcoin ▾</option>
                <option value="ethereum" className="bg-[#101010] text-white">Ethereum ▾</option>
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

          {/* Validation / API Error Banner */}
          {validationError && state.phase !== 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs font-inter text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 text-xs font-inter">
            <div className="flex items-center gap-2 text-neutral-400 opacity-70">
              <span className="uppercase tracking-wider font-mono text-[10px]">Supported Networks:</span>
              <span className="text-white font-medium">Bitcoin • Ethereum</span>
            </div>

            {demoMode && (
              <span className="text-[11px] font-mono text-amber-400/80">
                BACKEND DEMO MODE ENABLED
              </span>
            )}
          </div>
        </form>

        {/* Loading Progress State — driven by the backend record, never by a timer */}
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
                  {stageLabel.toUpperCase()}
                </span>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {formatElapsed(state.elapsedMs)} elapsed
                </span>
              </div>

              {/* Progress Bar — real backend progress, indeterminate until it arrives */}
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                {hasBackendProgress ? (
                  <div
                    className="h-full bg-gradient-to-r from-[#A58B6F] to-[#f0f0f0] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                ) : (
                  <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#A58B6F] to-transparent animate-pulse rounded-full" />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-500">
                <span>
                  {hasBackendProgress
                    ? `Backend progress ${progressPercent}%`
                    : 'Awaiting backend progress signal'}
                </span>
                {state.investigationId && (
                  <span className="break-all">ID {state.investigationId}</span>
                )}
              </div>

              {/* Data-driven stage list */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-[11px] font-mono text-neutral-400 pt-2">
                {STAGE_SEQUENCE.map((label, index) => {
                  const isCurrent = index === activeStageIndex;
                  const isDone = index < activeStageIndex;
                  return (
                    <div
                      key={label}
                      className={`p-2.5 rounded-lg border ${
                        isCurrent
                          ? 'border-[#A58B6F]/60 text-white bg-white/[0.04]'
                          : isDone
                            ? 'border-emerald-500/20 text-emerald-400/80'
                            : 'border-white/5 opacity-40'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}. {label}
                    </div>
                  );
                })}
              </div>

              {state.elapsedMs > 180_000 && (
                <p className="text-[11px] font-mono text-amber-400/80 leading-relaxed">
                  The backend is still running this trace. Large multi-hop wallets can take several
                  minutes — the panel closes as soon as the investigation record reaches a terminal
                  state.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {state.phase === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 pt-8 border-t border-white/10"
            >
              <div className="p-5 sm:p-6 rounded-2xl bg-red-950/20 border border-red-500/30 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-mono uppercase tracking-widest text-red-400">
                      Investigation failed
                    </div>
                    <p className="text-xs font-inter text-neutral-300 mt-1.5 break-words">
                      {state.error || 'The investigation could not be completed.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-4 py-2 rounded-full bg-[#A58B6F] text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-[#C4A482] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissError}
                    className="px-4 py-2 rounded-full border border-white/15 text-neutral-300 text-[10px] font-semibold uppercase tracking-widest hover:border-white/30 transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Investigation Dossier Result — rendered from the real backend response */}
        <AnimatePresence>
          {state.phase === 'completed' && investigationResult && (
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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        COMPLETED
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-[#A58B6F]/10 border border-[#A58B6F]/30 text-[#C4A482] text-[10px] font-mono uppercase tracking-wider">
                        {val(investigationResult.riskLevel)}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {val(investigationResult.caseId)}
                      </span>
                    </div>
                    <div className="font-mono text-sm sm:text-base text-white break-all flex items-center gap-2">
                      <span className="text-[#A58B6F] font-bold">TARGET:</span> {val(investigationResult.address)}
                    </div>
                  </div>

                  {/* Risk Badge */}
                  <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 px-5 py-2.5 rounded-xl">
                    <div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">RISK SCORE</div>
                      <div className="font-playfair text-2xl font-bold text-red-400">
                        {typeof investigationResult.riskScore === 'number' ? investigationResult.riskScore : 'N/A'} <span className="text-xs font-normal text-neutral-400">/ 100</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Live provenance — shown exactly as returned */}
                <div className="flex flex-wrap items-center gap-2 pt-4 text-[10px] font-mono uppercase tracking-wider">
                  <span className="px-2 py-0.5 rounded border border-white/10 text-neutral-300">
                    MODE: {val(investigationResult.mode)}
                  </span>
                  <span className="px-2 py-0.5 rounded border border-white/10 text-neutral-300">
                    SYNTHETIC: {String(investigationResult.synthetic === true)}
                  </span>
                  <span className="px-2 py-0.5 rounded border border-white/10 text-neutral-300">
                    NETWORK: {val(investigationResult.network)}
                  </span>
                  <span className="px-2 py-0.5 rounded border border-white/10 text-neutral-300">
                    COMPLETED: {val(investigationResult.timestamp)}
                  </span>
                </div>

                {/* Intelligence Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">FUNDS TRACED</div>
                    <div className="text-base font-semibold text-white mt-1">{val(investigationResult.fundsTraced)}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Tainted Volume Tracked</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">HOP DEPTH</div>
                    <div className="text-base font-semibold text-white mt-1">{val(investigationResult.hopCount)} Intermediary Hops</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{val(investigationResult.transactionsAnalyzed)} Transactions Parsed</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">WALLET CLUSTER</div>
                    <div className="text-base font-semibold text-amber-300 mt-1 truncate">{val(investigationResult.clusteringTag)}</div>
                    <div className="text-[10px] text-amber-400 mt-0.5">{val(investigationResult.peelingChains)}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">EXCHANGE DESTINATION</div>
                    <div className="text-base font-semibold text-emerald-400 mt-1 truncate">{val(investigationResult.destinationExchange)}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Confidence: {val(investigationResult.confidence)}</div>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                  <div className="text-xs text-neutral-400 font-inter">
                    <span className="text-emerald-400 font-semibold">
                      {isLiveResult ? '● LIVE investigation data received' : '● Response received'}
                    </span>{' '}
                    Trace completed {val(investigationResult.timestamp)}.
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
