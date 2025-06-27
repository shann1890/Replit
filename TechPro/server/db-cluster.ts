import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Primary database connection (writes)
const primaryConnectionString = process.env.DATABASE_URL_PRIMARY || process.env.DATABASE_URL;
const replicaConnectionString = process.env.DATABASE_URL_REPLICA || process.env.DATABASE_URL;

if (!primaryConnectionString) {
  throw new Error(
    "DATABASE_URL_PRIMARY or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Connection pools
export const primaryPool = new Pool({ 
  connectionString: primaryConnectionString,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const replicaPool = new Pool({ 
  connectionString: replicaConnectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database instances
export const primaryDb = drizzle({ client: primaryPool, schema });
export const replicaDb = drizzle({ client: replicaPool, schema });

// Default export for compatibility
export const db = primaryDb;
export const pool = primaryPool;

// Health check function
export async function checkClusterHealth() {
  const results = {
    primary: { healthy: false, latency: 0, error: null as string | null },
    replica: { healthy: false, latency: 0, error: null as string | null }
  };

  // Test primary connection
  try {
    const start = Date.now();
    await primaryDb.execute('SELECT 1');
    results.primary.healthy = true;
    results.primary.latency = Date.now() - start;
  } catch (error) {
    results.primary.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test replica connection
  try {
    const start = Date.now();
    await replicaDb.execute('SELECT 1');
    results.replica.healthy = true;
    results.replica.latency = Date.now() - start;
  } catch (error) {
    results.replica.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return results;
}

// Connection monitoring
export function logConnectionStats() {
  const primaryStats = {
    totalCount: primaryPool.totalCount,
    idleCount: primaryPool.idleCount,
    waitingCount: primaryPool.waitingCount,
  };

  const replicaStats = {
    totalCount: replicaPool.totalCount,
    idleCount: replicaPool.idleCount,
    waitingCount: replicaPool.waitingCount,
  };

  console.log('Database Connection Stats:', {
    primary: primaryStats,
    replica: replicaStats,
    timestamp: new Date().toISOString()
  });
}

// Graceful shutdown
export async function closeConnections() {
  try {
    await primaryPool.end();
    await replicaPool.end();
    console.log('Database connections closed gracefully');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}

// Process cleanup
process.on('SIGTERM', closeConnections);
process.on('SIGINT', closeConnections);