import React from 'react';
import { motion } from 'motion/react';
import {
  FileWarning,
  GitBranch,
  BrainCircuit,
  Building2,
  ShieldCheck,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export const InvestigationPipeline: React.FC = () => {
  const steps = [
    {
      number: '01',
      phase: 'REPORT',
      title: 'Victim & Address Ingestion',
      desc: 'Victim or investigator submits a suspicious cryptocurrency wallet address.',
      icon: FileWarning,
      tag: 'Initiation',
      detail: 'Supports Bitcoin, Ethereum, EVM tokens & cross-chain bridge logs',
    },
    {
      number: '02',
      phase: 'TRACE',
      title: 'Multi-Hop Transaction Crawler',
      desc: 'The system automatically collects blockchain transactions and follows fund movement across multiple hops.',
      icon: GitBranch,
      tag: 'UTXO & EVM',
      detail: 'Recursive traversal resolving peeling chains up to 12 hops deep',
    },
    {
      number: '03',
      phase: 'ANALYZE',
      title: 'AI & Graph Pattern Heuristics',
      desc: 'AI and graph analytics identify suspicious patterns, wallet clusters and fraud networks.',
      icon: BrainCircuit,
      tag: 'Machine Learning',
      detail: 'Detects mixer hops, structuring velocity & co-spending rings',
    },
    {
      number: '04',
      phase: 'IDENTIFY',
      title: 'Exchange Destination Attribution',
      desc: 'The platform detects the likely exchange or service destination where funds may be deposited.',
      icon: Building2,
      tag: 'VASP Database',
      detail: 'Matches 94.7% of off-ramp deposit addresses across major regulated exchanges',
    },
    {
      number: '05',
      phase: 'ACT',
      title: 'Actionable Intelligence & Seizure',
      desc: 'Investigators receive actionable intelligence to support faster intervention and fund recovery efforts.',
      icon: ShieldCheck,
      tag: 'Enforcement',
      detail: 'Generates court-admissible forensic PDF dossiers and LEA subpoena requests',
    },
  ];

  return (
    <section id="how-it-works" className="relative z-10 py-24 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em] mb-4">
          <Zap className="w-3.5 h-3.5" />
          <span>Automated 5-Phase Forensics Engine</span>
        </div>
        <h2 className="font-playfair text-3xl sm:text-5xl font-light text-white tracking-tight mb-4">
          From Victim Report to Actionable Intelligence
        </h2>
        <p className="font-inter text-neutral-400 opacity-80 text-sm sm:text-base leading-relaxed">
          How ChainTrace AI decomposes complex darknet transaction graphs into clear, admissible evidence for law enforcement and cybercrime investigators.
        </p>
      </div>

      {/* Pipeline Grid (Horizontal on lg screens with connecting lines, vertical on smaller) */}
      <div className="relative">
        {/* Decorative horizontal connecting line on desktop */}
        <div className="hidden lg:block absolute top-1/2 left-12 right-12 h-[1px] -translate-y-6 bg-gradient-to-r from-transparent via-[#A58B6F]/40 to-transparent pointer-events-none z-0" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                className="glass-card rounded-2xl p-6 glass-border relative flex flex-col justify-between group hover:border-[#A58B6F]/50 transition-all duration-300 shadow-xl"
              >
                {/* Step Top Badge */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-[#A58B6F] tracking-widest">
                      STEP {step.number}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[9px] font-mono uppercase text-neutral-400 border border-white/5">
                      {step.tag}
                    </span>
                  </div>

                  {/* Cyber Icon */}
                  <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#A58B6F] group-hover:bg-[#A58B6F]/15 group-hover:border-[#A58B6F]/40 transition-all mb-4 shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Phase & Title */}
                  <div className="font-mono text-xs font-bold text-[#A58B6F] uppercase tracking-wider mb-1">
                    {step.phase}
                  </div>
                  <h3 className="font-inter text-base font-bold text-white mb-2 tracking-tight">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="font-inter text-neutral-400 text-xs leading-relaxed opacity-80 mb-4">
                    {step.desc}
                  </p>
                </div>

                {/* Technical Capability Detail */}
                <div className="pt-3 border-t border-white/5 text-[10px] font-mono text-neutral-400 opacity-60 group-hover:opacity-90 transition-opacity">
                  {step.detail}
                </div>

                {/* Arrow connector indicator for mobile/tablet */}
                {idx < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center pt-4 text-neutral-600">
                    <ArrowDown className="w-4 h-4 animate-bounce" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
