export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.publicMessage || err.message || 'An unexpected error occurred.';

  const payload = {
    error: true,
    code,
    message,
    request_id: req.requestId,
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.details = err.stack || undefined;
  }

  res.status(status).json(payload);
}
