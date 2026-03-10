export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  private: boolean;
  description: string | null;
  language: string | null;
  url: string;
  html_url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: GitHubUser;
  head: GitHubRef;
  base: GitHubRef;
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  diff_url: string;
  patch_url: string;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GitHubRef {
  label: string;
  ref: string;
  sha: string;
  user: GitHubUser;
  repo: GitHubRepository | null;
}

export interface GitHubFile {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
  patch?: string;
  blob_url: string;
}

export interface GitHubCommit {
  sha: string;
  url: string;
  html_url: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  message: string;
}

export interface ReviewComment {
  path: string;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
  body: string;
}

export interface ReviewSummary {
  body: string;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
}

export interface WebhookPullRequestEvent {
  action: 'opened' | 'synchronize' | 'edited' | 'reopened';
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
  installation?: {
    id: number;
  };
}

export interface AppInstallation {
  id: number;
  account: {
    login: string;
    type: string;
  };
}
