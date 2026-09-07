import React, { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink } from 'lucide-react';

export const Chip = ({
  children,
  className = '',
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) => (
  <span
    title={title}
    className={
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono text-[9px] uppercase tracking-wider whitespace-nowrap ' +
      className
    }
  >
    {children}
  </span>
);

export const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-b-0">
    <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 shrink-0 pt-0.5">
      {label}
    </span>
    <span className="font-mono text-[11px] text-neutral-200 text-right break-all min-w-0">
      {children}
    </span>
  </div>
);

export const PanelShell = ({
  icon,
  title,
  subtitle,
  onClose,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="glass-card rounded-2xl border glass-border bg-[#0a0a0a]/95 backdrop-blur-xl overflow-hidden shadow-2xl">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10">
      <div className="w-7 h-7 rounded-lg bg-[#A58B6F]/10 border border-[#A58B6F]/25 flex items-center justify-center text-[#A58B6F] shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white font-semibold truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-[9px] font-mono text-neutral-500 truncate">{subtitle}</div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-neutral-500 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
        title="Close panel"
      >
        ✕
      </button>
    </div>
    <div className="p-4 max-h-[52vh] lg:max-h-[62vh] overflow-y-auto">{children}</div>
  </div>
);

export const CopyButton = ({ value }: { value?: string | null }) => {
  const [copied, setCopied] = useState(false);
  const text = String(value || '');
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={() => {
        if (!navigator.clipboard) return;
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          })
          .catch(() => undefined);
      }}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
      title="Copy"
    >
      {copied ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      <span className="text-[9px] font-mono">{copied ? 'COPIED' : 'COPY'}</span>
    </button>
  );
};

/** Explorer action rendered only when the URL is derivable from known data. */
export const ExplorerLink = ({ href, label }: { href: string | null; label: string }) => {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#A58B6F]/30 bg-[#A58B6F]/10 text-[#C4A482] hover:bg-[#A58B6F]/20 hover:border-[#A58B6F]/60 transition-colors text-[9px] font-mono uppercase tracking-wider cursor-pointer"
    >
      <ExternalLink className="w-3 h-3" />
      <span>{label}</span>
    </a>
  );
};

export const NaValue = ({ children = 'N/A' }: { children?: React.ReactNode }) => (
  <span className="text-neutral-600">{children}</span>
);