import React, { useState, useEffect, useRef } from 'react';
import { useScroll, useTransform, useSpring, motion } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Hero3DCanvas } from './components/Hero3DCanvas';
import { HeroContent } from './components/HeroContent';
import { ScrollStages } from './components/ScrollStages';
import { DemoModal } from './components/DemoModal';

export default function App() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [rawScrollProgress, setRawScrollProgress] = useState(0);

  const { scrollYProgress } = useScroll();

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.0005,
  });

  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      setRawScrollProgress(latest);
    });
  }, [scrollYProgress]);

  const [currentProgress3D, setCurrentProgress3D] = useState(0);
  useEffect(() => {
    return smoothProgress.on('change', (latest) => {
      setCurrentProgress3D(latest);
    });
  }, [smoothProgress]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const heroOpacity = useTransform(smoothProgress, [0, 0.28], [1, 0]);
  const heroY = useTransform(smoothProgress, [0, 0.28], [0, -100]);
  const heroScale = useTransform(smoothProgress, [0, 0.28], [1, 0.94]);

  return (
    <div className="relative min-h-screen bg-[#080808] text-[#F5F1EA] font-inter selection:bg-[#A58B6F]/30 selection:text-[#F5F1EA] overflow-x-hidden">
      <Navbar onOpenDemo={() => setDemoModalOpen(true)} />

      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <Hero3DCanvas scrollProgress={currentProgress3D} mousePos={mousePos} />
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#080808] via-[#080808]/70 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none" />
      </div>

      <main className="relative z-10">
        <section id="home" className="relative min-h-screen flex flex-col justify-between">
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

        <ScrollStages onOpenDemo={() => setDemoModalOpen(true)} />
      </main>

      <footer className="relative z-10 border-t border-[#292929] bg-[#060606] py-12 px-8 sm:px-12 text-[#B5B0A8] font-inter text-[10px] uppercase tracking-[0.25em]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <span className="font-inter text-base font-bold text-white tracking-tight">
              CHAINTRACE <span className="text-[#A58B6F] font-medium">AI</span>
            </span>
            <span className="hidden sm:inline text-[#77736D">•</span>
            <span className="opacity-70 normal-case tracking-normal text-xs text-[#B5B0A8] font-inter">
              Tracing Illicit Funds. Identifying Exchange Destinations.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#investigate" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">Investigate</a>
            <a href="#how-it-works" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">Pipeline</a>
            <a href="#graph-network" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">Money Trail</a>
            <a href="#ai-fraud" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">AI Fraud</a>
            <a href="#dashboard-preview" className="hover:text-white opacity-70 hover:opacity-100 transition-opacity">Dashboard</a>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="text-[#A58B6F] hover:text-white font-semibold transition-colors cursor-pointer"
            >
              Agency Briefing
            </button>
          </div>
          <div className="text-[#77736D] opacity-70 font-mono normal-case text-[11px] text-center md:text-right">
            Smart India Hackathon • Cybercrime Division
          </div>
        </div>
      </footer>

      <DemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </div>
  );
}