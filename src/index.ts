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

// Root landing page
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Auto Reviewer - AI-Powered Code Review Agent</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { max-width: 720px; padding: 48px; text-align: center; }
        .icon { font-size: 64px; margin-bottom: 24px; }
        h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 12px; background: linear-gradient(135deg, #06b6d4, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { font-size: 1.1rem; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; }
        .features { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; text-align: left; }
        .feature { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
        .feature h3 { font-size: 0.95rem; color: #06b6d4; margin-bottom: 6px; }
        .feature p { font-size: 0.85rem; color: #94a3b8; line-height: 1.5; }
        .tech { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 24px; }
        .tech span { padding: 4px 12px; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.3); border-radius: 20px; font-size: 0.8rem; color: #06b6d4; }
        .status { padding: 12px 24px; background: #1e293b; border-radius: 8px; display: inline-block; }
        .status .dot { display: inline-block; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; margin-right: 8px; }
        .footer { margin-top: 32px; font-size: 0.85rem; color: #64748b; }
        .footer a { color: #06b6d4; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🔍</div>
        <h1>Auto Reviewer</h1>
        <p class="subtitle">AI-Powered Code Review Agent that provides intelligent feedback on pull requests using Claude API, integrated directly with GitHub webhooks.</p>
        <div class="features">
          <div class="feature">
            <h3>Intelligent Analysis</h3>
            <p>Deep code analysis powered by Anthropic Claude for contextual review feedback</p>
          </div>
          <div class="feature">
            <h3>GitHub Integration</h3>
            <p>Seamless webhook integration for automatic PR review on push events</p>
          </div>
          <div class="feature">
            <h3>Security Scanning</h3>
            <p>Detects potential vulnerabilities, secrets exposure, and unsafe patterns</p>
          </div>
          <div class="feature">
            <h3>Analytics Dashboard</h3>
            <p>Track review metrics, response times, and code quality trends</p>
          </div>
        </div>
        <div class="tech">
          <span>Node.js</span>
          <span>TypeScript</span>
          <span>Claude API</span>
          <span>Express</span>
          <span>GitHub Webhooks</span>
        </div>
        <div class="status">
          <span class="dot"></span>Service Running — v1.0.0
        </div>
        <div class="footer">
          Built by <a href="https://github.com/alrod-dev" target="_blank">Alfredo Wiesner</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

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
