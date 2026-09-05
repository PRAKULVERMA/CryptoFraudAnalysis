import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldAlert, Sparkles, ChevronDown, Terminal, Search, ShieldCheck } from 'lucide-react';

interface HeroContentProps {
  onOpenDemo: () => void;
  onReadMore: () => void;
  opacity: any; // MotionValue
  yTransform: any; // MotionValue
  scaleTransform: any; // MotionValue
}

export const HeroContent: React.FC<HeroContentProps> = ({
  onOpenDemo,
  opacity,
  yTransform,
  scaleTransform,
}) => {
  const scrollToSearch = () => {
    const el = document.getElementById('investigate');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' });
    }
  };

  const scrollToGraph = () => {
    const el = document.getElementById('graph-network');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.div
      id="hero-content-wrapper"
      style={{
        opacity,
        y: yTransform,
        scale: scaleTransform,
      }}
      className="relative z-10 flex flex-col items-center justify-center text-center px-6 w-full pt-28 pb-16 sm:pt-36 sm:pb-20 select-none pointer-events-auto"
    >
      {/* 1. Feature Pill / Announcement Badge */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        id="hero-announcement-pill"
        className="inline-flex items-center gap-2.5 p-1 pl-1 pr-4 rounded-full glass-border hover:border-[#A58B6F]/50 transition-all duration-300 cursor-pointer mb-8 group bg-[#080808]/80 shadow-2xl"
        onClick={scrollToSearch}
      >
        {/* Bronze Tag */}
        <span className="px-3 py-1 text-[9px] font-inter font-semibold uppercase tracking-[0.2em] rounded-full bg-[#A58B6F] text-black shadow-sm flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-black" />
          <span>CYBERCRIME FORENSICS</span>
        </span>
        {/* Update version text with animated arrow */}
        <span className="text-[10px] sm:text-[11px] text-neutral-300 font-inter uppercase tracking-[0.25em] opacity-70 flex items-center gap-1.5 group-hover:opacity-100 transition-opacity">
          <span>Threat Intelligence Suite</span>
          <ArrowRight className="w-3 h-3 text-[#A58B6F] group-hover:translate-x-0.5 transition-transform" />
        </span>
      </motion.div>

      {/* 2. Hero Heading with Playfair Display & Inter: EXACT TAGLINE */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        id="hero-main-title"
        className="font-playfair text-4xl sm:text-6xl md:text-7xl lg:text-[5.2rem] font-light tracking-tight text-white leading-[1.04] mb-6 text-balance"
      >
        Tracing Illicit Funds.
        <br />
        <span className="relative inline-block font-playfair font-light italic text-[#f0f0f0] drop-shadow-[0_4px_30px_rgba(165,139,111,0.3)]">
          Identifying Exchange Destinations.
        </span>
      </motion.h1>

      {/* 3. Hero Subtitle with Inter font pairing */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        id="hero-subtitle"
        className="font-inter text-sm sm:text-base font-light text-neutral-300 opacity-70 leading-relaxed tracking-wide max-w-2xl mb-10 text-balance"
      >
        Advanced blockchain forensic intelligence platform engineered for law enforcement agencies, cybercrime investigators, and financial intelligence units to track multi-hop money trails, decode peeling chains, and locate exchange off-ramps.
      </motion.p>

      {/* 4. Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        id="hero-cta-buttons"
        className="flex flex-wrap items-center justify-center gap-4"
      >
        {/* Start Investigation button */}
        <button
          id="hero-start-investigation-btn"
          onClick={scrollToSearch}
          className="px-8 py-3.5 rounded-full bg-[#A58B6F] text-black font-inter text-[10px] uppercase tracking-widest font-semibold hover:bg-[#C4A482] bronze-glow hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg shadow-[#A58B6F]/25"
        >
          <Search className="w-3.5 h-3.5 text-black" />
          <span>Start Investigation</span>
        </button>

        {/* View Money Trail button */}
        <button
          id="hero-visualize-graph-btn"
          onClick={scrollToGraph}
          className="px-7 py-3.5 rounded-full glass-border hover:bg-white hover:text-black text-neutral-200 font-inter text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 active:scale-95 cursor-pointer shadow-lg shadow-black/60"
        >
          <span>Visualize Money Trail</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
        </button>
      </motion.div>

      {/* 5. Key Forensic Signals Pill */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[10px] font-mono text-neutral-400 opacity-60"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>OFAC Sanction Screener: Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A58B6F]" />
          <span>Graph Traversal: 85,000+ Paths</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>VASP Attribution Engine: 94.7%</span>
        </div>
      </motion.div>

      {/* 6. Scroll Down Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="mt-12 flex flex-col items-center gap-3 cursor-pointer group"
        onClick={scrollToSearch}
      >
        <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent group-hover:from-[#A58B6F] transition-all" />
        <span className="text-[9px] font-inter uppercase tracking-[0.4em] opacity-40 group-hover:opacity-80 transition-opacity">
          Launch Investigation Suite
        </span>
      </motion.div>
    </motion.div>
  );
};

