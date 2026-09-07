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

const defaultDevelopmentSecret = 'development-secret-change-me';

const cfg = {
  PORT: toNumber(process.env.PORT, 4000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DEMO_MODE: toBoolean(process.env.DEMO_MODE, true),
  JWT_SECRET: process.env.JWT_SECRET || defaultDevelopmentSecret,
  MONGODB_URI: process.env.MONGODB_URI || '',
  NEO4J_URI: process.env.NEO4J_URI || '',
  NEO4J_USERNAME: process.env.NEO4J_USERNAME || '',
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || '',
  NEO4J_DATABASE: process.env.NEO4J_DATABASE || 'neo4j',
  NEO4J_ENABLED: toBoolean(process.env.NEO4J_ENABLED, false),
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || '',
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY || '',
  ETHERSCAN_API_URL: process.env.ETHERSCAN_API_URL || 'https://api.etherscan.io/v2/api',
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || '',
  BITCOIN_API_URL: process.env.BITCOIN_API_URL || 'https://blockstream.info/api',
  BLOCKCHAIN_API_KEY: process.env.BLOCKCHAIN_API_KEY || '',
  BLOCKCHAIN_PROVIDER_TIMEOUT: toNumber(process.env.BLOCKCHAIN_PROVIDER_TIMEOUT, 10000),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map((s) => s.trim()).filter(Boolean),
  MAX_HOPS: toNumber(process.env.MAX_HOPS, 6),
  MAX_WALLETS: toNumber(process.env.MAX_WALLETS, 50),
  MAX_TRANSACTIONS: toNumber(process.env.MAX_TRANSACTIONS, 500),
  MAX_WALLETS_PER_INVESTIGATION: toNumber(process.env.MAX_WALLETS_PER_INVESTIGATION, 50),
  MAX_TRANSACTIONS_PER_WALLET: toNumber(process.env.MAX_TRANSACTIONS_PER_WALLET, 100),
  MAX_TOTAL_TRANSACTIONS: toNumber(process.env.MAX_TOTAL_TRANSACTIONS, 500),
  AUTH_REQUIRED: toBoolean(process.env.AUTH_REQUIRED, false),
  SANCTIONS_ENABLED: toBoolean(process.env.SANCTIONS_ENABLED, false),
  SANCTIONS_PROVIDER: process.env.SANCTIONS_PROVIDER || 'none',
  SANCTIONS_API_URL: process.env.SANCTIONS_API_URL || '',
  SANCTIONS_API_KEY: process.env.SANCTIONS_API_KEY || '',
  INVESTIGATION_MAX_RETRIES: toNumber(process.env.INVESTIGATION_MAX_RETRIES, 3),
  INVESTIGATION_STALE_TIMEOUT_MS: toNumber(process.env.INVESTIGATION_STALE_TIMEOUT_MS, 900000),
};

if (cfg.NODE_ENV === 'production' && (!process.env.JWT_SECRET || cfg.JWT_SECRET === defaultDevelopmentSecret || cfg.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be configured with a strong value in production.');
}

const requiredLiveVars = [];

if (!cfg.DEMO_MODE) {
  if (!cfg.ETHERSCAN_API_KEY || cfg.ETHERSCAN_API_KEY === 'your_key_here') requiredLiveVars.push('ETHERSCAN_API_KEY');
}

if (requiredLiveVars.length > 0) {
  console.warn(`Live mode requires: ${requiredLiveVars.join(', ')}`);
}

export function getConfig() {
  return { ...cfg };
}

export default cfg;
