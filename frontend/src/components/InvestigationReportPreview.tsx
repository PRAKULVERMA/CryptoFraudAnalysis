import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Network,
  Database,
  Building2,
  Loader2,
  Lock,
} from 'lucide-react';

interface InvestigationReportPreviewProps {
  investigation: any;
  onClose: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return 'N/A';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getRiskClass = (riskLevel?: string) => {
  const level = String(riskLevel || '').toUpperCase();

  if (level === 'CRITICAL') {
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  }

  if (level === 'HIGH') {
    return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  }

  if (level === 'MEDIUM') {
    return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  }

  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
};

export const InvestigationReportPreview: React.FC<
  InvestigationReportPreviewProps
> = ({ investigation, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const navigation = document.getElementById('main-navigation');
    const previousDisplay = navigation?.style.display;

    if (navigation) {
      navigation.style.display = 'none';
    }

    return () => {
      if (navigation) {
        navigation.style.display = previousDisplay || '';
      }
    };
  }, []);

  const handleExportPDF = async () => {
    if (!investigation?.investigation_id) {
      setExportError('Investigation ID is missing. Unable to export report.');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch(
        `/api/investigations/${investigation.investigation_id}/report`
      );

      if (!response.ok) {
        throw new Error('PDF export failed.');
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `CHAINTRACE-${investigation.caseId || investigation.investigation_id}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export error:', error);
      setExportError(
        'Unable to export the PDF. Please make sure the report service is running.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const patterns = Array.isArray(investigation.patterns)
    ? investigation.patterns
    : [];

  const riskFactors = Array.isArray(investigation.risk_factors)
    ? investigation.risk_factors
    : [];

  const traceSummary = investigation.trace_summary || {};
  const destination = investigation.destination || {};

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl overflow-y-auto">
      {/* Top Navigation */}
      <div className="sticky top-0 z-20 bg-[#080808]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#A58B6F]/10 border border-[#A58B6F]/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#A58B6F]" />
            </div>

            <div>
              <div className="text-white text-sm font-semibold tracking-wide">
                CHAINTRACE AI
              </div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-neutral-500">
                Investigation Report Preview
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#A58B6F] text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-[#C4A482] transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Export as PDF
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all"
              aria-label="Close report"
            >
              <X className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>

      {/* Report */}
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* Report Header */}
        <section className="relative overflow-hidden rounded-3xl border border-[#A58B6F]/30 bg-[#0b0b0b] shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#A58B6F] to-transparent" />

          <div className="p-6 sm:p-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-[#A58B6F]" />

                  <span className="text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em]">
                    Digital Forensic Intelligence Report
                  </span>
                </div>

                <h1 className="font-playfair text-3xl sm:text-5xl text-white font-light tracking-tight">
                  Blockchain Investigation
                </h1>

                <p className="mt-3 text-neutral-500 text-sm font-inter">
                  Automated transaction tracing and fraud-network analysis
                </p>
              </div>

              <div className="lg:text-right">
                <div className="text-[9px] text-neutral-500 font-mono uppercase tracking-[0.2em]">
                  CASE IDENTIFIER
                </div>

                <div className="text-white font-mono text-sm mt-1">
                  {investigation.caseId || 'N/A'}
                </div>

                <div className="text-[9px] text-neutral-500 font-mono uppercase tracking-[0.2em] mt-4">
                  INVESTIGATION ID
                </div>

                <div className="text-neutral-300 font-mono text-[10px] mt-1 break-all">
                  {investigation.investigation_id || 'N/A'}
                </div>
              </div>
            </div>

            {/* Target */}
            <div className="mt-8 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[9px] text-[#A58B6F] font-mono uppercase tracking-widest mb-2">
                    Investigated Wallet
                  </div>

                  <div className="font-mono text-xs sm:text-sm text-white break-all">
                    {investigation.address}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[10px] text-neutral-300 font-mono uppercase">
                    {investigation.network}
                  </span>

                  <span className="px-3 py-1.5 rounded-lg border border-[#A58B6F]/30 bg-[#A58B6F]/10 text-[10px] text-[#C4A482] font-mono uppercase">
                    {investigation.mode || 'UNKNOWN'} MODE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Risk Overview */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 rounded-2xl border border-red-500/20 bg-red-950/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
                  Overall Risk
                </div>

                <div className="text-5xl font-playfair text-red-400 mt-2">
                  {investigation.riskScore ?? 0}
                </div>

                <div className="text-[10px] font-mono text-neutral-500 mt-1">
                  / 100 RISK SCORE
                </div>
              </div>

              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <div
              className={`inline-flex mt-5 px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider ${getRiskClass(
                investigation.riskLevel
              )}`}
            >
              {investigation.riskLevel || 'UNKNOWN'} RISK
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <Metric
              icon={<Activity className="w-4 h-4" />}
              label="Transactions Analyzed"
              value={investigation.transactionsAnalyzed ?? 0}
            />

            <Metric
              icon={<Network className="w-4 h-4" />}
              label="Maximum Hop Depth"
              value={investigation.hopCount ?? 0}
            />

            <Metric
              icon={<Database className="w-4 h-4" />}
              label="Funds Traced"
              value={investigation.fundsTraced || 'N/A'}
            />

            <Metric
              icon={<Building2 className="w-4 h-4" />}
              label="Destination"
              value={investigation.destinationExchange || 'UNKNOWN'}
            />
          </div>
        </section>

        {/* Destination Attribution */}
        <ReportSection
          icon={<Building2 className="w-4 h-4" />}
          title="Destination Attribution"
          subtitle="Likely service or exchange destination identified through transaction analysis"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoItem
              label="Entity"
              value={
                destination.entity_name ||
                investigation.destinationExchange ||
                'UNKNOWN'
              }
            />

            <InfoItem
              label="Destination Type"
              value={destination.destination_type || 'UNKNOWN'}
            />

            <InfoItem
              label="Confidence"
              value={investigation.confidence || 'N/A'}
            />
          </div>
        </ReportSection>

        {/* Fraud Patterns */}
        <ReportSection
          icon={<AlertTriangle className="w-4 h-4" />}
          title="Detected Fraud Patterns"
          subtitle="Patterns identified by automated graph and heuristic analysis"
        >
          {patterns.length > 0 ? (
            <div className="space-y-3">
              {patterns.map((pattern: any, index: number) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono flex items-center justify-center shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="min-w-0">
                      <div className="text-sm text-white font-medium">
                        {typeof pattern === 'string'
                          ? pattern
                          : pattern.name ||
                            pattern.type ||
                            pattern.pattern ||
                            'Suspicious transaction pattern'}
                      </div>

                      {typeof pattern === 'object' && pattern.description && (
                        <div className="text-xs text-neutral-500 mt-1">
                          {pattern.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No high-confidence fraud patterns were detected." />
          )}
        </ReportSection>

        {/* Risk Factors */}
        <ReportSection
          icon={<ShieldAlert className="w-4 h-4" />}
          title="Risk Factors"
          subtitle="Indicators contributing to the calculated risk score"
        >
          {riskFactors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {riskFactors.map((factor: any, index: number) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />

                    <div className="text-xs text-neutral-300">
                      {typeof factor === 'string'
                        ? factor
                        : factor.reason ||
                          factor.description ||
                          factor.name ||
                          'Risk indicator detected'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No additional risk factors were returned." />
          )}
        </ReportSection>

        {/* Trace Summary */}
        <ReportSection
          icon={<Network className="w-4 h-4" />}
          title="Blockchain Trace Summary"
          subtitle="Automated traversal and graph analysis results"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoItem
              label="Transactions"
              value={traceSummary.transactions_analyzed ?? investigation.transactionsAnalyzed ?? 0}
            />

            <InfoItem
              label="Maximum Hops"
              value={traceSummary.max_hops ?? investigation.hopCount ?? 0}
            />

            <InfoItem
              label="Wallet Cluster"
              value={investigation.clusteringTag || 'None detected'}
            />

            <InfoItem
              label="Peeling Chain"
              value={investigation.peelingChains || 'None identified'}
            />
          </div>
        </ReportSection>

        {/* Compliance */}
        <ReportSection
          icon={<Lock className="w-4 h-4" />}
          title="Compliance & Screening"
          subtitle="Automated screening indicators included in this investigation"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center gap-3">
              {investigation.ofacMatch ? (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}

              <div>
                <div className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider">
                  OFAC Screening
                </div>

                <div
                  className={`text-sm mt-1 ${
                    investigation.ofacMatch
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {investigation.ofacMatch
                    ? 'Potential Match'
                    : 'No Match Detected'}
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider">
                Analysis Status
              </div>

              <div className="text-sm text-emerald-400 mt-1">
                {investigation.status || 'COMPLETED'}
              </div>
            </div>

            <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider">
                Data Mode
              </div>

              <div className="text-sm text-[#C4A482] mt-1">
                {investigation.mode || 'UNKNOWN'}
              </div>
            </div>
          </div>
        </ReportSection>

        {/* Evidence / Limitations */}
        <ReportSection
          icon={<FileText className="w-4 h-4" />}
          title="Evidence & Methodology"
          subtitle="How this report should be interpreted"
        >
          <div className="space-y-3 text-xs leading-relaxed text-neutral-400">
            <p>
              This report summarizes automated blockchain transaction tracing,
              graph traversal, clustering heuristics, risk scoring, and
              destination attribution performed by CHAINTRACE AI.
            </p>

            <p>
              Blockchain addresses and transaction relationships are analyzed
              as publicly observable ledger data. Attribution results represent
              analytical confidence and should be independently verified before
              being used for legal, regulatory, or enforcement action.
            </p>

            <p className="text-amber-400/80">
              Destination attribution and risk classifications are analytical
              indicators, not proof of criminal activity or ownership.
            </p>
          </div>
        </ReportSection>

        {/* Metadata */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.015] p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoItem
              label="Investigation Started"
              value={formatDate(investigation.timestamp || investigation.created_at)}
            />

            <InfoItem
              label="Investigation Completed"
              value={formatDate(investigation.completed_at)}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 pb-8 text-center">
          <div className="h-px bg-white/10 mb-6" />

          <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-neutral-600">
            CHAINTRACE AI • BLOCKCHAIN INTELLIGENCE PLATFORM
          </div>

          <div className="text-[9px] font-mono text-neutral-700 mt-2">
            CONFIDENTIAL INVESTIGATION MATERIAL
          </div>
        </footer>

        {exportError && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[120] px-5 py-3 rounded-xl bg-red-950/90 border border-red-500/30 text-red-300 text-xs shadow-2xl">
            {exportError}
          </div>
        )}
      </main>
    </div>
  );
};

const Metric = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <div className="flex items-center gap-2 text-[#A58B6F]">
      {icon}
      <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
        {label}
      </span>
    </div>

    <div className="text-lg text-white font-semibold mt-3 break-words">
      {value}
    </div>
  </div>
);

const ReportSection = ({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <section className="mt-6 rounded-2xl border border-white/10 bg-[#0b0b0b] p-6 sm:p-7">
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-lg bg-[#A58B6F]/10 border border-[#A58B6F]/20 flex items-center justify-center text-[#A58B6F] shrink-0">
        {icon}
      </div>

      <div>
        <h2 className="text-white text-sm font-semibold uppercase tracking-wider">
          {title}
        </h2>

        <p className="text-neutral-600 text-[11px] mt-1">
          {subtitle}
        </p>
      </div>
    </div>

    {children}
  </section>
);

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
    <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
      {label}
    </div>

    <div className="text-sm text-white mt-2 break-words">
      {value}
    </div>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.015] text-xs text-neutral-500">
    {text}
  </div>
);