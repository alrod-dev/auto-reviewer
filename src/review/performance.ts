import { ReviewComment } from './types.js';

/**
 * Performance analysis patterns
 */
export class PerformanceAnalyzer {
  private patterns = [
    {
      name: 'N+1 Query Pattern',
      regex: /for\s*\(|forEach|map\s*\([\s\S]*?\{[\s\S]*?query|execute|fetch/gi,
      severity: 'major' as const,
      message: 'Potential N+1 query problem - batch database calls outside loops',
    },
    {
      name: 'Inefficient String Concatenation',
      regex: /\+\s*['"]|concat\s*\(/gi,
      severity: 'minor' as const,
      message: 'Use template literals or array.join() for string concatenation',
    },
    {
      name: 'Large Loop Without Break',
      regex: /for\s*\([^)]*\d+[^)]*\)|while\s*\(\s*true/gi,
      severity: 'suggestion' as const,
      message: 'Large loop detected - ensure it has early termination conditions',
    },
    {
      name: 'Missing Index on Query',
      regex: /SELECT.*WHERE|\.find\s*\(|\.filter\s*\(/gi,
      severity: 'minor' as const,
      message: 'Ensure database columns used in WHERE clauses are indexed',
    },
    {
      name: 'Deep Object Cloning',
      regex: /JSON\.parse.*JSON\.stringify|_.cloneDeep/gi,
      severity: 'minor' as const,
      message: 'Deep cloning is expensive - use shallow copy or spread operator when possible',
    },
    {
      name: 'Synchronous I/O',
      regex: /Sync\s*\(|readFileSync|writeFileSync|requireSync/gi,
      severity: 'major' as const,
      message: 'Synchronous I/O blocks the event loop - use async/await instead',
    },
    {
      name: 'Missing Memoization',
      regex: /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return/gi,
      severity: 'suggestion' as const,
      message: 'Expensive function detected - consider memoization if called multiple times',
    },
  ];

  analyze(code: string, filename: string): ReviewComment[] {
    const comments: ReviewComment[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineNumber) => {
      this.patterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          comments.push({
            path: filename,
            line: lineNumber + 1,
            severity: pattern.severity,
            category: 'performance',
            message: pattern.message,
          });
        }
      });
    });

    return comments;
  }
}
