export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'no-newline';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileDiff {
  filename: string;
  oldFilename?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  rawDiff: string;
}

export class DiffParser {
  static parse(rawDiff: string): FileDiff[] {
    const files: FileDiff[] = [];
    const lines = rawDiff.split('\n');
    let currentFile: FileDiff | null = null;
    let currentHunk: DiffHunk | null = null;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Parse file header
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          files.push(currentFile);
        }

        const match = line.match(/a\/(.*?)\s+b\/(.*?)$/);
        if (match) {
          currentFile = {
            filename: match[2],
            oldFilename: match[1],
            status: 'modified',
            hunks: [],
            additions: 0,
            deletions: 0,
            rawDiff: '',
          };
          currentHunk = null;
        }
        i++;
        continue;
      }

      // Parse file mode/status
      if (currentFile && line.startsWith('new file mode')) {
        currentFile.status = 'added';
        i++;
        continue;
      }

      if (currentFile && line.startsWith('deleted file mode')) {
        currentFile.status = 'deleted';
        i++;
        continue;
      }

      if (currentFile && line.startsWith('rename from')) {
        currentFile.status = 'renamed';
        currentFile.oldFilename = line.replace('rename from ', '');
        i++;
        continue;
      }

      // Parse hunk header
      if (currentFile && line.startsWith('@@')) {
        const hunkMatch = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (hunkMatch) {
          currentHunk = {
            oldStart: parseInt(hunkMatch[1], 10),
            oldLines: hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1,
            newStart: parseInt(hunkMatch[3], 10),
            newLines: hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1,
            lines: [],
          };
          currentFile.hunks.push(currentHunk);
        }
        i++;
        continue;
      }

      // Parse diff lines
      if (currentFile && currentHunk && (line[0] === '+' || line[0] === '-' || line[0] === ' ')) {
        const diffLine = this.parseDiffLine(line);
        if (diffLine) {
          currentHunk.lines.push(diffLine);
          if (diffLine.type === 'add') {
            currentFile.additions++;
          } else if (diffLine.type === 'remove') {
            currentFile.deletions++;
          }
        }
        i++;
        continue;
      }

      i++;
    }

    if (currentFile) {
      files.push(currentFile);
    }

    return files;
  }

  private static parseDiffLine(line: string): DiffLine | null {
    if (line === '\\ No newline at end of file') {
      return {
        type: 'no-newline',
        content: line,
      };
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      return {
        type: 'add',
        content: line.substring(1),
      };
    }

    if (line.startsWith('-') && !line.startsWith('---')) {
      return {
        type: 'remove',
        content: line.substring(1),
      };
    }

    if (line.startsWith(' ')) {
      return {
        type: 'context',
        content: line.substring(1),
      };
    }

    return null;
  }

  static getAddedLines(diff: FileDiff): string[] {
    const lines: string[] = [];
    diff.hunks.forEach(hunk => {
      hunk.lines.forEach(line => {
        if (line.type === 'add') {
          lines.push(line.content);
        }
      });
    });
    return lines;
  }

  static getContextAroundAddition(diff: FileDiff, additionIndex: number): string[] {
    const context: string[] = [];
    let currentIndex = 0;

    diff.hunks.forEach(hunk => {
      hunk.lines.forEach(line => {
        if (line.type === 'add') {
          if (currentIndex === additionIndex) {
            return;
          }
          currentIndex++;
        }
        context.push(line.content);
      });
    });

    return context;
  }
}
