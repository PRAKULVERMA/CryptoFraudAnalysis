/**
 * Network layer for the LIVE investigation flow.
 *
 * The backend owns every field of the response. Nothing here fabricates,
 * defaults or rewrites investigation data — it only normalizes status
 * vocabulary and unwraps transport failures into a typed error.
 */

export type InvestigationNetwork = 'bitcoin' | 'ethereum';

/** Backend investigation record vocabulary (investigationJobService). */
export type InvestigationStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface InvestigationResult {
  [key: string]: any;
}

export interface InvestigationRecord {
  investigation_id?: string;
  wallet_address?: string;
  network?: string;
  status?: string;
  progress?: number;
  current_step?: string;
  created_at?: string;
  results?: InvestigationResult | null;
  last_error?: { code?: string; message?: string } | null;
  [key: string]: any;
}

export class InvestigationApiError extends Error {
  readonly code: string;
  readonly httpStatus: number | null;

  constructor(message: string, code: string, httpStatus: number | null) {
    super(message);
    this.name = 'InvestigationApiError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** The backend reports "completed" on the record and "COMPLETED" on the payload. */
export function normalizeStatus(value: unknown): InvestigationStatus {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'COMPLETED' || raw === 'COMPLETE' || raw === 'SUCCESS') return 'COMPLETED';
  if (raw === 'FAILED' || raw === 'FAILURE' || raw === 'ERROR') return 'FAILED';
  if (raw === 'CANCELLED' || raw === 'CANCELED') return 'CANCELLED';
  if (raw === 'RETRYING') return 'RETRYING';
  if (raw === 'RUNNING' || raw === 'IN_PROGRESS' || raw === 'PROCESSING') return 'RUNNING';
  if (raw === 'QUEUED' || raw === 'PENDING') return 'QUEUED';
  return 'UNKNOWN';
}

export const isTerminalStatus = (status: InvestigationStatus): boolean =>
  status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';

function extractMessage(payload: any, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  if (payload && typeof payload === 'object') {
    const candidate =
      payload.message ?? payload.error ?? payload.last_error?.message ?? payload.detail;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return fallback;
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * POST /api/investigate/wallet — the endpoint performs the full trace before
 * responding, so callers must supply an AbortSignal and tolerate long latency.
 */
export async function submitInvestigation(options: {
  address: string;
  network: InvestigationNetwork;
  signal?: AbortSignal;
}): Promise<InvestigationResult> {
  const { address, network, signal } = options;

  const response = await fetch('/api/investigate/wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, network }),
    signal,
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new InvestigationApiError(
      extractMessage(payload, `Investigation failed (HTTP ${response.status}).`),
      String(payload?.code ?? `HTTP_${response.status}`),
      response.status
    );
  }

  if (!payload || typeof payload !== 'object') {
    throw new InvestigationApiError(
      'The investigation service returned an unreadable response.',
      'INVALID_RESPONSE',
      response.status
    );
  }

  return payload as InvestigationResult;
}

/**
 * GET /api/investigations — used to observe the in-flight record created by the
 * POST so the UI can follow real backend progress instead of guessing.
 */
export async function fetchInvestigations(signal?: AbortSignal): Promise<InvestigationRecord[]> {
  const response = await fetch('/api/investigations', { signal });
  if (!response.ok) {
    throw new InvestigationApiError(
      `Unable to read investigation status (HTTP ${response.status}).`,
      `HTTP_${response.status}`,
      response.status
    );
  }
  const payload = await readJson(response);
  const list = Array.isArray(payload) ? payload : payload?.investigations;
  return Array.isArray(list) ? (list as InvestigationRecord[]) : [];
}

/** Newest record for this wallet/network created at or after `notBefore` (ms epoch). */
export function findInvestigation(
  records: InvestigationRecord[],
  address: string,
  network: string,
  notBefore: number
): InvestigationRecord | null {
  const wantedAddress = address.trim().toLowerCase();
  const wantedNetwork = network.trim().toLowerCase();

  const matches = records.filter((record) => {
    const recordAddress = String(record?.wallet_address ?? '').trim().toLowerCase();
    const recordNetwork = String(record?.network ?? '').trim().toLowerCase();
    if (recordAddress !== wantedAddress || recordNetwork !== wantedNetwork) return false;
    const createdAt = Date.parse(String(record?.created_at ?? ''));
    return Number.isFinite(createdAt) ? createdAt >= notBefore - 10_000 : true;
  });

  if (matches.length === 0) return null;

  return matches.reduce((latest, record) => {
    const latestAt = Date.parse(String(latest?.created_at ?? '')) || 0;
    const currentAt = Date.parse(String(record?.created_at ?? '')) || 0;
    return currentAt >= latestAt ? record : latest;
  });
}

/** LIVE / DEMO mode as reported by the backend. Defaults to LIVE (no demo UI). */
export async function fetchBackendMode(signal?: AbortSignal): Promise<'LIVE' | 'DEMO' | 'UNKNOWN'> {
  try {
    const response = await fetch('/api/monitoring/status', { signal });
    if (!response.ok) return 'UNKNOWN';
    const payload = await readJson(response);
    const mode = String(payload?.mode ?? '').trim().toUpperCase();
    if (mode === 'DEMO' || mode === 'LIVE') return mode;
    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}
