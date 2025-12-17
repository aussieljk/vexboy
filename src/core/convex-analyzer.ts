import * as path from 'path';
import type {
  ConvexFunction,
  AnalysisResults,
  UsedFunction,
  FunctionUsage,
} from '../types/index.js';
import { FunctionSpecFetcher } from './function-spec.js';
import { CacheManager } from './cache-manager.js';
import { Logger } from '../utils/logger.js';
import { findUsage, deduplicateUsages } from '../utils/ripgrep.js';

export interface ConvexAnalyzerConfig {
  convexDir: string;
  cacheDir: string;
  searchDirs: string[];
  ignoreList: string[];
  noCache: boolean;
}

export class ConvexAnalyzer {
  private config: ConvexAnalyzerConfig;
  private logger: Logger;
  private cacheManager: CacheManager;
  private functionSpecFetcher: FunctionSpecFetcher;

  constructor(config: ConvexAnalyzerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.cacheManager = new CacheManager(
      config.cacheDir,
      config.convexDir,
      config.noCache
    );
    this.functionSpecFetcher = new FunctionSpecFetcher(
      config.convexDir,
      this.cacheManager,
      logger,
      config.ignoreList
    );
  }

  /**
   * Search for function usage in client code and convex backend
   */
  private findFunctionUsage(
    modulePath: string,
    functionName: string
  ): FunctionUsage[] {
    // Convert module path to dot notation
    // "assets/mutations" -> "assets.mutations"
    const dotPath = modulePath.replace(/\//g, '.');

    // Build search patterns
    // Pattern 1: api.module.path.functionName (most common)
    // Pattern 2: api["module/path"].functionName (bracket notation with original path)
    // Pattern 3: api['module/path'].functionName (single quotes)
    const patterns = [
      `api\\.${dotPath}\\.${functionName}`,
      `api\\["${modulePath}"\\]\\.${functionName}`,
      `api\\['${modulePath}'\\]\\.${functionName}`,
    ];

    // Build search paths
    const searchPaths = this.config.searchDirs.map((dir) => {
      return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    });

    // Remove duplicate paths (e.g., if convex is inside src)
    const uniqueSearchPaths = Array.from(new Set(searchPaths));

    const allUsages: FunctionUsage[] = [];

    // Search each pattern in all search paths
    for (const pattern of patterns) {
      const usages = findUsage(pattern, uniqueSearchPaths, '*.{ts,tsx}');
      allUsages.push(...usages);
    }

    // Remove duplicates
    return deduplicateUsages(allUsages);
  }

  /**
   * Main analysis function
   */
  async analyze(): Promise<AnalysisResults> {
    this.logger.box('🔍 Convex Function Usage Analysis');

    const { publicFunctions, ignoredFunctions } =
      await this.functionSpecFetcher.getConvexFunctions();

    this.logger.success(
      `Found ${publicFunctions.length + ignoredFunctions.length} public Convex functions`
    );

    if (ignoredFunctions.length > 0) {
      this.logger.debug(
        `Ignoring ${ignoredFunctions.length} functions from analysis`
      );
    }

    const results: AnalysisResults = {
      used: [],
      unused: [],
      ignored: ignoredFunctions,
    };

    const searchDirsDisplay = this.config.searchDirs.join(', ');
    this.logger.debug(
      `Analyzing function usage in ${searchDirsDisplay} directories...`
    );

    // Analyze each function
    let processed = 0;
    for (const fn of publicFunctions) {
      processed++;
      if (processed % 10 === 0 || processed === publicFunctions.length) {
        this.logger.debug(
          `Progress: ${processed}/${publicFunctions.length} functions analyzed`
        );
      }

      const usages = this.findFunctionUsage(fn.modulePath, fn.functionName);

      if (usages.length > 0) {
        results.used.push({ ...fn, usages });
      } else {
        results.unused.push(fn);
      }
    }

    return results;
  }

  /**
   * Get a summary of the analysis results
   */
  getSummary(results: AnalysisResults): {
    total: number;
    analyzed: number;
    used: number;
    unused: number;
    ignored: number;
  } {
    const analyzed = results.used.length + results.unused.length;
    const total = analyzed + results.ignored.length;

    return {
      total,
      analyzed,
      used: results.used.length,
      unused: results.unused.length,
      ignored: results.ignored.length,
    };
  }

  /**
   * Get the most used function
   */
  getMostUsed(results: AnalysisResults): UsedFunction | null {
    if (results.used.length === 0) return null;

    return results.used.reduce((max, fn) =>
      fn.usages.length > max.usages.length ? fn : max
    );
  }
}
