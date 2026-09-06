import mongoose from 'mongoose';
import config from './index.js';

let connectionPromise = null;

function getConnectionOptions() {
  return {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };
}

export async function getMongooseConnection() {
  if (connectionPromise) {
    return connectionPromise;
  }

  if (!config.MONGODB_URI) {
    return null;
  }

  connectionPromise = mongoose.connect(config.MONGODB_URI, getConnectionOptions()).catch((error) => {
    connectionPromise = null;
    throw error;
  });

  return connectionPromise;
}

export function isMongoDBConfigured() {
  return Boolean(config.MONGODB_URI);
}

export async function getMongoDBStatus() {
  if (!config.MONGODB_URI) {
    return 'disconnected';
  }

  if (!connectionPromise) {
    return 'configured';
  }

  try {
    await connectionPromise;
    return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  } catch {
    return 'disconnected';
  }
}

export default { getMongooseConnection, isMongoDBConfigured, getMongoDBStatus };
