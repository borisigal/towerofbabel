/**
 * Prisma Client Singleton
 *
 * This file implements the Prisma singleton pattern to prevent connection pool exhaustion
 * in serverless environments. The singleton ensures only one PrismaClient instance is created
 * per serverless function instance, even during hot-reloads in development.
 *
 * CRITICAL: This pattern is required for Supabase free tier (60 connection limit).
 * Without this, Next.js hot-reload can create 100+ connections and exhaust the pool.
 *
 * Connection Pooling Configuration:
 * - DATABASE_URL includes ?pgbouncer=true&connection_limit=1
 * - Each serverless function instance creates max 1 connection
 * - PgBouncer (port 6543) provides transaction pooling
 *
 * @see architecture/14-critical-risk-mitigation.md#risk-2
 */

import { PrismaClient } from '@prisma/client';

/**
 * Creates a new PrismaClient instance with environment-specific logging configuration.
 *
 * Development: Logs queries, errors, and warnings for debugging
 * Production: Logs only errors and warnings to reduce noise
 *
 * @returns Configured PrismaClient instance
 */
const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
  });
};

/**
 * Global type declaration for Prisma singleton storage.
 * Uses globalThis to preserve instance across hot-reloads in development.
 */
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

/**
 * Prisma Client singleton instance.
 *
 * In development: Reuses existing instance from globalThis to prevent connection leaks during hot-reload
 * In production: Creates new instance (each serverless function gets one client)
 */
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

/**
 * In development, store the Prisma instance globally to prevent
 * creating new instances on every hot-reload.
 *
 * This prevents the "too many connections" error during development.
 */
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Type exports for Prisma models (available after schema is defined and prisma generate is run)
 *
 * Usage:
 * ```typescript
 * import prisma, { User, Interpretation } from '@/lib/db/prisma';
 *
 * const user: User = await prisma.user.findUnique({ where: { id } });
 * ```
 */
export type { User, Interpretation, Subscription, LemonSqueezyEvent } from '@prisma/client';
