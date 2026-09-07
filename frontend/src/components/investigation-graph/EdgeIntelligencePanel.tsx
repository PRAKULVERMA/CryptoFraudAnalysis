import React from 'react';
import { ArrowRight, Coins } from 'lucide-react';
import type { DerivedEdge } from './deriveGraph';
import type { InvestigationResult } from './investigationGraphStore';
import {
  formatValue,
  formatTimestamp,
  getExplorerTxUrl,
  shortAddress,
} from './graphFormat';
import { Chip, InfoRow, PanelShell, CopyButton, ExplorerLink, NaValue } from './ui';

const directionChipClass = (direction: string): string => {
  switch (direction) {
    case 'outgoing':
      return 'text-[#C4A482] border-[#A58B6F]/40 bg-[#A58B6F]/10';
    case 'incoming':
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    case 'self-transfer':
      return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
    default:
      return 'text-neutral-400 border-white/15 bg-white/5';
  }
};

export const EdgeIntelligencePanel = ({
  edge,
  investigation,
  asset,
  onClose,
}: {
  edge: DerivedEdge;
  investigation: InvestigationResult;
  asset: string;
  onClose: () => void;
}) => {
  const explorer = getExplorerTxUrl(edge.hash, investigation?.network);
  const directionLabel = edge.direction ? edge.direction.toUpperCase() : 'N/A';

  return (
    <PanelShell
      icon={<Coins className="w-4 h-4" />}
      title="Transaction Intelligence"
      subtitle={edge.hash ? shortAddress(edge.hash, 10, 6) : 'UNKNOWN HASH'}
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <Chip className={directionChipClass(edge.direction)}>
          <ArrowRight className="w-2.5 h-2.5" />
          {directionLabel}
        </Chip>
        {edge.hop !== null && (
          <Chip className="text-neutral-300 border-white/15 bg-white/5">
            HOP {edge.hop}
          </Chip>
        )}
      </div>

      <div>
        <InfoRow label="Tx Hash">
          <span className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="break-all">{edge.hash || 'N/A'}</span>
            <CopyButton value={edge.hash} />
          </span>
        </InfoRow>
        <InfoRow label="Network">
          {investigation?.network ? String(investigation.network).toUpperCase() : <NaValue />}
        </InfoRow>
        <InfoRow label="From">{edge.source || <NaValue />}</InfoRow>
        <InfoRow label="To">{edge.target || <NaValue />}</InfoRow>
        <InfoRow label="Value">
          {edge.value !== null ? (
            formatValue(edge.value, asset !== 'N/A' ? asset : null)
          ) : (
            <NaValue />
          )}
        </InfoRow>
        <InfoRow label="Asset">{asset !== 'N/A' ? asset : <NaValue />}</InfoRow>
        <InfoRow label="Timestamp">
          {edge.timestamp ? formatTimestamp(edge.timestamp) : <NaValue />}
        </InfoRow>
        <InfoRow label="Block">
          <NaValue />
        </InfoRow>
        <InfoRow label="Fee">
          <NaValue />
        </InfoRow>
        <InfoRow label="Status">
          <NaValue />
        </InfoRow>
        <InfoRow label="Direction">{directionLabel}</InfoRow>
        <InfoRow label="Hop">{edge.hop !== null ? edge.hop : <NaValue />}</InfoRow>
      </div>

      <p className="mt-3 text-[9px] font-mono text-neutral-600 leading-relaxed">
        Block, fee and confirmation status are not provided by the current trace provider
        and are shown as N/A rather than estimated.
      </p>

      <div className="mt-3 flex justify-end">
        <ExplorerLink href={explorer} label="View Transaction" />
      </div>
    </PanelShell>
  );
};