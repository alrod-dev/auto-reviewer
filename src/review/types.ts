export type ReviewSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

export interface ReviewComment {
  path: string;
  line: number;
  severity: ReviewSeverity;
  category: ReviewCategory;
  message: string;
  suggestion?: string;
}

export type ReviewCategory =
  | 'security'
  | 'performance'
  | 'style'
  | 'logic'
  | 'documentation'
  | 'testing'
  | 'architecture';

export interface ReviewPass {
  name: string;
  enabled: boolean;
  comments: ReviewComment[];
  summary: string;
  totalIssues: number;
}

export interface CodeReview {
  pullRequestNumber: number;
  owner: string;
  repo: string;
  passes: {
    security: ReviewPass;
    style: ReviewPass;
    logic: ReviewPass;
    performance: ReviewPass;
  };
  overallSummary: string;
  shouldRequestChanges: boolean;
  totalIssues: number;
  timestamp: Date;
}

export interface ReviewGuidelines {
  includeLineNumbers: boolean;
  maxCommentsPerFile: number;
  focusOnNewCode: boolean;
  severityThreshold: ReviewSeverity;
}

export interface ReviewContext {
  owner: string;
  repo: string;
  prNumber: number;
  files: Array<{
    filename: string;
    patch: string;
    additions: number;
    deletions: number;
  }>;
  baseRef: string;
  headRef: string;
  title: string;
  description: string;
}
