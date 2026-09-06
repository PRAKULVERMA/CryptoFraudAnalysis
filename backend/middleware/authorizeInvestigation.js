import config from '../config/index.js';
import investigationService from '../services/investigations/investigationService.js';

function authorizationError() {
  const error = new Error('You are not authorized to access this investigation.');
  error.code = 'INVESTIGATION_FORBIDDEN';
  error.publicMessage = 'You are not authorized to access this investigation.';
  error.statusCode = 404;
  return error;
}

export async function authorizeInvestigation(req, res, next) {
  try {
    const investigation = await investigationService.getInvestigation(req.params.id);
    if (!investigation) {
      const error = new Error('Investigation not found.');
      error.code = 'INVESTIGATION_NOT_FOUND';
      error.publicMessage = 'Investigation not found.';
      error.statusCode = 404;
      return next(error);
    }

    if (config.AUTH_REQUIRED && !req.user) {
      const error = new Error('Authentication required.');
      error.code = 'AUTH_REQUIRED';
      error.publicMessage = 'Authentication required.';
      error.statusCode = 401;
      return next(error);
    }

    if (investigation.user_id && investigation.user_id !== req.user?.id) {
      return next(authorizationError());
    }

    if (!req.user && investigation.user_id) {
      return next(authorizationError());
    }

    req.investigation = investigation;
    return next();
  } catch (error) {
    return next(error);
  }
}

export default authorizeInvestigation;
