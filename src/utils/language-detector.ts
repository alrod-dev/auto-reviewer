export type ProgrammingLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'cpp'
  | 'csharp'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'shell'
  | 'json'
  | 'yaml'
  | 'sql'
  | 'html'
  | 'css'
  | 'unknown';

const extensionMap: Record<string, ProgrammingLanguage> = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.py': 'python',
  '.pyi': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c++': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sql': 'sql',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.less': 'css',
};

const filenameMap: Record<string, ProgrammingLanguage> = {
  'Dockerfile': 'shell',
  'Makefile': 'shell',
  'Gemfile': 'ruby',
  'Rakefile': 'ruby',
  'Procfile': 'shell',
  '.eslintrc': 'json',
  '.babelrc': 'json',
  'package.json': 'json',
  'tsconfig.json': 'json',
};

export function detectLanguage(filename: string): ProgrammingLanguage {
  // Check exact filename match
  if (filename in filenameMap) {
    return filenameMap[filename];
  }

  // Extract extension
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex > 0) {
    const ext = filename.substring(lastDotIndex);
    if (ext in extensionMap) {
      return extensionMap[ext];
    }
  }

  return 'unknown';
}

export function isReviewableLanguage(language: ProgrammingLanguage): boolean {
  return language !== 'unknown';
}

export function getLanguageDisplayName(language: ProgrammingLanguage): string {
  const names: Record<ProgrammingLanguage, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    go: 'Go',
    rust: 'Rust',
    cpp: 'C++',
    csharp: 'C#',
    php: 'PHP',
    ruby: 'Ruby',
    swift: 'Swift',
    kotlin: 'Kotlin',
    scala: 'Scala',
    shell: 'Shell',
    json: 'JSON',
    yaml: 'YAML',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    unknown: 'Unknown',
  };
  return names[language];
}
