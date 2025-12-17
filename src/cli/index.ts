#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeCommand } from '../commands/analyze.js';
import { schemaCommand } from '../commands/schema.js';
import { initCommand } from '../commands/init.js';

const program = new Command();

program
  .name('vexboy')
  .description('Analyze Convex function and schema usage in your codebase')
  .version('1.0.0');

// Analyze command
program
  .command('analyze')
  .description('Analyze Convex function usage across your codebase')
  .option('-c, --no-cache', 'Bypass cache and fetch fresh data')
  .option('--fresh', 'Alias for --no-cache')
  .option('--cache-dir <path>', 'Custom cache directory')
  .option('--convex-dir <path>', 'Convex directory location (auto-detected)')
  .option('--search-dirs <paths>', 'Comma-separated directories to search')
  .option('--ignore <functions>', 'Comma-separated functions to ignore')
  .option('--json', 'Generate JSON report')
  .option('--csv', 'Generate CSV report')
  .option('--output <path>', 'Custom output directory')
  .option('--quiet', 'Minimal output')
  .option('--verbose', 'Detailed output with debug info')
  .option('--no-color', 'Disable colored output')
  .action(analyzeCommand);

// Schema command
program
  .command('schema')
  .description('Analyze Convex schema for unused tables and fields')
  .option('--convex-dir <path>', 'Convex directory location (auto-detected)')
  .option('--search-dirs <paths>', 'Comma-separated directories to search')
  .option('--json', 'Generate JSON report')
  .option('--include-used', 'Show detailed info for used tables/fields')
  .option('--threshold <percent>', 'Highlight tables with less than N% field usage', parseInt)
  .option('--output <path>', 'Custom output directory')
  .option('--quiet', 'Minimal output')
  .option('--verbose', 'Detailed output')
  .option('--no-color', 'Disable colored output')
  .action(schemaCommand);

// Init command
program
  .command('init')
  .description('Create a vexboy configuration file')
  .option('-f, --force', 'Overwrite existing config')
  .option('--format <type>', 'Config format: js|json (default: js)', 'js')
  .action(initCommand);

// Parse arguments
program.parse();
