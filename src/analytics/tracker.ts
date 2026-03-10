import fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config.js';
import logger from '../utils/logger.js';
import { CodeReview } from '../review/types.js';

export interface ReviewStats {
  totalReviews: number;
  averageIssuesPerReview: number;
  criticalIssuesTotal: number;
  majorIssuesTotal: number;
  minorIssuesTotal: number;
  suggestionsTotal: number;
  changesRequestedPercentage: number;
  mostCommonIssueType: string;
  averageReviewDuration: number;
}

export interface ReviewRecord {
  timestamp: Date;
  prNumber: number;
  owner: string;
  repo: string;
  totalIssues: number;
  shouldRequestChanges: boolean;
  securityIssues: number;
  styleIssues: number;
  logicIssues: number;
  performanceIssues: number;
}

export class AnalyticsTracker {
  private dbPath: string;
  private reviews: ReviewRecord[] = [];

  constructor() {
    const config = getConfig();
    this.dbPath = config.ANALYTICS_DB_PATH;
    this.ensureDbDirectory();
  }

  private ensureDbDirectory(): void {
    const dir = path.dirname(this.dbPath);
    fs.mkdir(dir, { recursive: true }).catch(error => {
      logger.error('Failed to create analytics directory', { dir, error });
    });
  }

  async loadData(): Promise<void> {
    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      this.reviews = JSON.parse(data);
      logger.debug('Loaded analytics data', { count: this.reviews.length });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.debug('Analytics file does not exist yet');
        this.reviews = [];
      } else {
        logger.error('Failed to load analytics data', { error });
      }
    }
  }

  async saveData(): Promise<void> {
    try {
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.dbPath, JSON.stringify(this.reviews, null, 2));
      logger.debug('Saved analytics data', { count: this.reviews.length });
    } catch (error) {
      logger.error('Failed to save analytics data', { error });
    }
  }

  async trackReview(review: CodeReview): Promise<void> {
    if (!getConfig().ENABLE_ANALYTICS) {
      return;
    }

    const record: ReviewRecord = {
      timestamp: review.timestamp,
      prNumber: review.pullRequestNumber,
      owner: review.owner,
      repo: review.repo,
      totalIssues: review.totalIssues,
      shouldRequestChanges: review.shouldRequestChanges,
      securityIssues: review.passes.security.totalIssues,
      styleIssues: review.passes.style.totalIssues,
      logicIssues: review.passes.logic.totalIssues,
      performanceIssues: review.passes.performance.totalIssues,
    };

    await this.loadData();
    this.reviews.push(record);
    await this.saveData();

    logger.debug('Tracked review', {
      pr: `${record.owner}/${record.repo}#${record.prNumber}`,
      issues: record.totalIssues,
    });
  }

  async getStats(): Promise<ReviewStats> {
    await this.loadData();

    if (this.reviews.length === 0) {
      return {
        totalReviews: 0,
        averageIssuesPerReview: 0,
        criticalIssuesTotal: 0,
        majorIssuesTotal: 0,
        minorIssuesTotal: 0,
        suggestionsTotal: 0,
        changesRequestedPercentage: 0,
        mostCommonIssueType: 'N/A',
        averageReviewDuration: 0,
      };
    }

    const totalIssues = this.reviews.reduce((sum, r) => sum + r.totalIssues, 0);
    const changesRequested = this.reviews.filter(r => r.shouldRequestChanges).length;

    const issueCounts = {
      security: this.reviews.reduce((sum, r) => sum + r.securityIssues, 0),
      style: this.reviews.reduce((sum, r) => sum + r.styleIssues, 0),
      logic: this.reviews.reduce((sum, r) => sum + r.logicIssues, 0),
      performance: this.reviews.reduce((sum, r) => sum + r.performanceIssues, 0),
    };

    const mostCommonIssueType = Object.entries(issueCounts).reduce((max, [type, count]) =>
      count > max.count ? { type, count } : max,
      { type: 'N/A', count: 0 }
    ).type;

    return {
      totalReviews: this.reviews.length,
      averageIssuesPerReview: Math.round((totalIssues / this.reviews.length) * 100) / 100,
      criticalIssuesTotal: 0, // Would need to store severity in records
      majorIssuesTotal: 0,
      minorIssuesTotal: 0,
      suggestionsTotal: 0,
      changesRequestedPercentage: Math.round((changesRequested / this.reviews.length) * 100),
      mostCommonIssueType,
      averageReviewDuration: 0,
    };
  }

  async getRecentReviews(count: number = 10): Promise<ReviewRecord[]> {
    await this.loadData();
    return this.reviews.slice(-count).reverse();
  }

  async getRepositoryStats(owner: string, repo: string): Promise<ReviewStats> {
    await this.loadData();
    const filtered = this.reviews.filter(r => r.owner === owner && r.repo === repo);

    if (filtered.length === 0) {
      return {
        totalReviews: 0,
        averageIssuesPerReview: 0,
        criticalIssuesTotal: 0,
        majorIssuesTotal: 0,
        minorIssuesTotal: 0,
        suggestionsTotal: 0,
        changesRequestedPercentage: 0,
        mostCommonIssueType: 'N/A',
        averageReviewDuration: 0,
      };
    }

    const totalIssues = filtered.reduce((sum, r) => sum + r.totalIssues, 0);
    const changesRequested = filtered.filter(r => r.shouldRequestChanges).length;

    return {
      totalReviews: filtered.length,
      averageIssuesPerReview: Math.round((totalIssues / filtered.length) * 100) / 100,
      criticalIssuesTotal: 0,
      majorIssuesTotal: 0,
      minorIssuesTotal: 0,
      suggestionsTotal: 0,
      changesRequestedPercentage: Math.round((changesRequested / filtered.length) * 100),
      mostCommonIssueType: 'N/A',
      averageReviewDuration: 0,
    };
  }
}
