export function createProviderError(code, message, statusCode = 503, cause) {
  const error = new Error(message);
  error.code = code;
  error.publicMessage = message;
  error.statusCode = statusCode;
  if (cause) error.cause = cause;
  return error;
}

export function isRateLimited(status, payload) {
  const text = JSON.stringify(payload || '').toLowerCase();
  return status === 429 || text.includes('rate limit') || text.includes('max rate limit') || text.includes('too many requests');
}

export function normalizeProviderFailure(error) {
  const knownCodes = new Set([
    'INVALID_ADDRESS',
    'PROVIDER_UNAVAILABLE',
    'PROVIDER_TIMEOUT',
    'RATE_LIMITED',
    'BLOCKCHAIN_API_ERROR',
  ]);

  if (knownCodes.has(error?.code)) return error;
  return createProviderError(
    'BLOCKCHAIN_API_ERROR',
    'The blockchain provider returned an unexpected error.',
    502,
    error,
  );
}
