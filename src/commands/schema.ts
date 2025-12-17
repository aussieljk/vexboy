import ora from 'ora';
import type { SchemaOptions } from '../types/index.js';
import { loadConfig, detectConvexDir } from '../utils/config.js';
import { Logger } from '../utils/logger.js';
import { SchemaAnalyzer } from '../core/schema-analyzer.js';
import { SchemaUsageReporter } from '../utils/reporter.js';

export async function schemaCommand(options: SchemaOptions): Promise<void> {
  try {
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

    const searchDirs = options.searchDirs
      ? options.searchDirs.split(',').map((d) => d.trim())
      : config.schema.searchDirs;

    const includeUsed = options.includeUsed ?? config.schema.includeUsed;

    const outputDir = options.output || config.schema.reports.outputDir;

    // Create analyzer
    const analyzer = new SchemaAnalyzer(
      {
        convexDir,
        searchDirs,
      },
      logger
    );

    // Run analysis with spinner
    const spinner = ora('Analyzing schema usage...').start();

    try {
      const report = analyzer.analyze();
      spinner.succeed('Analysis complete');

      // Create reporter
      const reporter = new SchemaUsageReporter(logger, outputDir);

      // Display console report
      reporter.displayConsole(report, includeUsed);

      // Save JSON report if requested
      const saveJson = options.json !== undefined ? options.json : config.schema.reports.json;

      if (saveJson) {
        const jsonPath = reporter.saveJson(report);
        logger.log('📄 Report saved:');
        logger.success(`  → ${jsonPath}`);
        logger.log('');
      }

      // Exit with error code if there are unused tables/fields (for CI/CD)
      if (report.unusedTables.length > 0 || report.unusedFields.length > 0) {
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
