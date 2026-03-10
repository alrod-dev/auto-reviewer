import { ReviewComment, ReviewPass, ReviewSeverity, ReviewCategory } from './types.js';
import logger from '../utils/logger.js';

export class ReviewParser {
  static parseSecurityReview(content: string): ReviewPass {
    return this.parseReviewPass(content, 'security', 'Security Review');
  }

  static parseStyleReview(content: string): ReviewPass {
    return this.parseReviewPass(content, 'style', 'Style Review');
  }

  static parseLogicReview(content: string): ReviewPass {
    return this.parseReviewPass(content, 'logic', 'Logic Review');
  }

  static parsePerformanceReview(content: string): ReviewPass {
    return this.parseReviewPass(content, 'performance', 'Performance Review');
  }

  private static parseReviewPass(
    content: string,
    category: ReviewCategory,
    name: string
  ): ReviewPass {
    const comments: ReviewComment[] = [];

    // Split content into potential issues
    const lines = content.split('\n');
    let currentComment: Partial<ReviewComment> | null = null;

    for (const line of lines) {
      // Check for file:line pattern
      const fileLineMatch = line.match(/^(?:File|Path):\s*([^\s]+)(?:\s*(?:line|:)\s*(\d+))?/i);
      if (fileLineMatch) {
        if (currentComment && currentComment.path && currentComment.message) {
          comments.push(this.buildComment(currentComment, category));
        }
        currentComment = {
          path: fileLineMatch[1],
          line: fileLineMatch[2] ? parseInt(fileLineMatch[2], 10) : 1,
        };
        continue;
      }

      if (!currentComment) {
        continue;
      }

      // Check for severity
      const severityMatch = line.match(/^(?:Severity|Level):\s*(critical|major|minor|suggestion)/i);
      if (severityMatch) {
        currentComment.severity = severityMatch[1].toLowerCase() as ReviewSeverity;
        continue;
      }

      // Check for description/message
      const descMatch = line.match(/^(?:Description|Issue):\s*(.+)/i);
      if (descMatch) {
        currentComment.message = descMatch[1];
        continue;
      }

      // Check for suggestion
      const suggMatch = line.match(/^(?:Suggestion|Fix):\s*(.+)/i);
      if (suggMatch) {
        currentComment.suggestion = suggMatch[1];
        continue;
      }

      // If line contains content and we have a path, add to message
      if (line.trim() && currentComment.path && !currentComment.message) {
        currentComment.message = (currentComment.message || '') + line.trim() + ' ';
      }
    }

    // Add last comment if exists
    if (currentComment && currentComment.path && currentComment.message) {
      comments.push(this.buildComment(currentComment, category));
    }

    // If no comments parsed, try simpler regex approach
    if (comments.length === 0) {
      const issuePattern = /^[-•*]\s*(.+?)(?:\n|$)/gm;
      let match;

      while ((match = issuePattern.exec(content)) !== null) {
        const issueText = match[1];

        // Try to extract file and line
        const fileMatch = issueText.match(/([a-zA-Z0-9._/-]+\.\w+):?(\d+)?/);
        if (fileMatch) {
          comments.push({
            path: fileMatch[1],
            line: fileMatch[2] ? parseInt(fileMatch[2], 10) : 1,
            severity: this.extractSeverity(issueText),
            category,
            message: issueText.replace(fileMatch[0], '').trim() || issueText,
          });
        }
      }
    }

    // Generate summary
    const summary = this.generateSummary(comments, name);

    return {
      name,
      enabled: true,
      comments,
      summary,
      totalIssues: comments.length,
    };
  }

  private static buildComment(
    partial: Partial<ReviewComment>,
    category: ReviewCategory
  ): ReviewComment {
    return {
      path: partial.path || 'unknown',
      line: partial.line || 1,
      severity: partial.severity || 'suggestion',
      category,
      message: (partial.message || '').trim(),
      suggestion: partial.suggestion,
    };
  }

  private static extractSeverity(text: string): ReviewSeverity {
    const lower = text.toLowerCase();
    if (lower.includes('critical') || lower.includes('security')) {
      return 'critical';
    }
    if (lower.includes('major') || lower.includes('important')) {
      return 'major';
    }
    if (lower.includes('minor')) {
      return 'minor';
    }
    return 'suggestion';
  }

  private static generateSummary(comments: ReviewComment[], reviewType: string): string {
    if (comments.length === 0) {
      return `No ${reviewType.toLowerCase()} issues found.`;
    }

    const critical = comments.filter(c => c.severity === 'critical').length;
    const major = comments.filter(c => c.severity === 'major').length;
    const minor = comments.filter(c => c.severity === 'minor').length;
    const suggestions = comments.filter(c => c.severity === 'suggestion').length;

    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical} critical`);
    if (major > 0) parts.push(`${major} major`);
    if (minor > 0) parts.push(`${minor} minor`);
    if (suggestions > 0) parts.push(`${suggestions} suggestion(s)`);

    return `Found ${parts.join(', ')}`;
  }
}
