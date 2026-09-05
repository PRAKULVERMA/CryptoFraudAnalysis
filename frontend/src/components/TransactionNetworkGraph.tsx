import React, { useState, useEffect } from 'react';
import { GitFork, ArrowLeft, ArrowRight, ExternalLink, Info } from 'lucide-react';

export const TransactionNetworkGraph: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const walletAddress = 'bc1q8x9l4h9g2e75kdf8wqp39nm7x4f9';
    setLoading(true);
    fetch(`/api/transactions/${walletAddress}?network=bitcoin`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.transactions) return;
        setTransactions(data.transactions);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Transaction fetch failed:', err);
        setLoading(false);
      });
  }, []);

  const tx = transactions[currentIndex];
  const isHighRisk = tx?.category === 'mixer';

  return (
    <section id="graph-network" className="relative z-10 py-24 px-6 sm:px-10 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em] mb-4">
            <GitFork className="w-3.5 h-3.5" />
            <span>Transaction Ledger</span>
          </div>
          <h2 className="font-playfair text-3xl sm:text-5xl font-light text-white tracking-tight mb-3">
            Separate Transaction Flows
          </h2>
          <p className="font-inter text-neutral-400 text-sm max-w-2xl opacity-80 leading-relaxed">
            Each movement shown as one self-contained crime graph. Navigate with arrows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-black/60 p-3 rounded-2xl glass-border">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-neutral-300">Suspect Wallet</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
            <span className="text-neutral-300">Intermediate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="text-neutral-300">High-Risk Mixer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-neutral-300">Identified Destination</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 glass-card rounded-3xl glass-border p-6 sm:p-10 shadow-2xl bg-[#060606]/90 relative overflow-hidden">
          <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

          <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TX #{currentIndex + 1} / {transactions.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0 || loading}
                className="p-1.5 rounded-lg bg-white/[0.04] text-neutral-300 hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
                title="Previous"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(transactions.length - 1, i + 1))}
                disabled={currentIndex >= transactions.length - 1 || loading}
                className="p-1.5 rounded-lg bg-white/[0.04] text-neutral-300 hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
                title="Next"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative z-10 min-h-[420px] flex flex-col justify-center">
            {loading && (
              <div className="text-center text-xs font-mono text-neutral-400 py-20">
                Loading transactions...
              </div>
            )}

            {!loading && transactions.length === 0 && (
              <div className="text-center text-xs font-mono text-neutral-400 py-20">
                No transactions found.
              </div>
            )}

            {!loading && tx && (
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                    {tx.category || 'unknown'}
                  </span>
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isHighRisk
                      ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                      : tx.category === 'exchange'
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : 'text-blue-400 border-blue-400/30 bg-blue-400/10'
                  }`}>
                    {tx.category || 'unknown'}
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">From</div>
                    <div className="font-mono text-[11px] text-neutral-300 break-all p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      {tx.from}
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-neutral-500 to-transparent" />
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[12px] font-mono font-semibold text-white">{tx.amount} {tx.currency}</span>
                      <ArrowRight className="w-4 h-4 text-neutral-500" />
                      <span className="text-[9px] font-mono text-neutral-500">Tx Hash</span>
                      <span className="font-mono text-[9px] text-neutral-400 max-w-[200px] truncate">
                        {tx.hash}
                      </span>
                    </div>
                    <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-neutral-500 to-transparent" />
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">To</div>
                    <div className="font-mono text-[11px] text-neutral-300 break-all p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      {tx.to}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] font-mono text-neutral-400">
                  <div>
                    <span className="text-neutral-500">Conf:</span>{' '}
                    <span className="text-white">{tx.confirmations || 0}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Fee:</span>{' '}
                    <span className="text-white">{tx.fee || '0.000000'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Time:</span>{' '}
                    <span className="text-white">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Risk:</span>{' '}
                    <span className={isHighRisk ? 'text-orange-400' : 'text-neutral-400'}>
                      {isHighRisk ? 'HIGH' : 'NORMAL'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-20 flex items-center justify-between pt-3 border-t border-white/5 text-xs font-inter text-neutral-400">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#A58B6F] shrink-0" />
              <span>Each transaction is a separate flow. Use arrows to navigate between them.</span>
            </span>
            <span className="hidden sm:inline font-mono text-[11px] text-neutral-500">
              {tx ? `${(tx.amount * 1).toFixed(4)} ${tx.currency} in this flow` : ''}
            </span>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 glass-border shadow-2xl relative overflow-hidden bg-[#0a0a0a]">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#A58B6F]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#A58B6F] block mb-1">
                  CASE DOSSIER #CT-2026-00421
                </span>
                <h3 className="font-inter text-lg font-bold tracking-tight text-white uppercase">
                  INVESTIGATION SUMMARY
                </h3>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-mono font-semibold">
                ● ACTIVE
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="font-inter text-neutral-400 uppercase tracking-wider font-medium">Risk Score</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-red-400">87 / 100</span>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="font-inter text-neutral-400 uppercase tracking-wider font-medium">Wallet Cluster</span>
                <span className="font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  High Risk
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="font-inter text-neutral-400 uppercase tracking-wider font-medium">Transactions Traced</span>
                <span className="font-mono text-white font-bold text-sm">1,248</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="font-inter text-neutral-400 uppercase tracking-wider font-medium">Hop Depth</span>
                <span className="font-mono text-white font-bold text-sm">7 Hops</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="font-inter text-neutral-400 uppercase tracking-wider font-medium">Likely Destination</span>
                <span className="font-mono text-emerald-400 font-semibold">Exchange Cluster</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="font-inter text-neutral-400 uppercase tracking-wider font-medium">Confidence</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">92%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
