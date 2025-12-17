import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import type { InitOptions } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initCommand(options: InitOptions): Promise<void> {
  try {
    const format = options.format || 'js';
    const configFileName = format === 'json' ? '.vexboy.config.json' : '.vexboy.config.js';
    const configPath = path.join(process.cwd(), configFileName);

    // Check if config already exists
    if (fs.existsSync(configPath) && !options.force) {
      console.log(
        chalk.yellow(
          `\nConfig file already exists: ${configFileName}\n\n` +
            `Use --force to overwrite it.\n`
        )
      );
      process.exit(1);
    }

    // Read template
    const templatePath = path.join(__dirname, '../../templates/vexboy.config.js');
    const template = fs.readFileSync(templatePath, 'utf-8');

    if (format === 'json') {
      // Convert JS template to JSON
      // This is a simple approach - extract the object and convert to JSON
      const jsonConfig = {
        convexDir: './convex',
        cacheDir: './.vexboy-cache',
        analyze: {
          searchDirs: ['src', 'convex'],
          ignoreList: [],
          reports: {
            json: true,
            csv: true,
            outputDir: './',
          },
          cache: {
            enabled: true,
            ttl: 0,
          },
        },
        schema: {
          searchDirs: ['convex'],
          includeUsed: false,
          usageThreshold: 50,
          reports: {
            json: false,
            outputDir: './',
          },
        },
        output: {
          color: true,
          verbose: false,
          quiet: false,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(jsonConfig, null, 2));
    } else {
      // Write JS template as-is
      fs.writeFileSync(configPath, template);
    }

    console.log(chalk.green(`\n✓ Created ${configFileName}\n`));
    console.log(chalk.dim('Edit this file to customize vexboy for your project.\n'));
  } catch (error) {
    console.error(
      chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}\n`)
    );
    process.exit(1);
  }
}
