import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchInvestigations,
  findInvestigation,
  isTerminalStatus,
  normalizeStatus,
  submitInvestigation,
  InvestigationApiError,
  type InvestigationNetwork,
  type InvestigationRecord,
  type InvestigationResult,
} from '../services/investigationApi';

export type InvestigationPhase = 'idle' | 'loading' | 'completed' | 'error';

export interface InvestigationRunState {
  phase: InvestigationPhase;
  result: InvestigationResult | null;
  error: string | null;
  /** 0-100 reported by the backend record, null while unknown. */
  progress: number | null;
  /** Backend current_step, e.g. FETCHING_WALLET_TRANSACTIONS. */
  stage: string | null;
  investigationId: string | null;
  elapsedMs: number;
}

const INITIAL: InvestigationRunState = {
  phase: 'idle',
  result: null,
  error: null,
  progress: null,
  stage: null,
  investigationId: null,
  elapsedMs: 0,
};

const POLL_INTERVAL_MS = 2500;
const ELAPSED_TICK_MS = 1000;
/** Upper bound for a single investigation before the UI surfaces a timeout. */
const HARD_TIMEOUT_MS = 15 * 60 * 1000;
/** Grace period for a transport-level POST failure with no record observed yet. */
const POST_FAILURE_GRACE_MS = 20_000;

const isAbort = (error: unknown): boolean =>
  error instanceof DOMException ? error.name === 'AbortError' : false;

const readProgress = (record: InvestigationRecord): number | null => {
  const value = Number(record?.progress);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
};

export function useInvestigationRunner(
  onSettled?: (result: InvestigationResult) => void
) {
  const [state, setState] = useState<InvestigationRunState>(INITIAL);

  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<number | null>(null);
  const elapsedRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const postGraceRef = useRef<number | null>(null);
  const postFailureRef = useRef<string | null>(null);
  const recordSeenRef = useRef(false);
  const startedAtRef = useRef<number>(0);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);

  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  /** Clears every timer/subscription this hook created and aborts in-flight work. */
  const stopAll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    if (elapsedRef.current !== null) {
      window.clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
    if (deadlineRef.current !== null) {
      window.clearTimeout(deadlineRef.current);
      deadlineRef.current = null;
    }
    if (postGraceRef.current !== null) {
      window.clearTimeout(postGraceRef.current);
      postGraceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => stopAll, [stopAll]);

  const reset = useCallback(() => {
    stopAll();
    settledRef.current = false;
    setState(INITIAL);
  }, [stopAll]);

  const run = useCallback(
    (address: string, network: InvestigationNetwork) => {
      stopAll();
      settledRef.current = false;

      const trimmed = address.trim();
      const notBefore = Date.now();
      startedAtRef.current = notBefore;
      postFailureRef.current = null;
      recordSeenRef.current = false;

      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        phase: 'loading',
        result: null,
        error: null,
        progress: null,
        stage: null,
        investigationId: null,
        elapsedMs: 0,
      });

      const finish = (
        next: Pick<InvestigationRunState, 'phase'> &
          Partial<InvestigationRunState> & { result?: InvestigationResult | null }
      ) => {
        if (settledRef.current) return;
        settledRef.current = true;
        stopAll();
        setState((prev) => ({
          ...prev,
          ...next,
          elapsedMs: Date.now() - startedAtRef.current,
        }));
        if (next.result) onSettledRef.current?.(next.result);
      };

      const completeWith = (result: InvestigationResult) => {
        finish({ phase: 'completed', result, progress: 100, error: null, stage: 'COMPLETED' });
      };

      const failWith = (message: string) => {
        finish({ phase: 'error', result: null, error: message });
      };

      elapsedRef.current = window.setInterval(() => {
        setState((prev) =>
          prev.phase === 'loading'
            ? { ...prev, elapsedMs: Date.now() - startedAtRef.current }
            : prev
        );
      }, ELAPSED_TICK_MS);

      deadlineRef.current = window.setTimeout(() => {
        failWith(
          'The investigation did not complete within the allotted time. The backend may still be processing it — retry or check the backend logs.'
        );
      }, HARD_TIMEOUT_MS);

      // Observe the backend record so progress is real, then stop immediately
      // on COMPLETED / FAILED / CANCELLED.
      const poll = async () => {
        if (settledRef.current || controller.signal.aborted) return;
        try {
          const records = await fetchInvestigations(controller.signal);
          const record = findInvestigation(records, trimmed, network, notBefore);
          if (record) {
            if (!recordSeenRef.current) {
              recordSeenRef.current = true;
              // The record exists, so a failed POST is only a transport problem.
              if (postGraceRef.current !== null) {
                window.clearTimeout(postGraceRef.current);
                postGraceRef.current = null;
              }
            }
            const status = normalizeStatus(record.status);
            setState((prev) => {
              if (prev.phase !== 'loading' || settledRef.current) return prev;
              return {
                ...prev,
                progress: readProgress(record),
                stage: record.current_step ?? prev.stage,
                investigationId: record.investigation_id ?? prev.investigationId,
              };
            });

            if (isTerminalStatus(status)) {
              if (status === 'COMPLETED' && record.results && typeof record.results === 'object') {
                completeWith(record.results as InvestigationResult);
                return;
              }
              if (status === 'COMPLETED') {
                failWith('The investigation completed but the backend returned no result payload.');
                return;
              }
              failWith(
                extractFailureMessage(
                  record,
                  status === 'CANCELLED'
                    ? 'The investigation was cancelled.'
                    : 'The backend could not complete this investigation.'
                )
              );
              return;
            }
          }
        } catch (error) {
          if (isAbort(error) || settledRef.current) return;
          // A failed status read must never end the run; the POST remains authoritative.
        }

        if (!settledRef.current && !controller.signal.aborted) {
          pollRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      };

      pollRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);

      // The POST itself returns the completed investigation; when it lands first
      // it wins and the poll loop is torn down.
      const postPromise = submitInvestigation({ address: trimmed, network, signal: controller.signal })
        .then((result) => {
          if (settledRef.current) return;
          const status = normalizeStatus(result.status);
          if (status === 'COMPLETED' || !result.status) {
            completeWith(result);
            return;
          }
          if (isTerminalStatus(status)) {
            failWith(
              extractFailureMessage(
                result as InvestigationRecord,
                'The investigation could not be completed.'
              )
            );
          }
          // Non-terminal payload: keep waiting for the polled record to finish.
        })
        .catch((error: unknown) => {
          if (isAbort(error) || settledRef.current) return;

          // A 4xx is a definite rejection (invalid address, auth, rate limit).
          if (error instanceof InvestigationApiError && error.httpStatus !== null && error.httpStatus < 500) {
            failWith(error.message);
            return;
          }

          // The trace endpoint can outlast intermediary/proxy socket limits even
          // though the backend keeps working. The polled record stays
          // authoritative, so only give up if it never appears.
          postFailureRef.current = error instanceof Error ? error.message : 'Investigation request failed.';
          if (!recordSeenRef.current) {
            postGraceRef.current = window.setTimeout(() => {
              if (settledRef.current || recordSeenRef.current) return;
              failWith(
                postFailureRef.current ??
                  'The investigation service did not accept the request.'
              );
            }, POST_FAILURE_GRACE_MS);
          }
        });

      void postPromise;
    },
    [stopAll]
  );

  return { state, run, reset };
}

function extractFailureMessage(record: InvestigationRecord, fallback: string): string {
  const lastError = record?.last_error;
  if (lastError && typeof lastError.message === 'string' && lastError.message.trim()) {
    return lastError.message.trim();
  }
  if (typeof record?.message === 'string' && record.message.trim()) return record.message.trim();
  if (typeof record?.error === 'string' && record.error.trim()) return record.error.trim();
  return fallback;
}
