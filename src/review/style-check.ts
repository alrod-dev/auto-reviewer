import { ReviewComment } from './types.js';

/**
 * Code style analysis patterns
 */
export class StyleChecker {
  private patterns = [
    {
      name: 'Console Logs',
      regex: /console\.(log|debug|info|warn|error)\s*\(/gi,
      severity: 'minor' as const,
      message: 'Remove console.log from production code - use proper logging',
    },
    {
      name: 'Trailing Whitespace',
      regex: /\s+$/gm,
      severity: 'minor' as const,
      message: 'Remove trailing whitespace',
    },
    {
      name: 'TODO Comments',
      regex: /\/\/\s*TODO|\/\/\s*FIXME/gi,
      severity: 'suggestion' as const,
      message: 'Address TODO/FIXME comment or create a GitHub issue',
    },
    {
      name: 'Multiple Spaces',
      regex: /  {2,}(?!.*:)/gm,
      severity: 'suggestion' as const,
      message: 'Use consistent indentation (2 or 4 spaces)',
    },
    {
      name: 'Long Lines',
      regex: /^.{101,}$/gm,
      severity: 'minor' as const,
      message: 'Line too long (>100 chars) - consider breaking it up',
    },
  ];

  check(code: string, filename: string): ReviewComment[] {
    const comments: ReviewComment[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineNumber) => {
      this.patterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          comments.push({
            path: filename,
            line: lineNumber + 1,
            severity: pattern.severity,
            category: 'style',
            message: pattern.message,
          });
        }
      });
    });

    return comments;
  }
}
