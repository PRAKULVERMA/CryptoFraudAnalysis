import { useSyncExternalStore } from 'react';
import {
  isTerminalStatus,
  normalizeStatus,
  submitInvestigation,
  type InvestigationNetwork,
} from '../../services/investigationApi';

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

/** Marks the graph workspace as tracing so it never shows a stale completed result. */
export function beginInvestigation(meta: { address: string; network: string; source: InvestigationSource }) {
  setState({
    result: null,
    address: meta.address,
    network: meta.network,
    error: null,
    isRunning: true,
    source: meta.source,
  });
}

export function failInvestigation(message: string) {
  setState({ result: null, error: message, isRunning: false });
}

export function clearInvestigation() {
  setState(initialState);
}

/**
 * Shared API client for the investigation endpoint.
 * Delegates to the single network layer so status handling and abort support
 * stay identical to the LiveInvestigationSearch flow.
 */
export async function runInvestigation(
  address: string,
  network: string,
  source: InvestigationSource,
  signal?: AbortSignal
): Promise<InvestigationResult> {
  const trimmed = address.trim();
  setState({
    result: null,
    isRunning: true,
    error: null,
    address: trimmed,
    network,
    source,
  });

  try {
    const result = await submitInvestigation({
      address: trimmed,
      network: network.trim().toLowerCase() as InvestigationNetwork,
      signal,
    });

    const status = normalizeStatus(result.status);
    if (status !== 'COMPLETED' && isTerminalStatus(status)) {
      throw new Error('The investigation could not be completed.');
    }

    publishInvestigation(result, { address: trimmed, network, source });
    return result;
  } catch (error) {
    const aborted =
      error instanceof DOMException && error.name === 'AbortError';
    if (!aborted) {
      const message =
        error instanceof Error ? error.message : 'Investigation failed. Please try again.';
      setState({ result: null, isRunning: false, error: message });
    }
    throw error;
  }
}