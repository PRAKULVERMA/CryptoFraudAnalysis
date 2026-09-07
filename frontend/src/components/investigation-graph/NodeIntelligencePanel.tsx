import React from 'react';
import { ShieldAlert, Building2, ShieldQuestion } from 'lucide-react';
import type { DerivedNode } from './deriveGraph';
import type { InvestigationResult } from './investigationGraphStore';
import { formatValue, getExplorerAddressUrl } from './graphFormat';
import { Chip, InfoRow, PanelShell, CopyButton, ExplorerLink, NaValue } from './ui';

const kindLabel = (kind: DerivedNode['kind']): string => {
  switch (kind) {
    case 'root':
      return 'SUSPECT WALLET (ROOT)';
    case 'verified':
      return 'VERIFIED ENTITY';
    case 'unknown-destination':
      return 'UNKNOWN DESTINATION';
    case 'destination':
      return 'DESTINATION';
    default:
      return 'INTERMEDIATE WALLET';
  }
};

const kindChipClass = (kind: DerivedNode['kind']): string => {
  switch (kind) {
    case 'root':
      return 'text-[#C4A482] border-[#A58B6F]/40 bg-[#A58B6F]/10';
    case 'verified':
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    case 'unknown-destination':
      return 'text-neutral-400 border-white/15 bg-white/5';
    case 'destination':
      return 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
    default:
      return 'text-blue-300 border-blue-400/30 bg-blue-400/10';
  }
};

export const NodeIntelligencePanel = ({
  node,
  investigation,
  asset,
  onClose,
}: {
  node: DerivedNode;
  investigation: InvestigationResult;
  asset: string;
  onClose: () => void;
}) => {
  const attribution = node.attribution;
  const status = attribution
    ? String(attribution.attributionStatus ?? attribution.status ?? 'N/A')
    : null;
  const entity = attribution ? attribution.entity ?? attribution.entity_name ?? null : null;
  const entityType = attribution
    ? attribution.entityType ??
      attribution.entity_type ??
      attribution.destination_type ??
      null
    : null;
  const attributionConfidence = attribution
    ? typeof attribution.confidence === 'number'
      ? `${attribution.confidence}%`
      : 'N/A'
    : null;
  const evidenceItems = Array.isArray(attribution?.evidence) ? attribution.evidence : [];
  const explorer = getExplorerAddressUrl(node.id, investigation?.network);

  return (
    <PanelShell
      icon={<ShieldAlert className="w-4 h-4" />}
      title="Wallet Intelligence"
      subtitle={kindLabel(node.kind)}
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <Chip className={kindChipClass(node.kind)}>{kindLabel(node.kind)}</Chip>
        {node.riskFlagged && (
          <Chip className="text-orange-400 border-orange-500/30 bg-orange-500/10">
            Risk Signal
          </Chip>
        )}
        {node.hop !== null && (
          <Chip className="text-neutral-300 border-white/15 bg-white/5">
            {node.kind === 'root' ? 'ROOT · HOP 0' : `HOP ${node.hop}`}
          </Chip>
        )}
      </div>

      <div>
        <InfoRow label="Address">
          <span className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="break-all">{node.id || 'N/A'}</span>
            <CopyButton value={node.id} />
          </span>
        </InfoRow>
        <InfoRow label="Network">
          {investigation?.network ? String(investigation.network).toUpperCase() : <NaValue />}
        </InfoRow>
        <InfoRow label="Node Type">{kindLabel(node.kind)}</InfoRow>
        <InfoRow label="Hop Depth">{node.hop !== null ? node.hop : <NaValue />}</InfoRow>
        <InfoRow label="Incoming">
          {node.inCount > 0
            ? `${node.inCount} tx · ${formatValue(node.inSum, asset)}`
            : '0 tx'}
        </InfoRow>
        <InfoRow label="Outgoing">
          {node.outCount > 0
            ? `${node.outCount} tx · ${formatValue(node.outSum, asset)}`
            : '0 tx'}
        </InfoRow>
      </div>

      <div data-attribution-block className="mt-4 pt-3 border-t border-white/10">
        <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-neutral-500 mb-2">
          Destination Attribution
        </div>
        {attribution && (entity || status) ? (
          <div>
            <InfoRow label="Entity">
              {entity || <NaValue>No entity name provided</NaValue>}
            </InfoRow>
            <InfoRow label="Status">
              <span
                className={
                  status === 'VERIFIED'
                    ? 'text-emerald-400'
                    : status === 'UNKNOWN' || status === 'ATTRIBUTION UNAVAILABLE'
                      ? 'text-neutral-500'
                      : 'text-[#C4A482]'
                }
              >
                {status || 'N/A'}
              </span>
            </InfoRow>
            <InfoRow label="Entity Type">{entityType || <NaValue />}</InfoRow>
            <InfoRow label="Confidence">{attributionConfidence}</InfoRow>
            <InfoRow label="Source">
              {attribution?.source ?? attribution?.data_source ?? <NaValue />}
            </InfoRow>
            {evidenceItems.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
                  Evidence
                </div>
                <ul className="space-y-1.5">
                  {evidenceItems.slice(0, 6).map((item: any, i: number) => (
                    <li
                      key={String(item?.type ?? item?.description ?? i) + '-' + i}
                      className="flex items-start gap-2 text-[10px] font-mono text-neutral-400 leading-snug"
                    >
                      <Building2 className="w-3 h-3 text-[#A58B6F] shrink-0 mt-0.5" />
                      <span className="min-w-0">
                        <span className="text-neutral-300">
                          {item?.description || item?.type || 'Evidence item'}
                        </span>
                        {item?.source && (
                          <span className="text-neutral-600">
                            {' '}
                            — {String(item.source)}
                          </span>
                        )}
                        {item?.strength && (
                          <span className="uppercase text-[9px] text-neutral-500">
                            {' '}
                            [{String(item.strength)}]
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {attribution?.note && (
              <p className="mt-3 text-[10px] font-mono text-neutral-500 leading-relaxed border-l-2 border-white/10 pl-2">
                {String(attribution.note)}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <ShieldQuestion className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
            <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">
              UNKNOWN DESTINATION — no verified attribution available for this wallet.
              Behavior alone is not treated as attribution.
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <ExplorerLink href={explorer} label="View on Explorer" />
      </div>
    </PanelShell>
  );
};