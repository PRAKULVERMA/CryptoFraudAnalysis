import jwt from 'jsonwebtoken';
import config from '../../config/index.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}
