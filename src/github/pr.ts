import { GitHubClient } from './client.js';
import { ReviewComment, ReviewSummary } from '../review/types.js';
import logger from '../utils/logger.js';

/**
 * High-level PR operations built on top of GitHubClient
 */
export class PROperations {
  constructor(private githubClient: GitHubClient) {}

  async getDiffContent(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<string> {
    try {
      return await this.githubClient.getPullRequestDiff(owner, repo, prNumber);
    } catch (error) {
      logger.error('Failed to get PR diff', { owner, repo, prNumber, error });
      throw error;
    }
  }

  async getFilePatches(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<Array<{ filename: string; patch: string }>> {
    try {
      const files = await this.githubClient.getPullRequestFiles(owner, repo, prNumber);
      return files
        .filter(f => f.patch) // Only files with patches
        .map(f => ({
          filename: f.filename,
          patch: f.patch!,
        }));
    } catch (error) {
      logger.error('Failed to get file patches', { owner, repo, prNumber, error });
      throw error;
    }
  }

  async postReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    comments: ReviewComment[]
  ): Promise<void> {
    const validComments = comments.filter(c => c.line > 0);

    if (validComments.length === 0) {
      logger.debug('No valid comments to post');
      return;
    }

    // Post comments sequentially to avoid rate limiting
    for (const comment of validComments) {
      try {
        await this.githubClient.createReviewComment(owner, repo, prNumber, comment);
      } catch (error) {
        logger.warn('Failed to post comment', {
          file: comment.path,
          line: comment.line,
          error,
        });
        // Continue posting other comments
      }
    }

    logger.info('Posted review comments', {
      owner,
      repo,
      prNumber,
      count: validComments.length,
    });
  }

  async submitPullRequestReview(
    owner: string,
    repo: string,
    prNumber: number,
    summary: ReviewSummary
  ): Promise<void> {
    try {
      await this.githubClient.submitReview(owner, repo, prNumber, summary);
    } catch (error) {
      logger.error('Failed to submit review', { owner, repo, prNumber, error });
      throw error;
    }
  }

  async postGeneralComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<void> {
    try {
      await this.githubClient.postComment(owner, repo, prNumber, body);
    } catch (error) {
      logger.error('Failed to post comment', { owner, repo, prNumber, error });
      throw error;
    }
  }
}
