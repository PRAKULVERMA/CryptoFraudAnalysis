import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  BrainCircuit,
  Network,
  Building2,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const AiFraudDetection: React.FC = () => {
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/fraud-detection/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: 'bc1q8x9l4h9g2e75kdf8wqp39nm7x4f9', network: 'Bitcoin' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.evidenceSummary) setInsight(data.evidenceSummary);
      })
      .catch((err) => console.error('Fraud detection fetch failed:', err));
  }, []);

  const cards = [
    {
      number: '01',
      title: 'FRAUD PATTERN DETECTION',
      subtitle: 'Layering & Peeling Heuristics',
      description:
        'Detect suspicious transaction behavior, rapid fund movement, layering and unusual transaction patterns.',
      icon: BrainCircuit,
      bullets: [
        'Automated detection of peeling chains and micro-splintering',
        'Sub-second velocity analysis for high-frequency money mule routing',
        'Temporal anomaly detection against historical darknet patterns',
      ],
      metrics: 'Over 400+ behavioral heuristic rules executed per block',
      accentColor: 'from-[#A58B6F]/20 via-transparent to-transparent',
    },
    {
      number: '02',
      title: 'NETWORK & CLUSTER ANALYSIS',
      subtitle: 'Entity Resolution & Graph Neural Nets',
      description:
        'Identify relationships between wallets and uncover connected fraud networks using graph analytics.',
      icon: Network,
      bullets: [
        'Co-spending and common input ownership clustering heuristics',
        'Community detection algorithms unmasking syndicate rings',
        'Sybil wallet de-anonymization across heterogeneous protocols',
      ],
      metrics: 'Real-time multi-million node graph traversal in < 800ms',
      accentColor: 'from-blue-500/20 via-transparent to-transparent',
    },
    {
      number: '03',
      title: 'EXCHANGE DESTINATION INTELLIGENCE',
      subtitle: 'VASP Off-Ramp Attribution',
      description:
        'Analyze transaction paths to identify the likely cryptocurrency exchange or service destination.',
      icon: Building2,
      bullets: [
        'Proprietary attribution database mapping 100,000+ exchange deposit addresses',
        'Instant legal subpoena dossier generation for law enforcement',
        'High-confidence attribution confidence scoring (94.7% accuracy)',
      ],
      metrics: 'Court-admissible compliance reports ready for mutual legal assistance',
      accentColor: 'from-emerald-500/20 via-transparent to-transparent',
    },
  ];

  return (
    <section id="ai-fraud" className="relative z-10 py-24 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em] mb-4">
          <Cpu className="w-3.5 h-3.5" />
          <span>Deep Learning Forensics Architecture</span>
        </div>
        <h2 className="font-playfair text-3xl sm:text-5xl font-light text-white tracking-tight mb-4">
          AI That Understands Transaction Behavior
        </h2>
        <p className="font-inter text-neutral-400 opacity-80 text-sm sm:text-base leading-relaxed">
          Traditional block explorers only show isolated transactions. ChainTrace AI employs graph intelligence models to understand intent, coordination, and obfuscation.
        </p>
      </div>

      {/* 3 Large Cards with Animated Hover Effects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              whileHover={{ y: -6 }}
              className="glass-card rounded-3xl p-8 glass-border relative overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-2xl hover:border-[#A58B6F]/50"
            >
              {/* Subtle dynamic background gradient on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.accentColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
              />

              {/* Top Row: Number & Icon */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-sm font-bold text-[#A58B6F] tracking-widest">
                    {card.number}
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#A58B6F] group-hover:bg-[#A58B6F]/15 group-hover:border-[#A58B6F]/40 group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  {card.subtitle}
                </div>

                <h3 className="font-inter text-xl font-bold tracking-tight text-white mb-3 group-hover:text-[#A58B6F] transition-colors">
                  {card.title}
                </h3>

                <p className="font-inter text-neutral-300 opacity-80 text-sm leading-relaxed mb-6">
                  {card.description}
                </p>

                {/* Bullets List */}
                <div className="space-y-2.5 pt-4 border-t border-white/5 font-inter text-xs text-neutral-400">
                  {card.bullets.map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A58B6F] mt-1.5 shrink-0" />
                      <span className="leading-snug">{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Metric Badge */}
              <div className="relative z-10 mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span className="text-[#A58B6F] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {card.metrics}
                </span>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {insight && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 p-5 rounded-2xl bg-[#A58B6F]/10 border border-[#A58B6F]/30 text-sm text-neutral-200 font-inter leading-relaxed"
        >
          <div className="flex items-center gap-2 text-[#A58B6F] text-xs font-mono uppercase tracking-widest mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Forensic Insight</span>
          </div>
          {insight}
        </motion.div>
      )}
    </section>
  );
};
