import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ConvexFunction, ConvexFunctionSpec } from '../types/index.js';
import { CacheManager } from './cache-manager.js';
import { Logger } from '../utils/logger.js';

export class FunctionSpecFetcher {
  private convexDir: string;
  private cacheManager: CacheManager;
  private logger: Logger;
  private ignoreList: string[];

  constructor(
    convexDir: string,
    cacheManager: CacheManager,
    logger: Logger,
    ignoreList: string[] = []
  ) {
    this.convexDir = convexDir;
    this.cacheManager = cacheManager;
    this.logger = logger;
    this.ignoreList = ignoreList;
  }

  /**
   * Fetch the Convex function spec, using cache if available
   */
  private async fetchSpec(): Promise<ConvexFunctionSpec> {
    // Try to load from cache first
    const cachedSpec = this.cacheManager.load();
    if (cachedSpec) {
      this.logger.debug('Using cached function spec');
      return cachedSpec;
    }

    // Cache miss or invalid - fetch fresh data
    this.logger.debug('Generating fresh function spec...');

    try {
      // Write to temp file to avoid stdout buffering issues
      const tempFile = path.join(process.cwd(), '.convex-spec-temp.json');
      execSync(`npx convex function-spec > "${tempFile}"`, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        stdio: ['pipe', 'pipe', 'ignore'], // Ignore stderr
      });

      const output = fs.readFileSync(tempFile, 'utf-8');
      fs.unlinkSync(tempFile); // Clean up temp file

      const spec: ConvexFunctionSpec = JSON.parse(output);

      // Save to cache
      this.cacheManager.save(spec);

      return spec;
    } catch (error) {
      throw new Error(
        `Failed to fetch Convex function spec. Make sure you're in a Convex project and the convex CLI is available.\n${error}`
      );
    }
  }

  /**
   * Get all public Convex functions, separated into analyzed and ignored
   */
  async getConvexFunctions(): Promise<{
    publicFunctions: ConvexFunction[];
    ignoredFunctions: ConvexFunction[];
  }> {
    const convexRelativePath = path.relative(process.cwd(), this.convexDir);
    this.logger.debug(`Using Convex directory: ./${convexRelativePath}`);

    const spec = await this.fetchSpec();

    // Filter for public functions only (exclude HTTP actions and internal functions)
    const allPublicFunctions: ConvexFunction[] = spec.functions
      .filter(
        (fn) =>
          fn.identifier &&
          fn.visibility?.kind === 'public' &&
          fn.functionType !== 'HttpAction'
      )
      .map((fn) => {
        // Convert "actions/stocks.js:fetchStockPrices" to module and function name
        const [fileWithExt, functionName] = fn.identifier!.split(':');
        const modulePath = fileWithExt.replace(/\.js$/, '');
        return {
          identifier: fn.identifier!,
          modulePath: modulePath,
          functionName: functionName,
          functionType: fn.functionType!,
        };
      });

    // Separate ignored functions from functions to analyze
    const publicFunctions: ConvexFunction[] = [];
    const ignoredFunctions: ConvexFunction[] = [];

    for (const fn of allPublicFunctions) {
      // Check if function should be ignored
      const shouldIgnore = this.ignoreList.some((ignorePattern) => {
        // If pattern contains punctuation (/, :, .), match full identifier
        if (/[\/:\.]/.test(ignorePattern)) {
          return fn.identifier === ignorePattern;
        } else {
          // Otherwise, match just the function name
          return fn.functionName === ignorePattern;
        }
      });

      if (shouldIgnore) {
        ignoredFunctions.push(fn);
      } else {
        publicFunctions.push(fn);
      }
    }

    return { publicFunctions, ignoredFunctions };
  }
}
