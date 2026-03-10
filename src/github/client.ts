import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { getConfig } from '../config.js';
import logger from '../utils/logger.js';
import {
  GitHubPullRequest,
  GitHubFile,
  ReviewComment,
  ReviewSummary,
  WebhookPullRequestEvent,
} from './types.js';

export class GitHubClient {
  private octokit: Octokit;

  constructor(installationId: number) {
    const config = getConfig();

    this.octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.GITHUB_APP_ID,
        privateKey: config.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        installationId,
      },
    });
  }

  static fromWebhookEvent(event: WebhookPullRequestEvent): GitHubClient {
    const installationId = event.installation?.id || 0;
    if (!installationId) {
      throw new Error('No installation ID provided in webhook event');
    }
    return new GitHubClient(installationId);
  }

  async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubPullRequest> {
    try {
      const response = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      return response.data as GitHubPullRequest;
    } catch (error) {
      logger.error('Failed to fetch PR', { owner, repo, prNumber, error });
      throw error;
    }
  }

  async getPullRequestFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubFile[]> {
    try {
      const files: GitHubFile[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await this.octokit.pulls.listFiles({
          owner,
          repo,
          pull_number: prNumber,
          page,
          per_page: perPage,
        });

        files.push(...(response.data as GitHubFile[]));

        if (response.data.length < perPage) {
          break;
        }
        page++;
      }

      return files;
    } catch (error) {
      logger.error('Failed to fetch PR files', { owner, repo, prNumber, error });
      throw error;
    }
  }

  async getPullRequestDiff(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<string> {
    try {
      const response = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: {
          format: 'diff',
        },
      });
      return response.data as unknown as string;
    } catch (error) {
      logger.error('Failed to fetch PR diff', { owner, repo, prNumber, error });
      throw error;
    }
  }

  async createReviewComment(
    owner: string,
    repo: string,
    prNumber: number,
    comment: ReviewComment
  ): Promise<void> {
    try {
      // GitHub doesn't allow comments on non-existent lines
      if (comment.line < 1) {
        logger.warn('Skipping comment with invalid line number', {
          path: comment.path,
          line: comment.line,
        });
        return;
      }

      await this.octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        body: this.formatCommentBody(comment),
        commit_id: '', // Will be populated by PR context
        path: comment.path,
        line: comment.line,
        side: 'RIGHT',
      });

      logger.debug('Created review comment', {
        path: comment.path,
        line: comment.line,
      });
    } catch (error) {
      logger.warn('Failed to create review comment', {
        path: comment.path,
        error,
      });
      // Don't throw - continue with other comments
    }
  }

  async submitReview(
    owner: string,
    repo: string,
    prNumber: number,
    summary: ReviewSummary
  ): Promise<void> {
    try {
      // First, get the commit SHA for the review
      const pr = await this.getPullRequest(owner, repo, prNumber);

      await this.octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        body: summary.body,
        event: summary.event,
        commit_id: pr.head.sha,
      });

      logger.info('Submitted review', {
        owner,
        repo,
        prNumber,
        event: summary.event,
      });
    } catch (error) {
      logger.error('Failed to submit review', { owner, repo, prNumber, error });
      throw error;
    }
  }

  async postComment(owner: string, repo: string, prNumber: number, body: string): Promise<void> {
    try {
      await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });

      logger.debug('Posted comment', { owner, repo, prNumber });
    } catch (error) {
      logger.error('Failed to post comment', { owner, repo, prNumber, error });
      throw error;
    }
  }

  async getCommits(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<Array<{ sha: string; commit: { message: string } }>> {
    try {
      const commits = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await this.octokit.pulls.listCommits({
          owner,
          repo,
          pull_number: prNumber,
          page,
          per_page: perPage,
        });

        commits.push(...response.data);

        if (response.data.length < perPage) {
          break;
        }
        page++;
      }

      return commits;
    } catch (error) {
      logger.error('Failed to fetch commits', { owner, repo, prNumber, error });
      throw error;
    }
  }

  private formatCommentBody(comment: ReviewComment): string {
    let body = `**[${comment.severity.toUpperCase()}]** ${comment.message}`;

    if (comment.suggestion) {
      body += `\n\n**Suggestion:** ${comment.suggestion}`;
    }

    return body;
  }
}
