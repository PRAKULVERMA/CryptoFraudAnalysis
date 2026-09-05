import React, { useState, useEffect } from 'react';
import { Menu, X, ShieldAlert, Sparkles, Terminal, Activity, ArrowRight, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onOpenDemo: () => void;
  cartCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDemo }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Overview', href: '#home' },
    { label: 'Investigate', href: '#investigate' },
    { label: 'Pipeline', href: '#how-it-works' },
    { label: 'Money Trail', href: '#graph-network' },
    { label: 'AI Fraud', href: '#ai-fraud' },
    { label: 'Architecture', href: '#tech-stack' },
    { label: 'Live Monitor', href: '#live-monitoring' },
    { label: 'Command Center', href: '#dashboard-preview' },
  ];

  return (
    <header
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#080808]/90 backdrop-blur-md border-b border-white/10 py-3.5 shadow-2xl shadow-black/80'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between">
        {/* Brand Logo: CHAINTRACE AI */}
        <a
          href="#home"
          id="nav-brand-logo"
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#A58B6F]/15 border border-[#A58B6F]/40 flex items-center justify-center text-[#A58B6F] shadow-[0_0_15px_rgba(165,139,111,0.2)]">
            <ShieldAlert className="w-4 h-4 text-[#A58B6F]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-inter text-lg sm:text-xl font-bold tracking-tight text-white">
                CHAINTRACE <span className="text-[#A58B6F] font-medium">AI</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#A58B6F]/15 border border-[#A58B6F]/30 text-[#A58B6F] text-[9px] font-mono font-medium uppercase tracking-wider">
                Crypto Trace
              </span>
            </div>
            <span className="text-[8px] font-inter uppercase tracking-[0.2em] text-neutral-400 opacity-60 hidden md:inline">
              Financial Forensics & Illicit Fund Tracing
            </span>
          </div>
        </a>

        {/* Center Desktop Navigation Links */}
        <nav
          id="desktop-nav-links"
          className="hidden xl:flex items-center gap-6 text-[10px] font-inter uppercase tracking-[0.2em]"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              id={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-neutral-400 opacity-60 hover:opacity-100 hover:text-white transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Status & Action */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/5 text-[9px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>CHAIN ENGINE: LIVE</span>
          </div>

          <button
            id="nav-book-demo-btn"
            onClick={onOpenDemo}
            className="text-[10px] font-inter uppercase tracking-widest glass-border px-5 py-2.5 rounded-full text-neutral-200 hover:bg-[#A58B6F] hover:text-black hover:border-[#A58B6F] transition-all duration-300 flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#A58B6F] group-hover:text-black" />
            <span>Agency Demo</span>
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex xl:hidden items-center gap-3">
          <button
            id="nav-mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-neutral-300 hover:text-white p-2 glass-border rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="xl:hidden bg-[#080808]/98 backdrop-blur-2xl border-b border-white/10 px-8 py-6 transition-all shadow-2xl"
        >
          <div className="flex flex-col gap-3 text-xs font-inter uppercase tracking-[0.2em]">
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-[#A58B6F] font-mono">FORENSIC ENGINE v3.4</span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                READY
              </span>
            </div>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-neutral-300 hover:text-[#A58B6F] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <button
                id="mobile-nav-demo-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDemo();
                }}
                className="w-full py-2.5 rounded-full text-[10px] uppercase tracking-widest bg-[#A58B6F] text-black font-semibold transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Request Agency Briefing</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

