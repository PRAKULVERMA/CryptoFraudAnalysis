# CHAINTRACE AI — Authentication & Security

## 1. JWT Authentication

### Configuration
- Controlled by `AUTH_REQUIRED` environment variable (default: `false`)
- When `AUTH_REQUIRED=true`, all protected routes require a valid Bearer token
- When `AUTH_REQUIRED=false`, requests proceed without authentication

### Token Structure
- Algorithm: HMAC (default, from `jsonwebtoken`)
- Secret: `JWT_SECRET` environment variable
- Expiry: 24 hours
- Payload: `{ sub: user.id, email: user.email }`

### Endpoints
- `POST /api/auth/register` — creates user, returns token
- `POST /api/auth/login` — authenticates user, returns token
- `GET /api/auth/me` — validates token, returns user payload

### Middleware
**File:** `backend/middleware/authenticate.js`

```javascript
export function authenticate(req, res, next) {
  const authorization = req.headers.authorization || '';
  const hasBearerToken = authorization.startsWith('Bearer ');
  const token = hasBearerToken ? authorization.slice(7).trim() : null;

  if (!token) {
    if (config.AUTH_REQUIRED) {
      return next(authError('AUTH_REQUIRED', 'Authentication required.'));
    }
    return next(); // allow unauthenticated access
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return next(authError('INVALID_TOKEN', 'Invalid authentication token.'));
    }
    req.user = { id: decoded.sub, email: decoded.email };
    return next();
  } catch (error) {
    const code = error?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return next(authError(code, ...));
  }
}
```

## 2. Investigation Ownership

**File:** `backend/middleware/authorizeInvestigation.js`

```javascript
export async function authorizeInvestigation(req, res, next) {
  const investigation = await investigationService.getInvestigation(req.params.id);
  
  if (config.AUTH_REQUIRED && !req.user) {
    return next(authError('AUTH_REQUIRED', ...));
  }

  if (investigation.user_id && investigation.user_id !== req.user?.id) {
    return next(authorizationError()); // 404 to avoid leaking existence
  }

  if (!req.user && investigation.user_id) {
    return next(authorizationError());
  }

  req.investigation = investigation;
  return next();
}
```

### Ownership Rules
- When `AUTH_REQUIRED=true` and user is authenticated:
  - Users can only access investigations where `user_id === req.user.id`
  - Unauthenticated requests are rejected
- When `AUTH_REQUIRED=false`:
  - Ownership checks are bypassed
  - Any user can access any investigation

### Protected Routes
- `GET /api/investigations` — lists current user's investigations
- `GET /api/investigations/:id` — requires ownership
- `GET /api/investigations/:id/report` — requires ownership
- `DELETE /api/investigations/:id` — requires ownership
- `POST /api/investigations/:id/retry` — requires ownership
- `POST /api/investigate/wallet` — requires authentication (when enabled) but not ownership (creates new investigation)

## 3. Input Validation

### Wallet Addresses
**File:** `backend/services/blockchain/validator.js`

- Bitcoin: Bech32 (`bc1`, `tb1`, `bcrt1`) + legacy/P2SH (`1`, `3`, `m`, `n`)
- Ethereum: `ethers.isAddress()` (validates checksum)
- Rejects empty, null, or non-string inputs

### Network
- Must be `bitcoin` or `ethereum` (case-insensitive)
- Rejected by `ProviderManager` and `validateAttributionInput` if unsupported

### Investigation IDs
- Generated server-side via `uuidv4()`
- Never accepted from client input for creation
- Used as path parameters for lookup/update/delete

### Request Body Limits
- Express JSON limit: `1mb`
- No file uploads
- No query string injection vectors

## 4. CORS

**File:** `backend/server.js`

```javascript
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isVercelOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
    if (config.CORS_ORIGINS.includes(origin) || config.CORS_ORIGINS.includes('*') || isVercelOrigin) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'));
  },
  credentials: true,
}));
```

### Default Origins
- `http://localhost:3000`
- `http://localhost:3001`

### Special Cases
- No origin (server-to-server, curl) is allowed
- Vercel app domains (`*.vercel.app`) are allowed

## 5. Rate Limiting

- 120 requests per minute per IP
- Standard headers enabled, legacy headers disabled
- Returns `429 Too Many Requests` with `RATE_LIMITED` code

## 6. Security Headers

- `helmet` enabled with `contentSecurityPolicy: false` (to allow inline styles in dev)
- `X-Powered-By` disabled
- Additional headers from helmet: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, etc.

## 7. Error Handling

**File:** `backend/middleware/errorHandler.js`

```javascript
export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.publicMessage || err.message || 'An unexpected error occurred.';
  
  const payload = { error: true, code, message, request_id: req.requestId };
  
  if (config.NODE_ENV !== 'production') {
    payload.details = err.stack || undefined;
  }
  
  res.status(status).json(payload);
}
```

### Note
- Stack traces are included in non-production environments
- This exposes internal file paths and line numbers during development

## 8. Request Tracking

- Each request receives a unique `request_id` via `requestIdMiddleware`
- Returned in all JSON responses and error payloads
- Useful for correlating logs with client reports
