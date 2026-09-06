import { Router } from 'express';
import { randomUUID } from 'crypto';
import { signToken } from '../services/auth/authService.js';
import { hashPassword, verifyPassword } from '../services/auth/passwordService.js';
import { UserRepository } from '../services/auth/userRepository.js';

const router = Router();
const userRepository = new UserRepository();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: true, code: 'INVALID_REQUEST', message: 'email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: true, code: 'USER_EXISTS', message: 'User already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const user = {
      id: randomUUID(),
      email: normalizedEmail,
      name: name || 'User',
      passwordHash,
    };

    await userRepository.createUser(user);
    const token = signToken(user);
    return res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: true, code: 'INVALID_REQUEST', message: 'email and password are required.' });
    }

    const user = await userRepository.findByEmail(String(email).trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: true, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: true, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' });
    }

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  try {
    const { verifyToken } = await import('../services/auth/authService.js');
    const decoded = verifyToken(token);
    return res.json({ user: decoded });
  } catch (error) {
    return res.status(401).json({ error: true, code: 'INVALID_TOKEN', message: 'Invalid or expired token.' });
  }
});

export default router;
