import React from 'react';
import { motion } from 'motion/react';
import { LiveInvestigationSearch } from './LiveInvestigationSearch';
import { LiveAnalyticsStats } from './LiveAnalyticsStats';
import { InvestigationPipeline } from './InvestigationPipeline';
import { TransactionNetworkGraph } from './TransactionNetworkGraph';
import { AiFraudDetection } from './AiFraudDetection';
import { TechnologyArchitecture } from './TechnologyArchitecture';
import { RealtimeMonitoring } from './RealtimeMonitoring';
import { DashboardPreview } from './DashboardPreview';
import { ShieldCheck, ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';

interface ScrollStagesProps {
  onOpenDemo: () => void;
  activeStage?: number;
}

export const ScrollStages: React.FC<ScrollStagesProps> = ({ onOpenDemo }) => {
  return (
    <div className="relative z-10 w-full space-y-16 lg:space-y-24">
      {/* ============================================================ */}
      {/* 6. LIVE INVESTIGATION SEARCH                                  */}
      {/* ============================================================ */}
      <LiveInvestigationSearch />

      {/* ============================================================ */}
      {/* 7. LIVE ANALYTICS STATS (4 Animated Cards)                    */}
      {/* ============================================================ */}
      <LiveAnalyticsStats />

      {/* ============================================================ */}
      {/* 8. HOW THE SYSTEM WORKS (5-Phase Vertical/Horizontal Pipeline) */}
      {/* ============================================================ */}
      <InvestigationPipeline />

      {/* ============================================================ */}
      {/* 9. TRANSACTION NETWORK GRAPH (Interactive Money Trail + Panel)*/}
      {/* ============================================================ */}
      <TransactionNetworkGraph />

      {/* ============================================================ */}
      {/* 10. AI FRAUD DETECTION (3 Large Cards with Hover FX)          */}
      {/* ============================================================ */}
      <AiFraudDetection />

      {/* ============================================================ */}
      {/* 11. TECHNOLOGY ARCHITECTURE (Technical Blueprint Flow)        */}
      {/* ============================================================ */}
      <TechnologyArchitecture />

      {/* ============================================================ */}
      {/* 12. REAL-TIME MONITORING (Command Center Sentinel Mockup)      */}
      {/* ============================================================ */}
      <RealtimeMonitoring />

      {/* ============================================================ */}
      {/* 13. DASHBOARD PREVIEW (Sidebar, Metrics, Graphs & Case Table)  */}
      {/* ============================================================ */}
      <DashboardPreview />

      {/* ============================================================ */}
      {/* FINAL LAW ENFORCEMENT & AGENCY BRIEFING CTA                   */}
      {/* ============================================================ */}
      <section id="agency-access" className="text-center py-24 px-6 relative w-full">
        <div className="glass-card rounded-3xl p-10 sm:p-14 glass-border relative overflow-hidden bg-[#070707] shadow-2xl">
          {/* Subtle Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#A58B6F]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Law Enforcement & Hackathon Evaluation</span>
            </div>

            <h2 className="font-playfair text-3xl sm:text-5xl font-light text-white tracking-tight">
              Ready to Accelerate Your Cyber Forensics?
            </h2>

            <p className="font-inter text-neutral-300 opacity-80 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
              Empower your cybercrime division, financial intelligence unit, or investigative task force with automated multi-hop transaction tracing and VASP destination intelligence.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onOpenDemo}
                className="px-9 py-3.5 rounded-full bg-[#A58B6F] text-black font-inter text-xs font-semibold uppercase tracking-widest hover:bg-[#C4A482] bronze-glow hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#A58B6F]/20 flex items-center gap-2 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-black" />
                <span>Request Agency Briefing</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('investigate');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-7 py-3.5 rounded-full glass-border hover:bg-white hover:text-black text-neutral-300 font-inter text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Live Address Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-6 border-t border-white/5 text-[11px] font-mono text-neutral-500">
              Compliant with FATF Travel Rule Guidelines • Subpoena-Ready Forensic Intelligence Packets
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
