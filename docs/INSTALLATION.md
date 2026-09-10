# CHAINTRACE AI — Installation & Setup Guide

## Prerequisites

- **Node.js**: Version 18+ recommended (React 19 and Vite 6 require modern Node)
- **npm**: Comes with Node.js
- **Git**: For cloning the repository
- **MongoDB** (optional): For investigation persistence
- **Neo4j** (optional): For graph storage and advanced analytics

## Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd chaintrace-ai---blockchain-intelligence
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 4. Configure Environment
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your settings. Minimum required for demo mode:
```env
PORT=4000
DEMO_MODE=true
```

For live Ethereum mode, add:
```env
DEMO_MODE=false
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

For authentication:
```env
AUTH_REQUIRED=true
JWT_SECRET=your_long_random_secret_at_least_32_characters
```

For MongoDB persistence:
```env
MONGODB_URI=mongodb://localhost:27017/chaintrace
```

For Neo4j:
```env
NEO4J_ENABLED=true
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=your-username
NEO4J_PASSWORD=your-password
```

### 5. Start Backend
```bash
cd backend
npm start
```

Expected output:
```
ChainTrace AI backend running on http://localhost:4000
Demo mode: enabled
Investigation recovery check complete.
```

### 6. Start Frontend (new terminal)
```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 7. Open Application
Navigate to `http://localhost:3000` in your browser.

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 4000 | Backend server port |
| `NODE_ENV` | No | development | Environment mode |
| `DEMO_MODE` | No | true | Use synthetic/demo data |
| `AUTH_REQUIRED` | No | false | Enable JWT authentication |
| `JWT_SECRET` | If auth enabled | development-secret-change-me | JWT signing secret |
| `ETHERSCAN_API_KEY` | For Ethereum live | (empty) | Etherscan API key |
| `BITCOIN_API_URL` | No | https://blockstream.info/api | Bitcoin API base URL |
| `BLOCKCHAIN_PROVIDER_TIMEOUT` | No | 10000 | Provider request timeout (ms) |
| `MAX_HOPS` | No | 6 | Maximum trace depth |
| `MAX_WALLETS_PER_INVESTIGATION` | No | 50 | Max unique wallets per investigation |
| `MAX_TRANSACTIONS_PER_WALLET` | No | 100 | Max transactions per wallet fetch |
| `MAX_TOTAL_TRANSACTIONS` | No | 500 | Total transaction cap |
| `INVESTIGATION_MAX_RETRIES` | No | 3 | Max retry attempts |
| `INVESTIGATION_STALE_TIMEOUT_MS` | No | 900000 | Stale job threshold (15 min) |
| `MONGODB_URI` | No | (empty) | MongoDB connection string |
| `NEO4J_ENABLED` | No | false | Enable Neo4j |
| `NEO4J_URI` | If Neo4j enabled | (empty) | Neo4j connection URI |
| `NEO4J_USERNAME` | If Neo4j enabled | (empty) | Neo4j username |
| `NEO4J_PASSWORD` | If Neo4j enabled | (empty) | Neo4j password |
| `SANCTIONS_ENABLED` | No | false | Enable sanctions screening |
| `SANCTIONS_PROVIDER` | No | none | Provider type (`http`) |
| `SANCTIONS_API_URL` | If sanctions enabled | (empty) | Sanctions API URL |
| `SANCTIONS_API_KEY` | If sanctions enabled | (empty) | Sanctions API key |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | https://cryptofraudanalysis.onrender.com | Backend API target for Vite proxy |

## Development Commands

### Backend
```bash
npm start        # Start server with Node
npm run dev      # Start with tsx watch (if configured)
```

### Frontend
```bash
npm run dev      # Start Vite dev server (port 3000)
npm run build    # Production build to dist/
npm run preview  # Preview production build
npm run lint     # TypeScript type check (tsc --noEmit)
npm run clean    # Remove dist/ and server.js
```

## Production Deployment Notes

1. Set `NODE_ENV=production`
2. Configure a strong `JWT_SECRET` (32+ characters)
3. Set `AUTH_REQUIRED=true`
4. Set `DEMO_MODE=false`
5. Provide `ETHERSCAN_API_KEY` for Ethereum live mode
6. Configure `MONGODB_URI` for persistent investigation storage
7. Configure `NEO4J_ENABLED=true` for graph persistence and analytics
8. Use a process manager (PM2, systemd) for backend
9. Build frontend with `npm run build` and serve with a static file server or CDN
10. Ensure CORS origins are configured for your production domain

## Troubleshooting

### Backend won't start
- Check if port 4000 is already in use
- Verify `backend/.env` exists and is readable
- Run `npm install` in backend directory

### Frontend shows "Network Error"
- Verify backend is running on port 4000
- Check Vite proxy configuration in `vite.config.ts`
- Check browser console for CORS errors

### Investigations always return demo data
- Verify `DEMO_MODE=false` in `backend/.env`
- Ensure `ETHERSCAN_API_KEY` is set for Ethereum
- Restart backend after changing `.env`

### Neo4j queries fail
- Verify `NEO4J_ENABLED=true`
- Check `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
- Ensure Neo4j instance is reachable
- Check backend logs for connection errors

### MongoDB connection fails
- Verify `MONGODB_URI` is correctly formatted
- Ensure MongoDB instance is running
- Check firewall/network access
