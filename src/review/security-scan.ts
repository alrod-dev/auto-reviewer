import { ReviewComment, ReviewCategory } from './types.js';

/**
 * Security-focused code analysis patterns
 * These patterns help identify potential security issues before AI review
 */
export class SecurityScanner {
  private patterns = [
    {
      name: 'SQL Injection Risk',
      regex: /\b(query|exec|execute|sql)\s*\(\s*['"`][^'"`]*\$\{|['"`]\s*\+/gi,
      severity: 'critical' as const,
      message: 'Potential SQL injection - use parameterized queries',
    },
    {
      name: 'XSS Risk',
      regex: /innerHTML\s*=|dangerouslySetInnerHTML|eval\s*\(/gi,
      severity: 'critical' as const,
      message: 'Potential XSS vulnerability - use textContent or sanitize HTML',
    },
    {
      name: 'Hardcoded Credentials',
      regex: /password\s*=\s*['"][^'"]*['"]|api[_-]?key\s*=\s*['"][^'"]*['"]|secret\s*=\s*['"][^'"]*['"]/gi,
      severity: 'critical' as const,
      message: 'Potential hardcoded credentials - use environment variables',
    },
    {
      name: 'Missing CSRF Protection',
      regex: /\.post\(|\.put\(|\.delete\(|\.patch\(/gi,
      severity: 'major' as const,
      message: 'HTTP method usage detected - ensure CSRF tokens are validated',
    },
    {
      name: 'Weak Cryptography',
      regex: /md5|sha1|base64\s*encode/gi,
      severity: 'major' as const,
      message: 'Weak cryptographic algorithm - use SHA-256 or stronger',
    },
  ];

  scan(code: string, filename: string): ReviewComment[] {
    const comments: ReviewComment[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineNumber) => {
      this.patterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          comments.push({
            path: filename,
            line: lineNumber + 1,
            severity: pattern.severity,
            category: 'security',
            message: pattern.message,
          });
        }
      });
    });

    return comments;
  }
}
