import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../config.js';
import logger from '../utils/logger.js';
import { ReviewPrompts } from './prompts.js';
import { ReviewParser } from './parser.js';
import {
  CodeReview,
  ReviewContext,
  ReviewPass,
  ReviewSeverity,
} from './types.js';

export class ReviewEngine {
  private anthropic: Anthropic;
  private config = getConfig();

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: this.config.ANTHROPIC_API_KEY,
    });
  }

  async reviewPullRequest(context: ReviewContext): Promise<CodeReview> {
    logger.info('Starting PR review', {
      prNumber: context.prNumber,
      owner: context.owner,
      repo: context.repo,
      fileCount: context.files.length,
    });

    const startTime = Date.now();
    const passes = {
      security: { name: 'Security', enabled: false, comments: [], summary: '', totalIssues: 0 },
      style: { name: 'Style', enabled: false, comments: [], summary: '', totalIssues: 0 },
      logic: { name: 'Logic', enabled: false, comments: [], summary: '', totalIssues: 0 },
      performance: { name: 'Performance', enabled: false, comments: [], summary: '', totalIssues: 0 },
    };

    // Run review passes in parallel for efficiency
    const reviewPromises: Promise<void>[] = [];

    if (this.config.ENABLE_SECURITY_SCAN) {
      reviewPromises.push(
        this.runSecurityReview(context, passes)
      );
    }

    if (this.config.ENABLE_STYLE_CHECK) {
      reviewPromises.push(
        this.runStyleReview(context, passes)
      );
    }

    if (this.config.ENABLE_LOGIC_ANALYSIS) {
      reviewPromises.push(
        this.runLogicReview(context, passes)
      );
    }

    if (this.config.ENABLE_PERFORMANCE_SCAN) {
      reviewPromises.push(
        this.runPerformanceReview(context, passes)
      );
    }

    await Promise.all(reviewPromises);

    const totalIssues =
      passes.security.totalIssues +
      passes.style.totalIssues +
      passes.logic.totalIssues +
      passes.performance.totalIssues;

    const overallSummary = this.generateOverallSummary(passes, context);
    const shouldRequestChanges = this.shouldRequestChanges(passes);

    const review: CodeReview = {
      pullRequestNumber: context.prNumber,
      owner: context.owner,
      repo: context.repo,
      passes,
      overallSummary,
      shouldRequestChanges,
      totalIssues,
      timestamp: new Date(),
    };

    const duration = Date.now() - startTime;
    logger.info('PR review completed', {
      prNumber: context.prNumber,
      totalIssues,
      duration: `${duration}ms`,
      shouldRequestChanges,
    });

    return review;
  }

  private async runSecurityReview(
    context: ReviewContext,
    passes: Record<string, ReviewPass>
  ): Promise<void> {
    try {
      logger.debug('Running security review');
      const prompt = ReviewPrompts.securityReviewPrompt(context);
      const response = await this.queryAI(prompt);
      passes.security = ReviewParser.parseSecurityReview(response);
      passes.security.enabled = true;
    } catch (error) {
      logger.error('Security review failed', { error });
      passes.security.enabled = false;
      passes.security.summary = 'Security review failed';
    }
  }

  private async runStyleReview(
    context: ReviewContext,
    passes: Record<string, ReviewPass>
  ): Promise<void> {
    try {
      logger.debug('Running style review');
      const prompt = ReviewPrompts.styleReviewPrompt(context);
      const response = await this.queryAI(prompt);
      passes.style = ReviewParser.parseStyleReview(response);
      passes.style.enabled = true;
    } catch (error) {
      logger.error('Style review failed', { error });
      passes.style.enabled = false;
      passes.style.summary = 'Style review failed';
    }
  }

  private async runLogicReview(
    context: ReviewContext,
    passes: Record<string, ReviewPass>
  ): Promise<void> {
    try {
      logger.debug('Running logic review');
      const prompt = ReviewPrompts.logicReviewPrompt(context);
      const response = await this.queryAI(prompt);
      passes.logic = ReviewParser.parseLogicReview(response);
      passes.logic.enabled = true;
    } catch (error) {
      logger.error('Logic review failed', { error });
      passes.logic.enabled = false;
      passes.logic.summary = 'Logic review failed';
    }
  }

  private async runPerformanceReview(
    context: ReviewContext,
    passes: Record<string, ReviewPass>
  ): Promise<void> {
    try {
      logger.debug('Running performance review');
      const prompt = ReviewPrompts.performanceReviewPrompt(context);
      const response = await this.queryAI(prompt);
      passes.performance = ReviewParser.parsePerformanceReview(response);
      passes.performance.enabled = true;
    } catch (error) {
      logger.error('Performance review failed', { error });
      passes.performance.enabled = false;
      passes.performance.summary = 'Performance review failed';
    }
  }

  private async queryAI(prompt: string): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: this.config.ANTHROPIC_MODEL,
      max_tokens: this.config.MAX_REVIEW_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    throw new Error('Unexpected response type from Claude');
  }

  private generateOverallSummary(
    passes: Record<string, ReviewPass>,
    context: ReviewContext
  ): string {
    const critical = this.countBySeverity(passes, 'critical');
    const major = this.countBySeverity(passes, 'major');

    let summary = `## Code Review Summary\n\n`;
    summary += `**PR:** #${context.prNumber} - ${context.title}\n\n`;

    if (critical === 0 && major === 0) {
      summary += `✅ No critical or major issues found!\n\n`;
    } else {
      if (critical > 0) {
        summary += `⚠️ **${critical} critical issue(s)** need attention\n`;
      }
      if (major > 0) {
        summary += `⚠️ **${major} major issue(s)** need attention\n`;
      }
      summary += '\n';
    }

    summary += `### Review Breakdown\n`;
    summary += this.formatPassSummary(passes);

    return summary;
  }

  private formatPassSummary(passes: Record<string, ReviewPass>): string {
    let summary = '';

    for (const [key, pass] of Object.entries(passes)) {
      if (pass.enabled && pass.totalIssues > 0) {
        summary += `- **${pass.name}:** ${pass.summary}\n`;
      }
    }

    if (summary === '') {
      summary = 'No issues found across all review passes.\n';
    }

    return summary;
  }

  private countBySeverity(passes: Record<string, ReviewPass>, severity: ReviewSeverity): number {
    let count = 0;
    for (const pass of Object.values(passes)) {
      count += pass.comments.filter(c => c.severity === severity).length;
    }
    return count;
  }

  private shouldRequestChanges(passes: Record<string, ReviewPass>): boolean {
    // Request changes if there are critical or major issues
    const critical = this.countBySeverity(passes, 'critical');
    const major = this.countBySeverity(passes, 'major');
    return critical > 0 || major > 0;
  }
}
