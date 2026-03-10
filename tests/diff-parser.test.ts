import { describe, it, expect } from 'vitest';
import { DiffParser } from '../src/utils/diff-parser.js';

describe('DiffParser', () => {
  it('should parse a simple diff', () => {
    const diff = `diff --git a/file.ts b/file.ts
index 1234567..abcdefg 100644
--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,6 @@
 function hello() {
-  console.log('world');
+  console.log('world!');
+  console.log('new line');
 }`;

    const files = DiffParser.parse(diff);

    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('file.ts');
    expect(files[0].status).toBe('modified');
    expect(files[0].additions).toBe(2);
    expect(files[0].deletions).toBe(1);
  });

  it('should parse added file', () => {
    const diff = `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,3 @@
+export function test() {
+  return true;
+}`;

    const files = DiffParser.parse(diff);

    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('new-file.ts');
    expect(files[0].status).toBe('added');
    expect(files[0].additions).toBe(3);
    expect(files[0].deletions).toBe(0);
  });

  it('should parse deleted file', () => {
    const diff = `diff --git a/old-file.ts b/old-file.ts
deleted file mode 100644
index 1234567..0000000
--- a/old-file.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function test() {
-  return true;
-}`;

    const files = DiffParser.parse(diff);

    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('old-file.ts');
    expect(files[0].status).toBe('deleted');
    expect(files[0].additions).toBe(0);
    expect(files[0].deletions).toBe(3);
  });

  it('should extract added lines', () => {
    const diff = `diff --git a/file.ts b/file.ts
index 1234567..abcdefg 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 function hello() {
+  const x = 1;
   return x;
 }`;

    const files = DiffParser.parse(diff);
    const addedLines = DiffParser.getAddedLines(files[0]);

    expect(addedLines).toContain('  const x = 1;');
  });

  it('should handle multiple hunks', () => {
    const diff = `diff --git a/file.ts b/file.ts
index 1234567..abcdefg 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 function hello() {
+  const x = 1;
   return x;
 }
@@ -10,3 +11,4 @@
 function world() {
+  const y = 2;
   return y;
 }`;

    const files = DiffParser.parse(diff);

    expect(files[0].hunks).toHaveLength(2);
    expect(files[0].additions).toBe(2);
  });

  it('should handle renamed files', () => {
    const diff = `diff --git a/old-name.ts b/new-name.ts
similarity index 100%
rename from old-name.ts
rename to new-name.ts`;

    const files = DiffParser.parse(diff);

    expect(files[0].filename).toBe('new-name.ts');
    expect(files[0].oldFilename).toBe('old-name.ts');
    expect(files[0].status).toBe('renamed');
  });
});
