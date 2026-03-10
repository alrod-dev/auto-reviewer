import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // GitHub App Configuration
  GITHUB_APP_ID: z.string().min(1, 'GITHUB_APP_ID is required'),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1, 'GITHUB_APP_PRIVATE_KEY is required'),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, 'GITHUB_WEBHOOK_SECRET is required'),

  // Anthropic Configuration
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),

  // Review Configuration
  MAX_REVIEW_TOKENS: z.string().default('4000').transform(Number),
  ENABLE_SECURITY_SCAN: z.string().default('true').transform(v => v === 'true'),
  ENABLE_PERFORMANCE_SCAN: z.string().default('true').transform(v => v === 'true'),
  ENABLE_STYLE_CHECK: z.string().default('true').transform(v => v === 'true'),
  ENABLE_LOGIC_ANALYSIS: z.string().default('true').transform(v => v === 'true'),

  // Rate Limiting
  RATE_LIMIT_PER_HOUR: z.string().default('100').transform(Number),

  // Database/Analytics
  ENABLE_ANALYTICS: z.string().default('true').transform(v => v === 'true'),
  ANALYTICS_DB_PATH: z.string().default('./data/analytics.json'),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    try {
      cachedConfig = configSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingVars = error.errors
          .filter(e => e.code === 'invalid_type')
          .map(e => e.path.join('.'));

        console.error('Configuration validation failed:');
        console.error('Missing or invalid environment variables:', missingVars);
        process.exit(1);
      }
      throw error;
    }
  }
  return cachedConfig;
}

export function isProduction(): boolean {
  return getConfig().NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return getConfig().NODE_ENV === 'development';
}
