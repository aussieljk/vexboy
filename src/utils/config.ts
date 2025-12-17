import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { VexboyConfig } from '../types/index.js';

/**
 * Default configuration
 */
export const defaultConfig: VexboyConfig = {
  convexDir: './convex',
  cacheDir: './.vexboy-cache',
  analyze: {
    searchDirs: ['src', 'convex'],
    ignoreList: [],
    ignorePatterns: [],
    reports: {
      json: true,
      csv: true,
      outputDir: './',
    },
    cache: {
      enabled: true,
      ttl: 0, // Cache forever (until files change)
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

/**
 * Find and load config file
 */
function findConfigFile(startDir: string = process.cwd()): string | null {
  const configNames = [
    '.vexboy.config.js',
    'vexboy.config.js',
    '.vexboy.config.json',
    'vexboy.config.json',
  ];

  for (const configName of configNames) {
    const configPath = path.join(startDir, configName);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  // Also check package.json for vexboy field
  const packageJsonPath = path.join(startDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.vexboy) {
        return packageJsonPath;
      }
    } catch {
      // Ignore errors
    }
  }

  return null;
}

/**
 * Load config from file
 */
async function loadConfigFile(configPath: string): Promise<Partial<VexboyConfig>> {
  if (configPath.endsWith('.json') || configPath.endsWith('package.json')) {
    // Load JSON config
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    return configPath.endsWith('package.json') ? parsed.vexboy : parsed;
  } else {
    // Load JS config (ESM)
    const fileUrl = `file://${path.resolve(configPath)}`;
    const module = await import(fileUrl);
    return module.default || module;
  }
}

/**
 * Load config from environment variables
 */
function loadEnvConfig(): Partial<VexboyConfig> {
  const config: Partial<VexboyConfig> = {};

  if (process.env.VEXBOY_CACHE_DIR) {
    config.cacheDir = process.env.VEXBOY_CACHE_DIR;
  }

  if (process.env.VEXBOY_CONVEX_DIR) {
    config.convexDir = process.env.VEXBOY_CONVEX_DIR;
  }

  if (process.env.VEXBOY_NO_CACHE === 'true') {
    config.analyze = {
      ...defaultConfig.analyze,
      cache: { enabled: false, ttl: 0 },
    };
  }

  if (process.env.VEXBOY_NO_COLOR === 'true') {
    config.output = {
      ...defaultConfig.output,
      color: false,
    };
  }

  return config;
}

/**
 * Deep merge two config objects
 */
function mergeConfig(base: VexboyConfig, override: Partial<VexboyConfig>): VexboyConfig {
  return {
    convexDir: override.convexDir ?? base.convexDir,
    cacheDir: override.cacheDir ?? base.cacheDir,
    analyze: {
      ...base.analyze,
      ...override.analyze,
      reports: {
        ...base.analyze.reports,
        ...override.analyze?.reports,
      },
      cache: {
        ...base.analyze.cache,
        ...override.analyze?.cache,
      },
    },
    schema: {
      ...base.schema,
      ...override.schema,
      reports: {
        ...base.schema.reports,
        ...override.schema?.reports,
      },
    },
    output: {
      ...base.output,
      ...override.output,
    },
  };
}

/**
 * Detect convex directory location
 */
export function detectConvexDir(configDir?: string): string {
  const baseDir = configDir || process.cwd();

  const rootConvex = path.join(baseDir, 'convex');
  const srcConvex = path.join(baseDir, 'src', 'convex');

  if (fs.existsSync(rootConvex) && fs.statSync(rootConvex).isDirectory()) {
    return rootConvex;
  }

  if (fs.existsSync(srcConvex) && fs.statSync(srcConvex).isDirectory()) {
    return srcConvex;
  }

  throw new Error(
    `Convex directory not found.\n\n` +
      `We looked in these locations:\n` +
      `  ✗ ${rootConvex}\n` +
      `  ✗ ${srcConvex}\n\n` +
      `Suggestions:\n` +
      `  → Run this command from your Convex project root\n` +
      `  → Specify custom location: vexboy analyze --convex-dir ./my-convex\n` +
      `  → Run 'vexboy init' to create a config file`
  );
}

/**
 * Load configuration with precedence:
 * 1. Default config
 * 2. Config file
 * 3. Environment variables
 * 4. Returns merged config
 */
export async function loadConfig(): Promise<VexboyConfig> {
  let config = { ...defaultConfig };

  // Load from config file
  const configPath = findConfigFile();
  if (configPath) {
    try {
      const fileConfig = await loadConfigFile(configPath);
      config = mergeConfig(config, fileConfig);
    } catch (error) {
      console.warn(`Warning: Failed to load config from ${configPath}:`, error);
    }
  }

  // Load from environment variables
  const envConfig = loadEnvConfig();
  config = mergeConfig(config, envConfig);

  // Auto-detect convex directory if not specified
  if (config.convexDir === './convex') {
    try {
      config.convexDir = detectConvexDir();
    } catch {
      // Will fail later if needed
    }
  }

  return config;
}

/**
 * Check if ripgrep is installed
 */
export function checkRipgrepInstalled(): void {
  try {
    execSync('which rg', { stdio: 'ignore' });
  } catch {
    throw new Error(
      `ripgrep (rg) is not installed.\n\n` +
        `vexboy requires ripgrep for searching code.\n\n` +
        `Install it with:\n` +
        `  macOS:   brew install ripgrep\n` +
        `  Ubuntu:  sudo apt install ripgrep\n` +
        `  Other:   https://github.com/BurntSushi/ripgrep#installation`
    );
  }
}
