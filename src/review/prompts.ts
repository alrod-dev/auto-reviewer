import { ReviewContext } from './types.js';

export class ReviewPrompts {
  static securityReviewPrompt(context: ReviewContext): string {
    return `You are a security-focused code reviewer. Analyze the following pull request for security vulnerabilities and best practices.

Pull Request: #${context.prNumber} - ${context.title}
Repository: ${context.owner}/${context.repo}
Base: ${context.baseRef} -> Head: ${context.headRef}

Description: ${context.description || 'No description provided'}

Please review the following code changes for ONLY security-related issues:
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication/authorization issues
- Secrets or credentials in code
- Insecure cryptography
- Buffer overflows or unsafe memory access
- Command injection risks
- CSRF vulnerabilities
- Insecure deserialization
- Dependency vulnerabilities

${this.formatFilesForPrompt(context.files)}

For each issue found, provide:
1. File and line number (if applicable)
2. Severity: critical, major, minor, or suggestion
3. Clear description of the security issue
4. Suggested fix (if applicable)

Format your response as a structured list with clear categories.`;
  }

  static styleReviewPrompt(context: ReviewContext): string {
    return `You are a code style and best practices reviewer. Analyze the following pull request for style and consistency issues.

Pull Request: #${context.prNumber} - ${context.title}
Repository: ${context.owner}/${context.repo}

Please review the following code changes for style and best practices issues:
- Naming conventions (variables, functions, classes)
- Code formatting and indentation
- Comment quality and clarity
- Function/method size and complexity
- Code duplication
- Import organization
- Error handling patterns
- Logging practices
- Documentation quality

${this.formatFilesForPrompt(context.files)}

For each issue found, provide:
1. File and line number
2. Severity: critical, major, minor, or suggestion
3. Description of the style issue
4. Suggested improvement

Format your response as a structured list.`;
  }

  static logicReviewPrompt(context: ReviewContext): string {
    return `You are a code logic reviewer. Analyze the following pull request for logic bugs and edge cases.

Pull Request: #${context.prNumber} - ${context.title}
Repository: ${context.owner}/${context.repo}

Please review the following code changes for logic issues:
- Off-by-one errors
- Null/undefined checks
- Race conditions
- Logic errors in conditionals
- Unhandled edge cases
- State management issues
- Resource leaks
- Infinite loops or recursion
- Type mismatches
- Unreachable code

${this.formatFilesForPrompt(context.files)}

For each issue found, provide:
1. File and line number
2. Severity: critical, major, minor, or suggestion
3. Description of the logic issue
4. How it could manifest as a bug
5. Suggested fix

Format your response as a structured list.`;
  }

  static performanceReviewPrompt(context: ReviewContext): string {
    return `You are a performance-focused code reviewer. Analyze the following pull request for performance issues.

Pull Request: #${context.prNumber} - ${context.title}
Repository: ${context.owner}/${context.repo}

Please review the following code changes for performance issues:
- Inefficient algorithms (O(n²) or worse)
- Unnecessary database queries (N+1 problems)
- Memory leaks
- Blocking operations
- Unnecessary computations in loops
- Inefficient string operations
- Missing caching opportunities
- Inefficient data structures
- Network request optimization
- Bundle size impacts

${this.formatFilesForPrompt(context.files)}

For each issue found, provide:
1. File and line number
2. Severity: critical, major, minor, or suggestion
3. Description of the performance issue
4. Impact assessment
5. Optimization suggestion

Format your response as a structured list.`;
  }

  static summaryPrompt(
    securitySummary: string,
    styleSummary: string,
    logicSummary: string,
    performanceSummary: string,
    totalIssues: number
  ): string {
    return `Based on the following code review results, provide a brief professional summary for the PR author:

Security Issues: ${securitySummary}
Style Issues: ${styleSummary}
Logic Issues: ${logicSummary}
Performance Issues: ${performanceSummary}

Total Issues Found: ${totalIssues}

Provide:
1. A 1-2 sentence overall assessment
2. The most important items to address (max 3)
3. Positive feedback if applicable
4. Whether the PR should request changes (based on severity)

Keep it professional and constructive.`;
  }

  private static formatFilesForPrompt(
    files: ReviewContext['files']
  ): string {
    return files
      .map(
        file => `File: ${file.filename}
Changes: +${file.additions}/-${file.deletions}
\`\`\`
${file.patch}
\`\`\``
      )
      .join('\n\n');
  }
}
