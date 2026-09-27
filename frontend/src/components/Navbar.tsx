import React, { useState, useEffect } from 'react';
import { Menu, X, ShieldAlert, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onOpenDemo: () => void;
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
    { label: 'Dashboard', href: '#dashboard-preview' },
  ];

  return (
    <header
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#080808]/95 border-b border-[#292929] py-3.5 shadow-xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between">
        <a
          href="#home"
          id="nav-brand-logo"
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#A58B6F]/15 border border-[#A58B6F]/40 flex items-center justify-center text-[#A58B6F]">
            <ShieldAlert className="w-4 h-4 text-[#A58B6F]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-inter text-lg sm:text-xl font-bold tracking-tight text-white">
                CHAINTRACE <span className="text-[#A58B6F] font-medium">AI</span>
              </span>
            </div>
            <span className="text-[8px] font-inter uppercase tracking-[0.2em] text-[#77736D] hidden md:inline">
              Blockchain Forensics Platform
            </span>
          </div>
        </a>

        <nav
          id="desktop-nav-links"
          className="hidden xl:flex items-center gap-6 text-[10px] font-inter uppercase tracking-[0.2em]"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              id={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-[#B5B0A8] opacity-60 hover:opacity-100 hover:text-white transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-4">
          <button
            id="nav-book-demo-btn"
            onClick={onOpenDemo}
            className="text-[10px] font-inter uppercase tracking-widest border border-[#292929] px-5 py-2.5 rounded-full text-[#B5B0A8] hover:bg-[#A58B6F] hover:text-black hover:border-[#A58B6F] transition-all duration-300 flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#A58B6F] group-hover:text-black" />
            <span>Agency Demo</span>
          </button>
        </div>

        <div className="flex xl:hidden items-center gap-3">
          <button
            id="nav-mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#B5B0A8] hover:text-white p-2 border border-[#292929] rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="xl:hidden bg-[#080808]/98 border-b border-[#292929] px-8 py-6 transition-all shadow-xl"
        >
          <div className="flex flex-col gap-3 text-xs font-inter uppercase tracking-[0.2em]">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-[#B5B0A8] hover:text-[#A58B6F] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 border-t border-[#292929] flex flex-col gap-3">
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