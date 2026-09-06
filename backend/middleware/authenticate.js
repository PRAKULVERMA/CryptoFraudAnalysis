import config from '../config/index.js';
import { verifyToken } from '../services/auth/authService.js';

function authError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.publicMessage = message;
  error.statusCode = 401;
  return error;
}

export function authenticate(req, res, next) {
  const authorization = req.headers.authorization || '';
  const hasBearerToken = authorization.startsWith('Bearer ');
  const token = hasBearerToken ? authorization.slice(7).trim() : null;

  if (!token) {
    if (config.AUTH_REQUIRED) {
      return next(authError('AUTH_REQUIRED', 'Authentication required.'));
    }
    return next();
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return next(authError('INVALID_TOKEN', 'Invalid authentication token.'));
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
    };
    return next();
  } catch (error) {
    const code = error?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return next(authError(code, code === 'TOKEN_EXPIRED' ? 'Authentication token expired.' : 'Invalid authentication token.'));
  }
}

export default authenticate;
