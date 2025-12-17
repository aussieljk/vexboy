import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { CacheMeta, ConvexFunctionSpec } from '../types/index.js';

export class CacheManager {
  private cacheDir: string;
  private cacheSpecFile: string;
  private cacheMetaFile: string;
  private convexDir: string;
  private noCache: boolean;

  constructor(cacheDir: string, convexDir: string, noCache: boolean = false) {
    this.cacheDir = cacheDir;
    this.cacheSpecFile = path.join(cacheDir, 'function-spec.json');
    this.cacheMetaFile = path.join(cacheDir, 'cache-meta.json');
    this.convexDir = convexDir;
    this.noCache = noCache;
  }

  /**
   * Get the newest file modification time in convex/ directory
   */
  private getNewestConvexFileMtime(): number {
    try {
      const result = execSync(
        `find "${this.convexDir}" -type f -name "*.ts" -exec stat -f "%m" {} \\; | sort -nr | head -1`,
        { encoding: 'utf-8' }
      );
      return parseInt(result.trim(), 10);
    } catch {
      return 0;
    }
  }

  /**
   * Generate a hash of all convex/ .ts files
   */
  private generateConvexHash(): string {
    try {
      // Get all .ts files in convex/, sort them, concatenate their mtimes
      const result = execSync(
        `find "${this.convexDir}" -type f -name "*.ts" | sort | xargs stat -f "%N:%m" 2>/dev/null`,
        { encoding: 'utf-8' }
      );
      return crypto.createHash('md5').update(result).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Check if cache is valid
   */
  isValid(): boolean {
    if (this.noCache) {
      return false;
    }

    if (!fs.existsSync(this.cacheSpecFile) || !fs.existsSync(this.cacheMetaFile)) {
      return false;
    }

    try {
      const meta: CacheMeta = JSON.parse(fs.readFileSync(this.cacheMetaFile, 'utf-8'));

      // First check: compare newest file mtime (fast)
      const currentNewestMtime = this.getNewestConvexFileMtime();
      if (meta.newestFileMtime !== currentNewestMtime) {
        return false;
      }

      // Second check: generate hash and compare (more reliable)
      const currentHash = this.generateConvexHash();
      if (meta.fileHash !== currentHash) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save spec to cache
   */
  save(spec: ConvexFunctionSpec): void {
    try {
      // Ensure cache directory exists
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      // Save spec
      fs.writeFileSync(this.cacheSpecFile, JSON.stringify(spec));

      // Save metadata
      const meta: CacheMeta = {
        timestamp: Date.now(),
        newestFileMtime: this.getNewestConvexFileMtime(),
        fileHash: this.generateConvexHash(),
      };
      fs.writeFileSync(this.cacheMetaFile, JSON.stringify(meta, null, 2));
    } catch (error) {
      // Non-fatal error, just log it
      console.error('Warning: Failed to save cache:', error);
    }
  }

  /**
   * Load cached spec
   */
  load(): ConvexFunctionSpec | null {
    try {
      if (!this.isValid()) {
        return null;
      }

      const spec: ConvexFunctionSpec = JSON.parse(
        fs.readFileSync(this.cacheSpecFile, 'utf-8')
      );
      return spec;
    } catch {
      return null;
    }
  }

  /**
   * Clear cache
   */
  clear(): void {
    try {
      if (fs.existsSync(this.cacheSpecFile)) {
        fs.unlinkSync(this.cacheSpecFile);
      }
      if (fs.existsSync(this.cacheMetaFile)) {
        fs.unlinkSync(this.cacheMetaFile);
      }
    } catch (error) {
      console.error('Warning: Failed to clear cache:', error);
    }
  }
}
