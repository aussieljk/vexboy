# vexboy

> Analyze Convex function and schema usage in your codebase

A powerful CLI tool for analyzing your Convex projects to identify unused functions, tables, and fields.

## Features

- **Function Usage Analysis** - Find unused Convex functions across your codebase
- **Schema Usage Analysis** - Detect unused tables and fields in your database schema
- **Smart Caching** - Fast repeated analysis with intelligent cache invalidation
- **Beautiful Output** - Colored, formatted console output with progress indicators
- **Configurable** - Flexible configuration via file, environment variables, or CLI flags
- **Multiple Formats** - Export reports as JSON, CSV, or view in the terminal

## Installation

### Global Installation (Recommended)

```bash
npm install -g vexboy
# or
pnpm add -g vexboy
```

### Local Project Installation

```bash
npm install --save-dev vexboy
# or
pnpm add -D vexboy
```

### npx (No Installation)

```bash
npx vexboy analyze
npx vexboy schema
```

## Usage

### Analyze Function Usage

```bash
# Basic usage
vexboy analyze

# Force fresh analysis (bypass cache)
vexboy analyze --no-cache

# Custom cache location
vexboy analyze --cache-dir ../../.cache/vexboy

# Ignore specific functions
vexboy analyze --ignore "testFunction,debugHelper"

# Generate only JSON report
vexboy analyze --json --output ./reports
```

### Analyze Schema

```bash
# Basic usage
vexboy schema

# Show detailed usage for all tables
vexboy schema --include-used

# Generate JSON report
vexboy schema --json

# Custom convex directory
vexboy schema --convex-dir ./my-convex
```

### Create Configuration File

```bash
# Create .vexboy.config.js
vexboy init

# Create JSON config
vexboy init --format json

# Overwrite existing config
vexboy init --force
```

## Configuration

Create a `.vexboy.config.js` file in your project root:

```javascript
/**
 * @type {import('vexboy').VexboyConfig}
 */
export default {
  // Cache directory (user configurable)
  cacheDir: './.vexboy-cache',

  // Convex directory (auto-detected by default)
  convexDir: './convex',

  // Analyze command settings
  analyze: {
    searchDirs: ['src', 'convex'],
    ignoreList: [
      'isAuthenticated',
      'signIn',
      'signOut',
    ],
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

  // Schema command settings
  schema: {
    searchDirs: ['convex'],
    includeUsed: false,
    usageThreshold: 50,
    reports: {
      json: false,
      outputDir: './',
    },
  },

  // Output settings
  output: {
    color: true,
    verbose: false,
    quiet: false,
  },
};
```

### Configuration Precedence

Configuration is loaded in this order (highest priority first):

1. **CLI flags** (`--cache-dir`, `--ignore`, etc.)
2. **Config file** (`.vexboy.config.js` or `vexboy.config.js`)
3. **Environment variables** (`VEXBOY_CACHE_DIR`, `VEXBOY_CONVEX_DIR`)
4. **Smart defaults**

### Environment Variables

```bash
VEXBOY_CACHE_DIR=/path/to/cache
VEXBOY_CONVEX_DIR=/custom/convex
VEXBOY_NO_CACHE=true
VEXBOY_NO_COLOR=true
```

## CLI Commands

### `vexboy analyze [options]`

Analyze Convex function usage across your codebase.

**Options:**

```
-c, --no-cache              Bypass cache and fetch fresh data
--fresh                     Alias for --no-cache
--cache-dir <path>          Custom cache directory
--convex-dir <path>         Convex directory location (auto-detected)
--search-dirs <paths>       Comma-separated directories to search
--ignore <functions>        Comma-separated functions to ignore
--json                      Generate JSON report
--csv                       Generate CSV report
--output <path>             Custom output directory
--quiet                     Minimal output
--verbose                   Detailed output with debug info
--no-color                  Disable colored output
```

### `vexboy schema [options]`

Analyze Convex schema for unused tables and fields.

**Options:**

```
--convex-dir <path>         Convex directory location (auto-detected)
--search-dirs <paths>       Comma-separated directories to search
--json                      Generate JSON report
--include-used              Show detailed info for used tables/fields
--threshold <percent>       Highlight tables with less than N% field usage
--output <path>             Custom output directory
--quiet                     Minimal output
--verbose                   Detailed output
--no-color                  Disable colored output
```

### `vexboy init [options]`

Create a vexboy configuration file.

**Options:**

```
-f, --force                 Overwrite existing config
--format <type>             Config format: js|json (default: js)
```

## Requirements

- Node.js 22+
- [ripgrep](https://github.com/BurntSushi/ripgrep) (for fast code searching)
- A Convex project with `convex` CLI available

### Installing ripgrep

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt install ripgrep

# Other platforms
# See https://github.com/BurntSushi/ripgrep#installation
```

> Note: the `frontend/` directory in this repo is an experimental TanStack Start scaffold that is not yet wired up to the CLI.

## How It Works

### Function Analysis

1. Fetches Convex function specifications using `npx convex function-spec`
2. Searches your codebase for function references using ripgrep
3. Matches three usage patterns:
   - `api.module.path.functionName` (dot notation)
   - `api["module/path"].functionName` (bracket notation)
   - `api['module/path'].functionName` (single quote bracket)
4. Caches results with smart invalidation based on file modification times

### Schema Analysis

1. Parses `convex/schema.ts` to extract table and field definitions
2. Scans all Convex files for usage patterns:
   - Table usage: `ctx.db.query("tableName")`, `v.id("tableName")`, etc.
   - Field usage: property access, queries, destructuring, indexes
3. Reports unused tables and fields with usage statistics

## Output

### Console Output

Beautiful, color-coded console output with:
- Summary statistics with percentages
- Quick stats (most used functions)
- Warning list of unused items
- Timing information

### JSON Reports

Structured JSON output with metadata:

```json
{
  "meta": {
    "generatedAt": "2025-12-16T12:34:56.789Z",
    "version": "1.0.0"
  },
  "summary": {
    "total": 78,
    "used": 69,
    "unused": 9
  },
  "used": [...],
  "unused": [...]
}
```

### CSV Reports

Spreadsheet-friendly format for further analysis:

```csv
Function,Module Path,Type,Status,Usage Count,Locations
"functionName","module/path","Query","Used",5,"file.ts:123; ..."
```

## Package Scripts Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "analyze": "vexboy analyze",
    "analyze:fresh": "vexboy analyze --no-cache",
    "analyze-schema": "vexboy schema",
    "analyze:all": "vexboy analyze && vexboy schema"
  }
}
```

## Examples

### Basic Workflow

```bash
# 1. Analyze function usage
vexboy analyze

# 2. Analyze schema
vexboy schema

# 3. Review reports
cat convex-usage-report.json
cat schema-usage-report.json

# 4. Create config for future runs
vexboy init
```

### CI/CD Integration

```yaml
# .github/workflows/convex-analysis.yml
name: Convex Analysis

on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g vexboy
      - run: sudo apt install ripgrep
      - run: vexboy analyze --json
      - run: vexboy schema --json
```

## License

MIT

## Author

Lucas Knight

---

**vexboy** - Keep your Convex codebase clean and efficient! 🚀
