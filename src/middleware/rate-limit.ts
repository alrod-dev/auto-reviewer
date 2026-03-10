import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config.js';
import logger from '../utils/logger.js';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const config = getConfig();
  const limit = config.RATE_LIMIT_PER_HOUR;
  const hour = 60 * 60 * 1000;

  // Use repository as key for rate limiting
  const repoKey = req.body?.repository?.full_name || req.ip || 'unknown';
  const now = Date.now();

  if (!store[repoKey]) {
    store[repoKey] = {
      count: 0,
      resetTime: now + hour,
    };
  }

  const entry = store[repoKey];

  // Reset counter if hour has passed
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + hour;
  }

  entry.count++;

  // Check if limit exceeded
  if (entry.count > limit) {
    logger.warn('Rate limit exceeded', {
      repoKey,
      count: entry.count,
      limit,
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      limit,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
    return;
  }

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

  next();
}

export function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of Object.entries(store)) {
    if (now > entry.resetTime + 24 * 60 * 60 * 1000) {
      // Clean up entries older than 24 hours
      delete store[key];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Cleaned up rate limit entries', { count: cleaned });
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredEntries, 60 * 60 * 1000);
