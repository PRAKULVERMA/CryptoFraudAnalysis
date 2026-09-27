export const PROVIDER_ERROR_CODES = {
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_NETWORK_ERROR: 'PROVIDER_NETWORK_ERROR',
  PROVIDER_HTTP_ERROR: 'PROVIDER_HTTP_ERROR',
  PROVIDER_AUTH_ERROR: 'PROVIDER_AUTH_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  BLOCKCHAIN_API_ERROR: 'BLOCKCHAIN_API_ERROR',
};

const KNOWN_CODES = new Set(Object.values(PROVIDER_ERROR_CODES));

export const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export const RETRYABLE_CODES = new Set([
  PROVIDER_ERROR_CODES.PROVIDER_TIMEOUT,
  PROVIDER_ERROR_CODES.PROVIDER_NETWORK_ERROR,
  PROVIDER_ERROR_CODES.PROVIDER_HTTP_ERROR,
  PROVIDER_ERROR_CODES.RATE_LIMITED,
  PROVIDER_ERROR_CODES.PROVIDER_UNAVAILABLE,
]);

export const NON_RETRYABLE_CODES = new Set([
  PROVIDER_ERROR_CODES.INVALID_ADDRESS,
  PROVIDER_ERROR_CODES.PROVIDER_AUTH_ERROR,
  PROVIDER_ERROR_CODES.BLOCKCHAIN_API_ERROR,
]);

export const SENSITIVE_KEYS = [
  'apikey',
  'api_key',
  'api-key',
  'token',
  'secret',
  'password',
  'authorization',
];

export const REDACTED = 'REDACTED';

export function redactValue(value) {
  if (value === null || value === undefined || value === '') return value;
  return REDACTED;
}

export function redactObject(input) {
  if (Array.isArray(input)) return input.map(redactObject);
  if (input && typeof input === 'object') {
    const output = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = SENSITIVE_KEYS.includes(String(key).toLowerCase()) ? redactValue(value) : redactObject(value);
    }
    return output;
  }
  return input;
}

export function redactUrl(url) {
  const raw = typeof url === 'string' ? url : String(url?.toString?.() || url?.href || '');
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    let mutated = false;
    for (const key of SENSITIVE_KEYS) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, REDACTED);
        mutated = true;
      }
    }
    if (parsed.username) {
      parsed.username = REDACTED;
      mutated = true;
    }
    if (parsed.password) {
      parsed.password = REDACTED;
      mutated = true;
    }
    return mutated ? parsed.toString() : raw;
  } catch {
    return raw.replace(
      new RegExp(`(${SENSITIVE_KEYS.join('|')})=[^&\\s]*`, 'gi'),
      `$1=${REDACTED}`,
    );
  }
}

export function redactText(text) {
  return String(text || '').replace(
    new RegExp(`(${SENSITIVE_KEYS.join('|')})\\s*[=:]\\s*[^&\\s,;)"']+`, 'gi'),
    `$1=${REDACTED}`,
  );
}

function isRetryableStatus(status) {
  return RETRYABLE_STATUS_CODES.has(Number(status));
}

export function isRetryableProviderError(error) {
  if (!error || typeof error !== 'object') return false;
  if (error.retryable === true) return true;
  if (NON_RETRYABLE_CODES.has(error.code)) return false;
  if (RETRYABLE_CODES.has(error.code)) return true;
  if (error.status !== undefined && error.status !== null) return isRetryableStatus(error.status);
  return false;
}

export function createProviderError(code, message, statusCode = 503, cause, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.publicMessage = message;
  error.statusCode = statusCode;
  if (cause) error.cause = cause;

  const provider = details.provider ?? null;
  const network = details.network ?? null;
  const upstreamStatus = details.status ?? null;
  const attempts = Number.isFinite(details.attempts) ? details.attempts : null;

  error.provider = provider;
  error.network = network;
  error.status = upstreamStatus;
  error.attempts = attempts;
  error.retryable = details.retryable !== undefined ? Boolean(details.retryable) : isRetryableProviderError({ code, status: upstreamStatus });
  error.details = {
    ...(details.details || {}),
    ...(upstreamStatus !== null ? { status: upstreamStatus } : {}),
    ...(attempts !== null ? { attempts } : {}),
  };

  return error;
}

export function isRateLimited(status, payload) {
  if (Number(status) === 429) return true;
  const text = JSON.stringify(payload || '').toLowerCase();
  return text.includes('rate limit') || text.includes('max rate limit') || text.includes('too many requests');
}

export function isAuthFailure(status, payload) {
  if (Number(status) === 401 || Number(status) === 403) return true;
  const text = JSON.stringify(payload || '').toLowerCase();
  return (
    text.includes('invalid api key') ||
    text.includes('invalid apikey') ||
    text.includes('missing api key') ||
    text.includes('missing/invalid api key') ||
    text.includes('unauthorized') ||
    text.includes('forbidden') ||
    text.includes('api key is disabled')
  );
}

export function describeProviderError(error) {
  if (!error || typeof error !== 'object') {
    return { code: 'PROVIDER_ERROR', provider: null, network: null, retryable: false, message: String(error || 'Unknown provider error.') };
  }

  return redactObject({
    code: error.code || error.name || 'PROVIDER_ERROR',
    provider: error.provider ?? null,
    network: error.network ?? null,
    status: error.status ?? null,
    attempts: error.attempts ?? null,
    retryable: isRetryableProviderError(error),
    message: redactText(error.message || String(error)),
  });
}

export function normalizeProviderFailure(error, details = {}) {
  if (KNOWN_CODES.has(error?.code)) {
    if (details.provider && !error.provider) error.provider = details.provider;
    if (details.network && !error.network) error.network = details.network;
    if (error.retryable === undefined) error.retryable = isRetryableProviderError(error);
    return error;
  }

  return createProviderError(
    PROVIDER_ERROR_CODES.BLOCKCHAIN_API_ERROR,
    'The blockchain provider returned an unexpected error.',
    502,
    error,
    { ...details, retryable: false },
  );
}
