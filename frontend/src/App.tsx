/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useScroll, useTransform, useSpring, motion } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Hero3DCanvas } from './components/Hero3DCanvas';
import { HeroContent } from './components/HeroContent';
import { ScrollStages } from './components/ScrollStages';
import { DemoModal } from './components/DemoModal';
import { Sparkles, Compass, Eye, RotateCw } from 'lucide-react';

export default function App() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [rawScrollProgress, setRawScrollProgress] = useState(0);

  // Smooth scroll tracking
  const { scrollYProgress } = useScroll();

  // Spring smoothed progress for organic, silky 3D transitions
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.0005,
  });

  // Track raw scroll for UI indicators
  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      setRawScrollProgress(latest);
    });
  }, [scrollYProgress]);

  // Pass spring progress to 3D canvas
  const [currentProgress3D, setCurrentProgress3D] = useState(0);
  useEffect(() => {
    return smoothProgress.on('change', (latest) => {
      setCurrentProgress3D(latest);
    });
  }, [smoothProgress]);

  // Subtle mouse parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Transforms for Hero typography as user scrolls down
  const heroOpacity = useTransform(smoothProgress, [0, 0.28], [1, 0]);
  const heroY = useTransform(smoothProgress, [0, 0.28], [0, -100]);
  const heroScale = useTransform(smoothProgress, [0, 0.28], [1, 0.94]);

  // Compute active stage (0: Hero, 1: Features/Telemetry, 2: Dashboard)
  const currentStage = rawScrollProgress < 0.25 ? 0 : rawScrollProgress < 0.65 ? 1 : 2;

  const scrollToStage = (stageIndex: number) => {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const targets = [0, height * 0.42, height * 0.88];
    window.scrollTo({
      top: targets[stageIndex] || 0,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative min-h-screen bg-[#080808] text-[#f0f0f0] font-inter selection:bg-[#A58B6F]/30 selection:text-[#f0f0f0] overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar onOpenDemo={() => setDemoModalOpen(true)} cartCount={0} />

      {/* Subtle Wireframe Geodesic Rings from Sophisticated Dark Design */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="wireframe-sphere w-[700px] h-[700px]" />
        <div className="wireframe-sphere w-[950px] h-[950px] opacity-40" />
        <div className="wireframe-sphere w-[1200px] h-[1200px] opacity-20" />
      </div>

      {/* Editorial Vertical Coordinates */}
      <div className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[9px] font-inter uppercase tracking-[0.4em] opacity-25 pointer-events-none z-20">
        LATITUDE 45° 28&apos; N
      </div>
      <div className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 rotate-90 origin-right text-[9px] font-inter uppercase tracking-[0.4em] opacity-25 pointer-events-none z-20">
        LONGITUDE 09° 11&apos; E
      </div>

      {/* Persistent Fixed 3D WebGL Background Scene */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <Hero3DCanvas scrollProgress={currentProgress3D} mousePos={mousePos} />

        {/* Ambient Top Vignette & Subtle Atmospheric Fade to #080808 */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#080808] via-[#080808]/70 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none" />
      </div>

      {/* Floating 3D Orbit Stage HUD Controller matching Sophisticated Dark */}
      <div
        id="scroll-telemetry-hud"
        className="fixed bottom-6 right-6 z-40 hidden md:flex items-center gap-3 p-1.5 pl-3 rounded-full glass-border shadow-2xl shadow-black/80 bg-[#080808]/80 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2 text-[10px] font-inter uppercase tracking-[0.2em] text-[#A58B6F]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A58B6F] shadow-[0_0_8px_rgba(165,139,111,0.6)]" />
          <span>Orbit</span>
        </div>

        {/* Stage Pill Buttons */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-full border border-white/5 text-[10px] font-inter uppercase tracking-wider">
          {[
            { label: '01 Search', targetId: 'investigate' },
            { label: '02 Money Trail', targetId: 'graph-network' },
            { label: '03 Command Center', targetId: 'dashboard-preview' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                const el = document.getElementById(item.targetId);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1 rounded-full text-neutral-400 opacity-70 hover:opacity-100 hover:text-white hover:bg-white/5 transition-all duration-300 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Percentage indicator */}
        <span className="text-[10px] font-mono text-[#A58B6F] font-semibold pr-2">
          {Math.round(rawScrollProgress * 100)}%
        </span>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10">
        {/* Hero Section Container */}
        <section
          id="home"
          className="relative min-h-screen flex flex-col justify-between"
        >
          <HeroContent
            onOpenDemo={() => setDemoModalOpen(true)}
            onReadMore={() => {
              const el = document.getElementById('investigate');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            opacity={heroOpacity}
            yTransform={heroY}
            scaleTransform={heroScale}
          />
        </section>

        {/* Smooth Scroll Transitions into Orbit & System Telemetry */}
        <ScrollStages
          onOpenDemo={() => setDemoModalOpen(true)}
          activeStage={currentStage}
        />
      </main>

      {/* Footer styled to ChainTrace AI */}
      <footer className="relative z-10 border-t border-white/10 bg-[#060606] py-12 px-8 sm:px-12 text-neutral-400 font-inter text-[10px] uppercase tracking-[0.25em]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <span className="font-inter text-base font-bold text-white tracking-tight">
              CHAINTRACE <span className="text-[#A58B6F] font-medium">AI</span>
            </span>
            <span className="hidden sm:inline text-neutral-600">•</span>
            <span className="opacity-70 normal-case tracking-normal text-xs text-neutral-400 font-inter">
              Tracing Illicit Funds. Identifying Exchange Destinations.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#investigate" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">Investigate</a>
            <a href="#how-it-works" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">Pipeline</a>
            <a href="#graph-network" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">Money Trail</a>
            <a href="#ai-fraud" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">AI Fraud</a>
            <a href="#dashboard-preview" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">Command Center</a>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="text-[#A58B6F] hover:text-white font-semibold transition-colors cursor-pointer"
            >
              Agency Briefing
            </button>
          </div>
          <div className="text-neutral-500 opacity-70 font-mono normal-case text-[11px] text-center md:text-right">
            Smart India Hackathon • Cybercrime Division
          </div>
        </div>
      </footer>

      {/* Interactive Book a Demo Dialog */}
      <DemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </div>
  );
}
