import { useSyncExternalStore } from 'react';

/**
 * Minimal shape contract for the /api/investigate/wallet response.
 * The backend owns the data; every unknown field must render as N/A — never fabricated.
 */
export interface InvestigationResult {
  [key: string]: any;
}

export type InvestigationSource = 'search' | 'workspace';

export interface InvestigationState {
  result: InvestigationResult | null;
  address: string | null;
  network: string | null;
  error: string | null;
  isRunning: boolean;
  source: InvestigationSource | null;
}

const initialState: InvestigationState = {
  result: null,
  address: null,
  network: null,
  error: null,
  isRunning: false,
  source: null,
};

let state: InvestigationState = initialState;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<InvestigationState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState() {
  return state;
}

export function useInvestigationState(): InvestigationState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function publishInvestigation(
  result: InvestigationResult,
  meta: { address: string; network: string; source: InvestigationSource }
) {
  setState({
    result,
    address: meta.address,
    network: meta.network,
    error: null,
    isRunning: false,
    source: meta.source,
  });
}

export function clearInvestigation() {
  setState(initialState);
}

/**
 * Shared API client for the investigation endpoint.
 * Mirrors the contract used by LiveInvestigationSearch (POST /api/investigate/wallet).
 */
export async function runInvestigation(
  address: string,
  network: string,
  source: InvestigationSource
): Promise<InvestigationResult> {
  const trimmed = address.trim();
  setState({
    isRunning: true,
    error: null,
    address: trimmed,
    network,
    source,
  });

  try {
    const response = await fetch('/api/investigate/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: trimmed, network }),
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseData = null;
    }

    if (!response.ok) {
      const message =
        responseData?.message ||
        responseData?.error ||
        responseText ||
        `Investigation failed (${response.status})`;
      throw new Error(typeof message === 'string' ? message : 'Investigation failed.');
    }

    if (!responseData || typeof responseData !== 'object') {
      throw new Error('The investigation service returned an invalid response.');
    }

    publishInvestigation(responseData, { address: trimmed, network, source });
    return responseData;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Investigation failed. Please try again.';
    setState({ isRunning: false, error: message });
    throw error;
  }
}