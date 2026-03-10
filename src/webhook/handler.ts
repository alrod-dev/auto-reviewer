import { WebhookPullRequestEvent } from '../github/types.js';
import { GitHubClient } from '../github/client.js';
import { ReviewEngine } from '../review/engine.js';
import { AnalyticsTracker } from '../analytics/tracker.js';
import { DiffParser } from '../utils/diff-parser.js';
import { detectLanguage, isReviewableLanguage } from '../utils/language-detector.js';
import { ReviewContext } from '../review/types.js';
import logger from '../utils/logger.js';

export class WebhookHandler {
  private githubClient: GitHubClient;
  private reviewEngine: ReviewEngine;
  private analyticsTracker: AnalyticsTracker;

  constructor(webhookEvent: WebhookPullRequestEvent) {
    this.githubClient = GitHubClient.fromWebhookEvent(webhookEvent);
    this.reviewEngine = new ReviewEngine();
    this.analyticsTracker = new AnalyticsTracker();
  }

  async handle(event: WebhookPullRequestEvent): Promise<void> {
    const { pull_request, repository } = event;
    const prNumber = pull_request.number;
    const owner = repository.owner.login;
    const repo = repository.name;

    logger.info('Processing webhook event', {
      action: event.action,
      pr: `${owner}/${repo}#${prNumber}`,
      title: pull_request.title,
    });

    try {
      // Validate PR size
      if (pull_request.changed_files > 50) {
        logger.info('PR too large for review', {
          pr: `${owner}/${repo}#${prNumber}`,
          files: pull_request.changed_files,
        });
        await this.githubClient.postComment(
          owner,
          repo,
          prNumber,
          '⚠️ This pull request has too many file changes (>50 files) for automated review.'
        );
        return;
      }

      // Fetch PR files
      const files = await this.githubClient.getPullRequestFiles(owner, repo, prNumber);

      // Filter for reviewable files
      const reviewableFiles = files.filter(file => {
        const language = detectLanguage(file.filename);
        return isReviewableLanguage(language);
      });

      if (reviewableFiles.length === 0) {
        logger.info('No reviewable files in PR', {
          pr: `${owner}/${repo}#${prNumber}`,
        });
        return;
      }

      logger.debug('Found reviewable files', {
        total: files.length,
        reviewable: reviewableFiles.length,
      });

      // Get diff for each file
      const fileDiffs = await Promise.all(
        reviewableFiles.map(async file => {
          try {
            const pr = await this.githubClient.getPullRequest(owner, repo, prNumber);
            // For simplicity, use patch if available
            const patch = file.patch || '';
            return {
              filename: file.filename,
              patch,
              additions: file.additions,
              deletions: file.deletions,
            };
          } catch (error) {
            logger.warn('Failed to get diff for file', {
              file: file.filename,
              error,
            });
            return null;
          }
        })
      );

      const validDiffs = fileDiffs.filter(d => d !== null) as ReviewContext['files'];

      if (validDiffs.length === 0) {
        logger.warn('No valid diffs obtained', {
          pr: `${owner}/${repo}#${prNumber}`,
        });
        return;
      }

      // Create review context
      const reviewContext: ReviewContext = {
        owner,
        repo,
        prNumber,
        files: validDiffs,
        baseRef: pull_request.base.ref,
        headRef: pull_request.head.ref,
        title: pull_request.title,
        description: pull_request.body || '',
      };

      // Run review
      const review = await this.reviewEngine.reviewPullRequest(reviewContext);

      // Track analytics
      await this.analyticsTracker.trackReview(review);

      // Format and post review summary
      const reviewSummary = this.formatReviewSummary(review);
      await this.githubClient.postComment(owner, repo, prNumber, reviewSummary);

      // Post detailed comments for critical/major issues
      const criticalComments = review.passes.security.comments
        .filter(c => c.severity === 'critical' || c.severity === 'major')
        .slice(0, 5); // Limit to 5 comments

      for (const comment of criticalComments) {
        try {
          await this.githubClient.createReviewComment(owner, repo, prNumber, comment);
        } catch (error) {
          logger.warn('Failed to post review comment', {
            file: comment.path,
            error,
          });
        }
      }

      logger.info('Webhook processing completed', {
        pr: `${owner}/${repo}#${prNumber}`,
        issues: review.totalIssues,
        requestChanges: review.shouldRequestChanges,
      });
    } catch (error) {
      logger.error('Failed to process webhook event', {
        pr: `${owner}/${repo}#${prNumber}`,
        error,
      });

      try {
        await this.githubClient.postComment(
          owner,
          repo,
          prNumber,
          '❌ An error occurred during the automated code review. Please try again later.'
        );
      } catch (commentError) {
        logger.error('Failed to post error comment', { error: commentError });
      }
    }
  }

  private formatReviewSummary(review: Record<string, any>): string {
    let summary = `## 🔍 Automated Code Review\n\n`;

    if (review.totalIssues === 0) {
      summary += `✅ **Great job!** No issues detected in this pull request.\n`;
      return summary;
    }

    const critical = this.countSeverity(review.passes, 'critical');
    const major = this.countSeverity(review.passes, 'major');
    const minor = this.countSeverity(review.passes, 'minor');
    const suggestions = this.countSeverity(review.passes, 'suggestion');

    summary += `**Issues Found:** \n`;
    if (critical > 0) summary += `- ⛔ **${critical}** critical\n`;
    if (major > 0) summary += `- 🔴 **${major}** major\n`;
    if (minor > 0) summary += `- 🟡 **${minor}** minor\n`;
    if (suggestions > 0) summary += `- 💡 **${suggestions}** suggestion(s)\n`;

    summary += `\n### Review Breakdown\n`;

    for (const [key, pass] of Object.entries(review.passes)) {
      if (pass.enabled && pass.totalIssues > 0) {
        summary += `- **${pass.name}:** ${pass.summary}\n`;
      }
    }

    if (review.shouldRequestChanges) {
      summary += `\n**Status:** 🚫 Changes requested (critical/major issues found)\n`;
    } else {
      summary += `\n**Status:** ✅ Approved (no critical/major issues)\n`;
    }

    summary += `\n---\n*Review generated by [auto-reviewer](https://github.com/alrod-dev/auto-reviewer)*`;

    return summary;
  }

  private countSeverity(passes: Record<string, any>, severity: string): number {
    let count = 0;
    for (const pass of Object.values(passes)) {
      if (pass.comments) {
        count += pass.comments.filter((c: any) => c.severity === severity).length;
      }
    }
    return count;
  }
}
