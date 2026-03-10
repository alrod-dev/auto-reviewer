import { Router, Request, Response } from 'express';
import { AnalyticsTracker } from './tracker.js';
import logger from '../utils/logger.js';

const router = Router();
const tracker = new AnalyticsTracker();

router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await tracker.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats', { error });
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

router.get('/recent', async (req: Request, res: Response) => {
  try {
    const count = Math.min(parseInt(req.query.count as string) || 10, 100);
    const reviews = await tracker.getRecentReviews(count);
    res.json(reviews);
  } catch (error) {
    logger.error('Failed to get recent reviews', { error });
    res.status(500).json({ error: 'Failed to retrieve recent reviews' });
  }
});

router.get('/repository/:owner/:repo', async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const stats = await tracker.getRepositoryStats(owner, repo);
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get repository stats', { error });
    res.status(500).json({ error: 'Failed to retrieve repository statistics' });
  }
});

export default router;
