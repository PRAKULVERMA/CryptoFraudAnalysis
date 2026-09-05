import dotenv from 'dotenv';

dotenv.config();

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const toNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const cfg = {
  PORT: toNumber(process.env.PORT, 4000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DEMO_MODE: toBoolean(process.env.DEMO_MODE, true),
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret-change-me',
  MONGODB_URI: process.env.MONGODB_URI || '',
  NEO4J_URI: process.env.NEO4J_URI || '',
  NEO4J_USERNAME: process.env.NEO4J_USERNAME || '',
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || '',
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || '',
  BLOCKCHAIN_API_KEY: process.env.BLOCKCHAIN_API_KEY || '',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map((s) => s.trim()).filter(Boolean),
  MAX_HOPS: toNumber(process.env.MAX_HOPS, 6),
  MAX_WALLETS: toNumber(process.env.MAX_WALLETS, 50),
  MAX_TRANSACTIONS: toNumber(process.env.MAX_TRANSACTIONS, 500),
  AUTH_REQUIRED: toBoolean(process.env.AUTH_REQUIRED, false),
};

const requiredLiveVars = [];

if (!cfg.DEMO_MODE) {
  if (!cfg.ETHEREUM_RPC_URL) requiredLiveVars.push('ETHEREUM_RPC_URL');
  if (!cfg.BLOCKCHAIN_API_KEY) requiredLiveVars.push('BLOCKCHAIN_API_KEY');
}

if (requiredLiveVars.length > 0) {
  console.warn(`Live mode requires: ${requiredLiveVars.join(', ')}`);
}

export function getConfig() {
  return { ...cfg };
}

export default cfg;
