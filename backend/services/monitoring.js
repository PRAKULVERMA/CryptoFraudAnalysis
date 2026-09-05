import config from '../config/index.js';

export async function getMonitoring() {
  const now = new Date().toISOString();

  return {
    status: 'ONLINE',
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
    uptime: 'system started',
    mongodb: config.MONGODB_URI ? 'CONFIGURED' : 'UNAVAILABLE',
    neo4j: config.NEO4J_URI ? 'CONFIGURED' : 'UNAVAILABLE',
    blockchain_provider: config.DEMO_MODE ? 'DEMO_PROVIDER' : 'LIVE_PROVIDER',
    timestamp: now,
    synthetic: config.DEMO_MODE,
  };
}
