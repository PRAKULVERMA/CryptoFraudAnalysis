import config from '../../config/index.js';
import {
  PROVIDER_ERROR_CODES,
  RETRYABLE_STATUS_CODES,
  createProviderError,
  isAuthFailure,
  isRateLimited,
  isRetryableProviderError,
  redactText,
  redactUrl,
  normalizeProviderFailure,
} from './providerErrors.js';

const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'EPIPE',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ENETDOWN',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

const NON_RETRYABLE_NETWORK_CODES = new Set(['ENOTFOUND', 'ERR_INVALID_URL', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT']);

export function createProviderMetrics() {
  return {
    provider_requests: 0,
    provider_retries: 0,
    provider_timeouts: 0,
    provider_failure_count: 0,
  };
}

function computeBackoffMs(attemptIndex, retryAfterHeader) {
  const base = Math.max(0, Number(config.BLOCKCHAIN_PROVIDER_RETRY_BASE_DELAY) || 250);
  const max = Math.max(base, Number(config.BLOCKCHAIN_PROVIDER_RETRY_MAX_DELAY) || 5000);
  const exponential = Math.min(max, base * Math.pow(2, Math.max(0, attemptIndex)));
  const jittered = Math.round(exponential * (0.5 + Math.random() * 0.5));
  const retryAfterMs = Number(retryAfterHeader);

  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return Math.min(max, Math.round(retryAfterMs * 1000));
  }

  return Math.min(max, Math.max(jittered, 1));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logProviderEvent(level, provider, message, meta = {}) {
  const prefix = `[${provider || 'Provider'}] ${message}`;
  const safe = {
    ...meta,
    url: meta.url ? redactUrl(meta.url) : undefined,
    body_preview: meta.body_preview ? redactText(meta.body_preview) : undefined,
  };

  if (level === 'error') console.error(prefix, safe);
  else if (level === 'warn') console.warn(prefix, safe);
  else console.log(prefix, safe);
}

function describeResponseFailure({ status, statusText, bodyPreview, provider, network, url }) {
  return `Provider ${provider} (${network}) returned HTTP ${status}${statusText ? ` ${statusText}` : ''}. Body: ${redactText(String(bodyPreview || '').slice(0, 200)) || '<empty>'}. URL: ${redactUrl(url)}`;
}

async function performAttempt(url, { provider, network, timeoutMs }) {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || 'unknown';
      const bodyText = await response.text().catch(() => '');

      logProviderEvent('warn', provider, `HTTP ${response.status}`, {
        network,
        status: response.status,
        content_type: contentType,
        body_len: bodyText.length,
        body_preview: bodyText.slice(0, 200),
        url,
      });

      if (isAuthFailure(response.status, bodyText)) {
        return {
          ok: false,
          retryable: false,
          error: createProviderError(
            PROVIDER_ERROR_CODES.PROVIDER_AUTH_ERROR,
            `Provider ${provider} rejected the request credentials (HTTP ${response.status}).`,
            response.status,
            null,
            { provider, network, status: response.status, retryable: false },
          ),
        };
      }

      const retryable = isRetryableStatusCode(response.status);

      return {
        ok: false,
        retryable,
        retryAfter: response.headers.get('retry-after'),
        error: createProviderError(
          PROVIDER_ERROR_CODES.PROVIDER_HTTP_ERROR,
          describeResponseFailure({ status: response.status, statusText: response.statusText, bodyPreview: bodyText, provider, network, url }),
          response.status === 429 ? 429 : 502,
          null,
          { provider, network, status: response.status, retryable },
        ),
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const bodyText = await response.text().catch(() => null);

    if (bodyText === null) {
      return {
        ok: false,
        retryable: true,
        error: createProviderError(
          PROVIDER_ERROR_CODES.PROVIDER_NETWORK_ERROR,
          `Provider ${provider} response body could not be read.`,
          502,
          null,
          { provider, network, status: response.status, retryable: true },
        ),
      };
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (parseError) {
      logProviderEvent('warn', provider, 'Response was not valid JSON', {
        network,
        content_type: contentType,
        body_preview: bodyText.slice(0, 200),
        url,
      });
      return {
        ok: false,
        retryable: false,
        error: createProviderError(
          PROVIDER_ERROR_CODES.BLOCKCHAIN_API_ERROR,
          `Provider ${provider} returned a non-JSON response (content-type: ${contentType || 'unknown'}).`,
          502,
          parseError,
          { provider, network, status: response.status, retryable: false },
        ),
      };
    }

    if (isAuthFailure(response.status, payload)) {
      return {
        ok: false,
        retryable: false,
        error: createProviderError(
          PROVIDER_ERROR_CODES.PROVIDER_AUTH_ERROR,
          `Provider ${provider} rejected the request credentials.`,
          502,
          null,
          { provider, network, status: response.status, retryable: false, details: { upstream_result: String(payload?.result || '').slice(0, 120) } },
        ),
      };
    }

    if (isRateLimited(response.status, payload)) {
      return {
        ok: false,
        retryable: true,
        retryAfter: response.headers.get('retry-after'),
        error: createProviderError(
          PROVIDER_ERROR_CODES.RATE_LIMITED,
          `Provider ${provider} rate limit was reached.`,
          429,
          null,
          { provider, network, status: response.status, retryable: true },
        ),
      };
    }

    return { ok: true, payload, status: response.status };
  } catch (error) {
    if (timedOut) {
      return {
        ok: false,
        retryable: true,
        timedOut: true,
        error: createProviderError(
          PROVIDER_ERROR_CODES.PROVIDER_TIMEOUT,
          `The ${network || 'blockchain'} provider request timed out after ${timeoutMs}ms.`,
          504,
          error,
          { provider, network, retryable: true },
        ),
      };
    }

    if (error?.name === 'AbortError') {
      return {
        ok: false,
        retryable: false,
        error: createProviderError(
          PROVIDER_ERROR_CODES.BLOCKCHAIN_API_ERROR,
          `The ${network || 'blockchain'} provider request was aborted.`,
          502,
          error,
          { provider, network, retryable: false },
        ),
      };
    }

    const causeCode = error?.cause?.code || error?.code || error?.name || '';
    const retryable = RETRYABLE_NETWORK_CODES.has(causeCode) || !NON_RETRYABLE_NETWORK_CODES.has(causeCode);

    logProviderEvent('warn', provider, 'Network failure', {
      network,
      cause_code: causeCode || 'UNKNOWN',
      message: redactText(error?.message || String(error)),
      url,
    });

    return {
      ok: false,
      retryable,
      error: createProviderError(
        PROVIDER_ERROR_CODES.PROVIDER_NETWORK_ERROR,
        `The ${network || 'blockchain'} provider could not be reached (${causeCode || 'network error'}).`,
        502,
        error,
        { provider, network, retryable, details: { cause_code: causeCode || 'UNKNOWN' } },
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableStatusCode(status) {
  return RETRYABLE_STATUS_CODES.has(Number(status));
}

export async function requestProviderJson(url, options = {}) {
  const {
    provider,
    network,
    metrics,
    maxRetries: maxRetriesOption,
    timeoutMs: timeoutOption,
  } = options;

  const timeoutMs = Math.max(1000, Number(timeoutOption) || Number(config.BLOCKCHAIN_PROVIDER_TIMEOUT) || 30000);
  const maxRetries = Math.max(0, Number(maxRetriesOption ?? config.BLOCKCHAIN_PROVIDER_MAX_RETRIES) || 0);
  const counters = metrics || createProviderMetrics();

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    counters.provider_requests += 1;
    if (attempt > 0) counters.provider_retries += 1;

    const result = await performAttempt(url, { provider, network, timeoutMs });
    if (result.ok) return result.payload;

    lastError = result.error;
    if (result.timedOut) counters.provider_timeouts += 1;

    const canRetry = result.retryable && attempt < maxRetries && isRetryableProviderError(result.error);
    if (!canRetry) break;

    const backoffMs = computeBackoffMs(attempt, result.retryAfter);
    logProviderEvent('warn', provider, `Transient failure (${result.error.code}); retry ${attempt + 1}/${maxRetries} in ${backoffMs}ms`, {
      network,
      attempt: attempt + 1,
      max_retries: maxRetries,
      backoff_ms: backoffMs,
      code: result.error.code,
      status: result.error.status ?? null,
      url,
    });

    await sleep(backoffMs);
  }

  counters.provider_failure_count += 1;
  lastError.attempts = maxRetries + 1;
  throw normalizeProviderFailure(lastError, { provider, network });
}
