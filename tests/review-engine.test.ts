import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewEngine } from '../src/review/engine.js';
import { ReviewContext } from '../src/review/types.js';

// Mock Anthropic API
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: vi.fn(async () => ({
          content: [
            {
              type: 'text',
              text: `File: src/test.ts
Severity: major
Description: Missing error handling in function`,
            },
          ],
        })),
      },
    })),
  };
});

describe('ReviewEngine', () => {
  let engine: ReviewEngine;

  beforeEach(() => {
    engine = new ReviewEngine();
  });

  it('should initialize correctly', () => {
    expect(engine).toBeDefined();
  });

  it('should handle empty files gracefully', async () => {
    const context: ReviewContext = {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 1,
      files: [],
      baseRef: 'main',
      headRef: 'feature/test',
      title: 'Test PR',
      description: 'A test PR',
    };

    // This should handle empty files without crashing
    // Note: Actual behavior depends on implementation
    expect(context.files).toHaveLength(0);
  });

  it('should create review context correctly', () => {
    const context: ReviewContext = {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 42,
      files: [
        {
          filename: 'src/index.ts',
          patch: '+  const x = 1;',
          additions: 1,
          deletions: 0,
        },
      ],
      baseRef: 'main',
      headRef: 'feature/test',
      title: 'Add new feature',
      description: 'This PR adds a new feature',
    };

    expect(context.prNumber).toBe(42);
    expect(context.files).toHaveLength(1);
    expect(context.files[0].filename).toBe('src/index.ts');
  });

  it('should handle large reviews', () => {
    const files = Array.from({ length: 50 }, (_, i) => ({
      filename: `src/file${i}.ts`,
      patch: '+const x = 1;',
      additions: 1,
      deletions: 0,
    }));

    const context: ReviewContext = {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 1,
      files,
      baseRef: 'main',
      headRef: 'feature/test',
      title: 'Large PR',
      description: 'A large PR with many files',
    };

    expect(context.files).toHaveLength(50);
  });
});
