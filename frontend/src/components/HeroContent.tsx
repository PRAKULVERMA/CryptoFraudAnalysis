import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldAlert, Search } from 'lucide-react';

interface HeroContentProps {
  onOpenDemo: () => void;
  onReadMore: () => void;
  opacity: any;
  yTransform: any;
  scaleTransform: any;
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
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        id="hero-announcement-pill"
        className="inline-flex items-center gap-2.5 p-1 pl-1 pr-4 rounded-full border border-[#292929] bg-[#111111] hover:border-[#A58B6F]/50 transition-all duration-300 cursor-pointer mb-8 group"
        onClick={scrollToSearch}
      >
        <span className="px-3 py-1 text-[9px] font-inter font-semibold uppercase tracking-[0.2em] rounded-full bg-[#A58B6F] text-black shadow-sm flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-black" />
          <span>BLOCKCHAIN FORENSICS</span>
        </span>
        <span className="text-[10px] sm:text-[11px] text-[#B5B0A8] font-inter uppercase tracking-[0.25em] opacity-70 flex items-center gap-1.5 group-hover:opacity-100 transition-opacity">
          <span>Investigation Platform</span>
          <ArrowRight className="w-3 h-3 text-[#A58B6F] group-hover:translate-x-0.5 transition-transform" />
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        id="hero-main-title"
        className="font-playfair text-4xl sm:text-6xl md:text-7xl lg:text-[5.2rem] font-light tracking-tight text-white leading-[1.04] mb-6 text-balance"
      >
        Tracing Illicit Funds.
        <br />
        <span className="relative inline-block font-playfair font-light italic text-[#F5F1EA]">
          Identifying Exchange Destinations.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        id="hero-subtitle"
        className="font-inter text-sm sm:text-base font-light text-[#B5B0A8] opacity-80 leading-relaxed tracking-wide max-w-2xl mb-10 text-balance"
      >
        Blockchain forensic intelligence platform for tracing multi-hop money trails,
        detecting wallet clusters, and identifying exchange off-ramps from real on-chain data.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        id="hero-cta-buttons"
        className="flex flex-wrap items-center justify-center gap-4"
      >
        <button
          id="hero-start-investigation-btn"
          onClick={scrollToSearch}
          className="px-8 py-3.5 rounded-full bg-[#A58B6F] text-black font-inter text-[10px] uppercase tracking-widest font-semibold hover:bg-[#C4A482] transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg shadow-[#A58B6F]/20"
        >
          <Search className="w-3.5 h-3.5 text-black" />
          <span>Start Investigation</span>
        </button>

        <button
          id="hero-visualize-graph-btn"
          onClick={() => {
            const el = document.getElementById('graph-network');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="group px-7 py-3.5 rounded-full border border-[#292929] hover:bg-white hover:text-black text-[#B5B0A8] font-inter text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer"
        >
          <span>View Money Trail</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-12 flex flex-col items-center gap-3 cursor-pointer group"
        onClick={scrollToSearch}
      >
        <div className="w-[1px] h-12 bg-gradient-to-b from-[#B5B0A8]/40 to-transparent group-hover:from-[#A58B6F] transition-all" />
        <span className="text-[9px] font-inter uppercase tracking-[0.4em] opacity-40 group-hover:opacity-80 transition-opacity">
          Launch Investigation Suite
        </span>
      </motion.div>
    </motion.div>
  );
};