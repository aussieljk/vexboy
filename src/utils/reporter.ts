import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { AnalysisResults, SchemaUsageReport } from '../types/index.js';
import { Logger } from './logger.js';

export class ConvexUsageReporter {
  private logger: Logger;
  private outputDir: string;

  constructor(logger: Logger, outputDir: string = process.cwd()) {
    this.logger = logger;
    this.outputDir = outputDir;
  }

  /**
   * Display console report with improved formatting
   */
  displayConsole(results: AnalysisResults, startTime: number): void {
    const summary = {
      total: results.used.length + results.unused.length + results.ignored.length,
      analyzed: results.used.length + results.unused.length,
      used: results.used.length,
      unused: results.unused.length,
      ignored: results.ignored.length,
    };

    // Summary section
    this.logger.log('');
    this.logger.log(chalk.bold('📊 Summary'));
    this.logger.log(`  Total functions:     ${summary.total}`);
    this.logger.log(`  ${chalk.green('✓')} Used:             ${summary.used} (${Math.round((summary.used / summary.analyzed) * 100)}%)`);
    this.logger.log(`  ${chalk.yellow('⚠')} Unused:            ${summary.unused} (${Math.round((summary.unused / summary.analyzed) * 100)}%)`);
    this.logger.log(`  ${chalk.dim('⊘')} Ignored:           ${summary.ignored}`);

    // Quick stats
    if (results.used.length > 0) {
      const mostUsed = results.used.reduce((max, fn) =>
        fn.usages.length > max.usages.length ? fn : max
      );

      this.logger.log('');
      this.logger.log(chalk.bold('⚡ Quick Stats'));
      this.logger.log(
        `  Most used:  ${chalk.cyan(mostUsed.modulePath + ':' + mostUsed.functionName)} (${mostUsed.usages.length} references)`
      );
    }

    // Unused functions warning
    if (results.unused.length > 0) {
      this.logger.log('');
      this.logger.log(chalk.yellow.bold(`⚠️  ${results.unused.length} Unused Functions:`));
      for (const fn of results.unused) {
        this.logger.log(chalk.yellow(`  • ${fn.modulePath}:${fn.functionName} (${fn.functionType})`));
      }
    }

    // Timing
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.log('');
    this.logger.log(chalk.dim(`⏱ Completed in ${elapsed}s`));
  }

  /**
   * Save JSON report
   */
  saveJson(results: AnalysisResults): string {
    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
      summary: {
        total: results.used.length + results.unused.length + results.ignored.length,
        analyzed: results.used.length + results.unused.length,
        used: results.used.length,
        unused: results.unused.length,
        ignored: results.ignored.length,
      },
      used: results.used,
      unused: results.unused,
      ignored: results.ignored,
    };

    const outputPath = path.join(this.outputDir, 'convex-usage-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    return outputPath;
  }

  /**
   * Save CSV report
   */
  saveCsv(results: AnalysisResults): string {
    const lines = ['Function,Module Path,Type,Status,Usage Count,Locations'];

    // Add used functions
    for (const fn of results.used) {
      const locations = fn.usages.map((u) => `${u.file}:${u.line}`).join('; ');
      lines.push(
        `"${fn.functionName}","${fn.modulePath}","${fn.functionType}","Used",${fn.usages.length},"${locations}"`
      );
    }

    // Add unused functions
    for (const fn of results.unused) {
      lines.push(
        `"${fn.functionName}","${fn.modulePath}","${fn.functionType}","Unused",0,""`
      );
    }

    // Add ignored functions
    for (const fn of results.ignored) {
      lines.push(
        `"${fn.functionName}","${fn.modulePath}","${fn.functionType}","Ignored",0,""`
      );
    }

    const outputPath = path.join(this.outputDir, 'convex-usage-report.csv');
    fs.writeFileSync(outputPath, lines.join('\n'));

    return outputPath;
  }
}

export class SchemaUsageReporter {
  private logger: Logger;
  private outputDir: string;

  constructor(logger: Logger, outputDir: string = process.cwd()) {
    this.logger = logger;
    this.outputDir = outputDir;
  }

  /**
   * Display console report with improved formatting
   */
  displayConsole(report: SchemaUsageReport, includeUsed: boolean = false): void {
    this.logger.log('');
    this.logger.log(chalk.bold('📊 Summary'));
    this.logger.log(
      `  Tables: ${chalk.green(report.summary.usedTables + ' used')} / ${chalk.red(report.summary.totalTables - report.summary.usedTables + ' unused')} / ${report.summary.totalTables} total`
    );
    this.logger.log(
      `  Fields: ${chalk.green(report.summary.usedFields + ' used')} / ${chalk.yellow(report.summary.totalFields - report.summary.usedFields + ' unused')} / ${report.summary.totalFields} total`
    );

    // Unused tables
    if (report.unusedTables.length > 0) {
      this.logger.log('');
      this.logger.log(chalk.red.bold(`⚠️  ${report.unusedTables.length} Unused Tables:`));
      for (const tableName of report.unusedTables) {
        const table = report.tables.find((t) => t.table === tableName);
        const fieldCount = table?.fields.length || 0;
        this.logger.log(chalk.red(`  ✗ ${tableName} (${fieldCount} fields defined)`));
      }
    } else {
      this.logger.log('');
      this.logger.log(chalk.green('✓ All tables are being used'));
    }

    // All fields (grouped by table)
    this.logger.log('');
    this.logger.log(chalk.bold.cyan('📋 Table & Field Details'));
    this.logger.log(chalk.cyan('━'.repeat(65)));

    for (const table of report.tables) {
      const usedFields = table.fields.filter((f) => f.used).length;
      const totalFields = table.fields.length;
      const percentage = totalFields > 0 ? Math.round((usedFields / totalFields) * 100) : 0;

      const tableColor = table.usageCount === 0 ? chalk.red : table.usageCount < 5 ? chalk.yellow : chalk.green;

      this.logger.log('');
      this.logger.log(
        tableColor(`  ${table.table}`) +
          chalk.dim(` (${table.usageCount} refs, ${usedFields}/${totalFields} fields = ${percentage}%)`)
      );

      for (const field of table.fields) {
        if (field.used) {
          this.logger.log(chalk.green(`     ✓ ${field.field}`));
        } else {
          this.logger.log(chalk.yellow(`     ✗ ${field.field}`));
        }
      }
    }

    // Table usage details
    if (includeUsed && report.tables.length > 0) {
      this.logger.log('');
      this.logger.log(chalk.bold.cyan('📋 Table Usage Details'));
      this.logger.log(chalk.cyan('━'.repeat(65)));

      for (const table of report.tables) {
        const usedFields = table.fields.filter((f) => f.used).length;
        const totalFields = table.fields.length;
        const percentage = totalFields > 0 ? Math.round((usedFields / totalFields) * 100) : 0;

        const color = table.usageCount === 0 ? chalk.red : table.usageCount < 5 ? chalk.yellow : chalk.green;
        const fieldColor = percentage < 50 ? chalk.red : percentage < 80 ? chalk.yellow : chalk.green;

        this.logger.log(
          color(`  ${table.table.padEnd(25)}`) +
            color(` ${String(table.usageCount).padStart(3)} refs`) +
            '  |  ' +
            fieldColor(`${usedFields}/${totalFields} fields (${percentage}%)`)
        );
      }
    }

    // Recommendations
    if (report.unusedTables.length > 0 || report.unusedFields.length > 0) {
      this.logger.log('');
      this.logger.log(chalk.magenta.bold('💡 Recommendations:'));

      if (report.unusedTables.length > 0) {
        this.logger.log(chalk.magenta('   • Consider removing unused tables from schema.ts'));
      }

      if (report.unusedFields.length > 0) {
        this.logger.log(chalk.magenta('   • Review unused fields - they may be:'));
        this.logger.log(chalk.magenta('     - Planned for future use'));
        this.logger.log(chalk.magenta('     - Accessed via patterns not detected'));
        this.logger.log(chalk.magenta('     - Actually unused and can be removed'));
      }
    }

    this.logger.log('');
  }

  /**
   * Save JSON report
   */
  saveJson(report: SchemaUsageReport): string {
    const outputPath = path.join(this.outputDir, 'schema-usage-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    return outputPath;
  }
}
