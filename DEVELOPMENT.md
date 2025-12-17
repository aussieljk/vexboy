# Development & Distribution Guide

This guide covers how to bundle vexboy and install it into new projects.

## Building for Distribution

### 1. Build the Project

The project uses TypeScript and needs to be compiled to JavaScript before distribution.

```bash
# Clean any previous builds
pnpm run clean

# Compile TypeScript to JavaScript
pnpm run build
```

This will:
- Compile all TypeScript files in `src/` to JavaScript in `dist/`
- Generate type definitions (`.d.ts` files)
- Create the executable CLI entry point at `dist/cli/index.js`

### 2. Test the Build Locally

Before publishing, test the built version:

```bash
# Run the built CLI directly
node dist/cli/index.js analyze

# Or use the npm script that uses tsx (dev mode)
pnpm run dev analyze
```

### 3. Package for npm

The `package.json` is already configured for npm distribution with:

```json
{
  "bin": {
    "vexboy": "./dist/cli/index.js"
  },
  "files": [
    "dist",
    "templates",
    "README.md",
    "LICENSE"
  ]
}
```

The `prepublishOnly` script automatically cleans and builds before publishing:

```bash
# This will clean, build, and publish to npm
npm publish

# Or with pnpm
pnpm publish
```

### 4. Test the Package Locally

Before publishing to npm, test the package installation locally:

```bash
# Create a tarball
pnpm pack

# This creates vexboy-1.0.0.tgz

# Install it in another project
cd /path/to/test-project
npm install /path/to/vexboy/vexboy-1.0.0.tgz
```

## Installing into New Projects

### Global Installation (Recommended for CLI)

Install vexboy globally to use it across all projects:

```bash
# npm
npm install -g vexboy

# pnpm
pnpm add -g vexboy

# yarn
yarn global add vexboy
```

Then use it anywhere:

```bash
cd /path/to/any-convex-project
vexboy analyze
vexboy schema
```

### Local Project Installation

Install as a dev dependency in a specific project:

```bash
# npm
npm install --save-dev vexboy

# pnpm
pnpm add -D vexboy

# yarn
yarn add -D vexboy
```

Then run via npm scripts or npx:

```bash
# Via npx
npx vexboy analyze

# Via package.json scripts
{
  "scripts": {
    "analyze": "vexboy analyze",
    "analyze:schema": "vexboy schema"
  }
}

# Run the script
npm run analyze
```

### Using npx (No Installation)

Run vexboy without installing:

```bash
npx vexboy analyze
npx vexboy schema
npx vexboy init
```

This is useful for:
- One-time analysis
- CI/CD pipelines
- Testing before installing

### Installing from Local Build (Development)

When developing or testing locally:

```bash
# In the vexboy directory, link it globally
cd /path/to/vexboy
pnpm link --global

# In your test project, use the linked version
cd /path/to/test-project
vexboy analyze
```

To unlink:

```bash
pnpm uninstall -g vexboy
```

### Installing from Git Repository

Install directly from GitHub (useful for testing unreleased versions):

```bash
npm install --save-dev github:lucasknight/vexboy
```

Or from a specific branch/tag:

```bash
npm install --save-dev github:lucasknight/vexboy#main
npm install --save-dev github:lucasknight/vexboy#v1.0.0
```

## Publishing to npm

### First-Time Setup

1. Create an npm account at [npmjs.com](https://www.npmjs.com)

2. Login via CLI:
```bash
npm login
```

3. Verify the package name is available:
```bash
npm search vexboy
```

### Publishing Process

1. Update version in `package.json`:
```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major
```

2. Publish to npm:
```bash
# Public package
npm publish

# Scoped package (if using @username/vexboy)
npm publish --access public
```

3. Verify publication:
```bash
npm view vexboy
```

### Version Management

The project follows [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.x): Bug fixes, no API changes
- **Minor** (1.x.0): New features, backwards compatible
- **Major** (x.0.0): Breaking changes

```bash
# Update version and create git tag
npm version patch -m "Fix: cache invalidation bug"
npm version minor -m "Add: schema analysis command"
npm version major -m "Breaking: change CLI API"

# Push tags to git
git push --follow-tags
```

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Run in dev mode (with hot reload)
pnpm run dev analyze /path/to/convex

# Type check without building
pnpm run type-check

# Build for production
pnpm run build
```

### Testing Changes

```bash
# Build the project
pnpm run build

# Test on a real Convex project
cd /path/to/test-project
node /path/to/vexboy/dist/cli/index.js analyze

# Or link globally for easier testing
cd /path/to/vexboy
pnpm link --global

cd /path/to/test-project
vexboy analyze
```

## Pre-Publication Checklist

Before publishing a new version:

- [ ] Update `package.json` version
- [ ] Update `CHANGELOG.md` with changes
- [ ] Run `pnpm run build` successfully
- [ ] Test CLI commands on real projects
- [ ] Update README.md if needed
- [ ] Commit all changes
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push to GitHub: `git push --follow-tags`
- [ ] Publish to npm: `npm publish`

## Troubleshooting

### Build Issues

```bash
# Clear all build artifacts and node_modules
pnpm run clean
rm -rf node_modules
pnpm install
pnpm run build
```

### Permission Issues (Global Install)

```bash
# On macOS/Linux, you might need sudo
sudo npm install -g vexboy

# Or configure npm to use a different directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### CLI Not Working After Install

```bash
# Verify installation
which vexboy
vexboy --version

# Check if node_modules/.bin is in PATH
echo $PATH

# Try using npx instead
npx vexboy analyze
```

## Project Structure

```
vexboy/
├── src/
│   ├── cli/
│   │   └── index.ts          # CLI entry point
│   ├── analyzers/
│   │   ├── functions.ts      # Function usage analyzer
│   │   └── schema.ts         # Schema usage analyzer
│   ├── utils/
│   │   ├── cache.ts          # Cache management
│   │   ├── config.ts         # Configuration loading
│   │   └── reporters.ts      # Report generation
│   └── types/
│       └── index.ts          # TypeScript types
├── dist/                     # Built output (git ignored)
├── templates/                # Config templates
├── package.json
├── tsconfig.json
├── README.md                 # User documentation
└── DEVELOPMENT.md           # This file
```

## Distribution Files

Files included in npm package (defined in `package.json` `files` array):

- `dist/` - Compiled JavaScript and type definitions
- `templates/` - Configuration file templates
- `README.md` - User documentation
- `LICENSE` - MIT license

Files excluded (via `.npmignore`):
- `src/` - TypeScript source (not needed after build)
- `node_modules/` - Dependencies (users install their own)
- `.git/` - Git history
- Development configs and test files
