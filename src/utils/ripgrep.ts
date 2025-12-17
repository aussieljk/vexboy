import { execSync } from 'child_process';
import type { RipgrepMatch } from '../types/index.js';

/**
 * Find usages of a pattern using ripgrep
 */
export function findUsage(
  pattern: string,
  directories: string[],
  filePattern: string = '*'
): { file: string; line: number; matchedText: string }[] {
  const usages: { file: string; line: number; matchedText: string }[] = [];

  for (const dir of directories) {
    try {
      const result = execSync(
        `rg --json -g "${filePattern}" "${pattern}" "${dir}" 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );

      const lines = result.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const match: RipgrepMatch = JSON.parse(line);

          if (match.type === 'match') {
            usages.push({
              file: match.data.path.text,
              line: match.data.line_number,
              matchedText: match.data.lines.text.trim(),
            });
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    } catch (error) {
      // Continue if ripgrep fails for this directory
    }
  }

  return usages;
}

/**
 * Check if ripgrep is installed
 */
export function checkRipgrepInstalled(): boolean {
  try {
    execSync('which rg', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Deduplicate usages by file:line
 */
export function deduplicateUsages(
  usages: { file: string; line: number; matchedText: string }[]
): { file: string; line: number; matchedText: string }[] {
  const seen = new Set<string>();
  return usages.filter(usage => {
    const key = `${usage.file}:${usage.line}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
