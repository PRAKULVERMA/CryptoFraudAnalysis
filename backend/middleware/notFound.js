export function notFoundHandler(req, res) {
  res.status(404).json({
    error: true,
    code: 'NOT_FOUND',
    message: `Route not found: ${req.originalUrl}`,
    request_id: req.requestId,
  });
}
