import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Calendar, Mail, User, Building } from 'lucide-react';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '10-50',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      // Allow user to read confirmation, or close
    }, 4000);
  };

  return (
    <div
      id="demo-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="demo-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg p-8 rounded-2xl bg-[#080808] glass-border shadow-2xl shadow-black/80 text-white overflow-hidden"
      >
        {/* Subtle Ambient Bronze Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#A58B6F]/10 blur-3xl rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-2 text-[10px] font-inter uppercase tracking-[0.3em] text-[#A58B6F] mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A58B6F]" />
              <span>Official Agency Access</span>
            </div>
            <h3 className="font-playfair text-2xl sm:text-3xl font-light text-white mb-2 tracking-tight">
              Request ChainTrace AI Briefing
            </h3>
            <p className="font-inter text-xs sm:text-sm text-neutral-400 opacity-80 mb-6 leading-relaxed">
              Schedule a 1-on-1 forensic architecture walkthrough for Law Enforcement, Cybercrime Units, or SIH Jury Evaluation.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 font-inter text-xs">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-[#A58B6F]" /> Investigator / Official Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Inspector R. Sharma"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] glass-border text-white placeholder-neutral-600 focus:outline-none focus:border-[#A58B6F] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-[#A58B6F]" /> Official / Agency Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="investigator@cybercell.gov.in"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] glass-border text-white placeholder-neutral-600 focus:outline-none focus:border-[#A58B6F] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <Building className="w-3 h-3 text-[#A58B6F]" /> Organization / Agency
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="State Cyber Cell / SIH Jury"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] glass-border text-white placeholder-neutral-600 focus:outline-none focus:border-[#A58B6F] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">Agency Role</label>
                  <select
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e0e0e] glass-border text-white focus:outline-none focus:border-[#A58B6F] transition-all text-xs"
                  >
                    <option value="LEA">Law Enforcement Agency</option>
                    <option value="FIU">Financial Intelligence Unit</option>
                    <option value="Cyber">Cybercrime Investigation Cell</option>
                    <option value="SIH">SIH 2026 Evaluator / Jury</option>
                    <option value="Forensic">Blockchain Forensic Analyst</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-full bg-[#A58B6F] text-black font-inter text-[10px] uppercase tracking-widest font-semibold hover:bg-[#C4A482] bronze-glow hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-[#A58B6F]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-black" />
                <span>Request Agency Briefing</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4 font-inter">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-playfair text-2xl font-light text-white">
              Briefing Request Logged
            </h3>
            <p className="text-xs text-neutral-400 opacity-80 max-w-sm mx-auto leading-relaxed">
              Thank you, <span className="text-[#A58B6F] font-semibold">{formData.name || 'Investigator'}</span>. Our blockchain intelligence team will confirm agency credentials and send confidential sandbox access to <span className="text-neutral-200">{formData.email}</span>.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-4 px-6 py-2.5 rounded-full glass-border hover:bg-white hover:text-black text-white text-[10px] uppercase tracking-widest transition-all"
            >
              Return to Site
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

