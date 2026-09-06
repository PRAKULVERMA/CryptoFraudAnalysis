import neo4j from 'neo4j-driver';
import config from './index.js';

let driver = null;
let connectionStatus = 'disconnected';

function buildDriver() {
  if (!config.NEO4J_ENABLED) {
    return null;
  }

  if (!config.NEO4J_URI || !config.NEO4J_USERNAME || config.NEO4J_PASSWORD === undefined || config.NEO4J_PASSWORD === null || config.NEO4J_PASSWORD === '') {
    console.warn('[Neo4j] Configuration incomplete. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD.');
    return null;
  }

  try {
    driver = neo4j.driver(
      config.NEO4J_URI,
      neo4j.auth.basic(config.NEO4J_USERNAME, config.NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 10,
        connectionTimeout: 5000,
        maxTransactionRetryTime: 5000,
      }
    );

    return driver;
  } catch (error) {
    console.error('[Neo4j] Failed to create driver:', error.message);
    driver = null;
    return null;
  }
}

export async function getNeo4jDriver() {
  if (!config.NEO4J_ENABLED) {
    return null;
  }

  if (driver) {
    try {
      await driver.verifyConnectivity();
      connectionStatus = 'connected';
      return driver;
    } catch {
      connectionStatus = 'disconnected';
    }
  }

  const newDriver = buildDriver();
  if (!newDriver) {
    connectionStatus = 'disconnected';
    return null;
  }

  try {
    await newDriver.verifyConnectivity();
    connectionStatus = 'connected';
    return newDriver;
  } catch (error) {
    console.error('[Neo4j] Connection verification failed:', error.message);
    connectionStatus = 'disconnected';
    driver = null;
    return null;
  }
}

export function isNeo4jEnabled() {
  return Boolean(config.NEO4J_ENABLED && config.NEO4J_URI && config.NEO4J_USERNAME && config.NEO4J_PASSWORD !== '');
}

export function getNeo4jStatus() {
  if (!config.NEO4J_ENABLED) {
    return 'disabled';
  }
  return connectionStatus;
}

export async function closeNeo4jDriver() {
  if (driver) {
    try {
      await driver.close();
    } catch {
      // ignore close errors
    } finally {
      driver = null;
      connectionStatus = 'disconnected';
    }
  }
}

export default { getNeo4jDriver, isNeo4jEnabled, getNeo4jStatus, closeNeo4jDriver };
