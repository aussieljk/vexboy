import ora from 'ora';
import type { AnalyzeOptions } from '../types/index.js';
import { loadConfig, checkRipgrepInstalled, detectConvexDir } from '../utils/config.js';
import { Logger } from '../utils/logger.js';
import { ConvexAnalyzer } from '../core/convex-analyzer.js';
import { ConvexUsageReporter } from '../utils/reporter.js';

export async function analyzeCommand(options: AnalyzeOptions): Promise<void> {
  const startTime = Date.now();

  try {
    // Check ripgrep is installed
    checkRipgrepInstalled();

    // Load config
    const config = await loadConfig();

    // Create logger
    const logger = new Logger({
      quiet: options.quiet ?? config.output.quiet,
      verbose: options.verbose ?? config.output.verbose,
      color: options.color ?? config.output.color,
    });

    // Apply CLI options to config
    const convexDir = options.convexDir
      ? options.convexDir
      : config.convexDir || detectConvexDir();

    const cacheDir = options.cacheDir || config.cacheDir;

    const searchDirs = options.searchDirs
      ? options.searchDirs.split(',').map((d) => d.trim())
      : config.analyze.searchDirs;

    const ignoreList = options.ignore
      ? options.ignore.split(',').map((f) => f.trim())
      : config.analyze.ignoreList;

    const noCache = options.cache === false || options.fresh === true || !config.analyze.cache.enabled;

    const outputDir = options.output || config.analyze.reports.outputDir;

    // Create analyzer
    const analyzer = new ConvexAnalyzer(
      {
        convexDir,
        cacheDir,
        searchDirs,
        ignoreList,
        noCache,
      },
      logger
    );

    // Run analysis with spinner
    const spinner = ora('Fetching Convex function specifications...').start();

    try {
      const results = await analyzer.analyze();
      spinner.succeed('Analysis complete');

      // Create reporter
      const reporter = new ConvexUsageReporter(logger, outputDir);

      // Display console report
      reporter.displayConsole(results, startTime);

      // Save reports if requested
      const saveJson = options.json !== undefined ? options.json : config.analyze.reports.json;
      const saveCsv = options.csv !== undefined ? options.csv : config.analyze.reports.csv;

      if (saveJson || saveCsv) {
        logger.log('');
        logger.log('📄 Reports saved:');
      }

      if (saveJson) {
        const jsonPath = reporter.saveJson(results);
        logger.success(`  → ${jsonPath}`);
      }

      if (saveCsv) {
        const csvPath = reporter.saveCsv(results);
        logger.success(`  → ${csvPath}`);
      }

      logger.log('');

      // Exit with error code if there are unused functions (for CI/CD)
      if (results.unused.length > 0) {
        process.exit(0); // Don't fail by default, but users can check exit code if needed
      }
    } catch (error) {
      spinner.fail('Analysis failed');
      throw error;
    }
  } catch (error) {
    console.error(
      `\nError: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  }
}
