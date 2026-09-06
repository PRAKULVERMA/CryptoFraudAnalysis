import config from '../../config/index.js';
import investigationService from './investigationService.js';
import { analyzeWallet } from '../investigation.js';

const RETRYABLE_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'EAI_AGAIN',
  'RATE_LIMITED',
  'PROVIDER_UNAVAILABLE',
  'TRANSIENT_FAILURE',
]);

function isRetryable(error) {
  if (!error || typeof error !== 'object') return false;
  const code = error.code || error.name || '';
  if (RETRYABLE_CODES.has(code)) return true;
  const message = String(error.message || '').toLowerCase();
  if (message.includes('timeout') || message.includes('429') || message.includes('5xx') || message.includes('service unavailable')) {
    return true;
  }
  return false;
}

function safeError(error) {
  if (!error) return 'Investigation processing failed.';
  const code = error.code || 'INVESTIGATION_FAILED';
  const message = error.publicMessage || error.message || 'Investigation processing failed.';
  return { code, message };
}

function getBackoffMs(retryCount) {
  const base = 1000;
  const max = 30000;
  const delay = base * Math.pow(2, retryCount);
  return Math.min(delay, max);
}

export class InvestigationJobService {
  async enqueue(investigationId) {
    const investigation = await investigationService.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error('Investigation not found.');
    }

    if (!['queued', 'failed', 'retrying'].includes(investigation.status)) {
      return investigation;
    }

    const claimed = await investigationService.updateInvestigation(investigationId, {
      status: 'queued',
      retry_count: 0,
      max_retries: investigation.max_retries || config.INVESTIGATION_MAX_RETRIES,
      last_error: null,
      failed_at: null,
      started_at: null,
      completed_at: null,
    });

    this.processInvestigation(investigationId).catch((error) => {
      console.error('Unhandled investigation job error:', safeError(error));
    });

    return claimed || investigation;
  }

  async processInvestigation(investigationId) {
    const maxRetries = config.INVESTIGATION_MAX_RETRIES;
    let attempt = 0;

    while (attempt <= maxRetries) {
      const claimed = await investigationService.claimInvestigation(investigationId);
      if (!claimed) {
        const current = await investigationService.getInvestigation(investigationId);
        if (current?.status === 'completed') return current;
        console.warn(`Investigation ${investigationId} could not be claimed. Another worker may be processing it.`);
        return current;
      }

      try {
        await investigationService.updateInvestigation(investigationId, {
          status: 'running',
          started_at: new Date().toISOString(),
          progress: 10,
          current_step: 'FETCHING_WALLET_TRANSACTIONS',
          updated_at: new Date().toISOString(),
        });

        const investigation = await investigationService.getInvestigation(investigationId);
        if (!investigation) return null;

        await investigationService.updateInvestigation(investigationId, {
          progress: 20,
          current_step: 'NORMALIZING_TRANSACTIONS',
          updated_at: new Date().toISOString(),
        });

        const result = await analyzeWallet(investigation.wallet_address, investigation.network, investigation.investigation_id);

        await investigationService.updateInvestigation(investigationId, {
          progress: 80,
          current_step: 'BUILDING_TRACE',
          updated_at: new Date().toISOString(),
        });

        const withInvestigation = {
          ...result,
          investigation_id: investigation.investigation_id,
          user_id: investigation.user_id,
          status: 'COMPLETED',
          synthetic: Boolean(result.synthetic),
          mode: result.mode || 'DEMO',
        };

        const completed = await investigationService.updateInvestigation(investigationId, {
          status: 'completed',
          progress: 100,
          current_step: 'INVESTIGATION COMPLETED',
          completed_at: new Date().toISOString(),
          results: withInvestigation,
          updated_at: new Date().toISOString(),
        });

        console.log(`Investigation ${investigationId} completed.`);
        return completed || withInvestigation;
      } catch (error) {
        attempt += 1;
        const isRetryableError = isRetryable(error);

        if (isRetryableError && attempt <= maxRetries) {
          const backoffMs = getBackoffMs(attempt - 1);
          console.warn(`Investigation ${investigationId} failed (attempt ${attempt}/${maxRetries}). Retrying in ${backoffMs}ms.`, safeError(error));

          await investigationService.updateInvestigation(investigationId, {
            status: 'queued',
            progress: Math.max(0, (await investigationService.getInvestigation(investigationId))?.progress || 0),
            current_step: `RETRYING AFTER FAILURE (ATTEMPT ${attempt}/${maxRetries})`,
            retry_count: attempt,
            last_error: safeError(error),
            updated_at: new Date().toISOString(),
          });

          await new Promise((resolve) => setTimeout(resolve, backoffMs));

          const current = await investigationService.getInvestigation(investigationId);
          if (!current || current.status === 'cancelled') {
            return current;
          }
          continue;
        }

        console.error(`Investigation ${investigationId} failed permanently after ${attempt} attempt(s).`, safeError(error));

        await investigationService.updateInvestigation(investigationId, {
          status: 'failed',
          failed_at: new Date().toISOString(),
          last_error: safeError(error),
          updated_at: new Date().toISOString(),
        });

        return null;
      }
    }
  }

  async recoverStaleJobs() {
    const staleThreshold = config.INVESTIGATION_STALE_TIMEOUT_MS;
    const staleJobs = await investigationService.listInvestigations();

    const stale = staleJobs.filter((job) => {
      if (!['running', 'retrying'].includes(job.status)) return false;
      const updatedAt = job.updated_at ? new Date(job.updated_at).getTime() : 0;
      return Date.now() - updatedAt > staleThreshold;
    });

    for (const job of stale) {
      console.warn(`Recovering stale investigation ${job.investigation_id} (status: ${job.status}).`);

      if (job.retry_count < (job.max_retries || config.INVESTIGATION_MAX_RETRIES)) {
        await investigationService.updateInvestigation(job.investigation_id, {
          status: 'queued',
          retry_count: job.retry_count || 0,
          updated_at: new Date().toISOString(),
        });
        this.processInvestigation(job.investigation_id).catch((error) => {
          console.error(`Failed to recover investigation ${job.investigation_id}:`, safeError(error));
        });
      } else {
        await investigationService.updateInvestigation(job.investigation_id, {
          status: 'failed',
          failed_at: new Date().toISOString(),
          last_error: { code: 'INVESTIGATION_STALE', message: 'Investigation was interrupted and exceeded maximum retries.' },
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (stale.length > 0) {
      console.log(`Recovered ${stale.length} stale investigation(s).`);
    }
  }

  async retryInvestigation(investigationId) {
    const investigation = await investigationService.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error('Investigation not found.');
    }

    if (investigation.status !== 'failed') {
      throw new Error('Only failed investigations can be retried.');
    }

    const updated = await investigationService.updateInvestigation(investigationId, {
      status: 'queued',
      progress: 0,
      current_step: 'QUEUED FOR PROCESSING',
      retry_count: 0,
      last_error: null,
      failed_at: null,
      started_at: null,
      completed_at: null,
      results: null,
      updated_at: new Date().toISOString(),
    });

    this.processInvestigation(investigationId).catch((error) => {
      console.error(`Manual retry failed for investigation ${investigationId}:`, safeError(error));
    });

    return updated;
  }
}

export default new InvestigationJobService();
