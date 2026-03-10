import { ReviewComment } from './types.js';

/**
 * Logic and correctness analysis patterns
 */
export class LogicAnalyzer {
  private patterns = [
    {
      name: 'Missing Null Check',
      regex: /\.\w+\s*(?:\(|\.)/gm, // Accessing properties without checks
      severity: 'major' as const,
      message: 'Potential null pointer - ensure null/undefined checks before property access',
    },
    {
      name: 'Unreachable Code',
      regex: /return\s*;[\s\S]*?(?=\n\s*(function|class|const|let|var|}))/gm,
      severity: 'major' as const,
      message: 'Code after return statement is unreachable',
    },
    {
      name: 'Empty Catch Block',
      regex: /catch\s*\([^)]*\)\s*\{\s*\}/gi,
      severity: 'major' as const,
      message: 'Empty catch block - handle errors properly or at least log them',
    },
    {
      name: 'Async Without Await',
      regex: /async\s+function|\basync\s*\(/gi,
      severity: 'suggestion' as const,
      message: 'Async function detected - ensure all promises are properly awaited',
    },
    {
      name: 'Variable Shadowing',
      regex: /\b(let|const|var)\s+\w+\s*=/gi,
      severity: 'minor' as const,
      message: 'Check for variable name shadowing of outer scope variables',
    },
    {
      name: 'Infinite Loop Risk',
      regex: /while\s*\(\s*true\s*\)|for\s*\([^;]*;[^;]*;[^)]*\)/gi,
      severity: 'major' as const,
      message: 'Infinite loop risk - ensure loop has proper termination condition',
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
            category: 'logic',
            message: pattern.message,
          });
        }
      });
    });

    return comments;
  }
}
