import express, { Request, Response } from 'express';
import { Webhooks } from '@octokit/webhooks';
import { getConfig, isDevelopment } from './config.js';
import logger from './utils/logger.js';
import { WebhookHandler } from './webhook/handler.js';
import { verifyWebhookSignature, validateWebhookEvent } from './webhook/verify.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import analyticsRouter from './analytics/dashboard.js';

const app = express();
const config = getConfig();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(rateLimitMiddleware);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', version: '1.0.0' });
});

// Analytics routes
app.use('/api/analytics', analyticsRouter);

// GitHub Webhook endpoint
app.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  const action = req.body.action as string;

  // Log webhook receipt
  logger.debug('Received webhook', {
    event,
    action,
    repository: req.body.repository?.full_name,
  });

  // Verify signature
  const rawBody = JSON.stringify(req.body);
  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Invalid webhook signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // Validate event type
  if (!validateWebhookEvent(event, action)) {
    logger.debug('Skipping unsupported event', { event, action });
    res.status(202).json({ message: 'Event ignored' });
    return;
  }

  try {
    const handler = new WebhookHandler(req.body);
    await handler.handle(req.body);
    res.status(202).json({ message: 'Review initiated' });
  } catch (error) {
    logger.error('Webhook processing error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((error: Error, req: Request, res: Response) => {
  logger.error('Unhandled error', { error, path: req.path });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const port = config.PORT;
app.listen(port, () => {
  logger.info('auto-reviewer started', {
    port,
    environment: config.NODE_ENV,
    model: config.ANTHROPIC_MODEL,
  });

  if (isDevelopment()) {
    logger.debug('Development mode enabled');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
