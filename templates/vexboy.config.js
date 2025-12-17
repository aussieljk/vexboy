/**
 * @type {import('vexboy').VexboyConfig}
 */
export default {
  // General settings
  convexDir: './convex',           // Auto-detected by default
  cacheDir: './.vexboy-cache',     // Cache location

  // Analyze command settings
  analyze: {
    searchDirs: ['src', 'convex'], // Where to search for usage
    ignoreList: [                  // Functions to exclude from analysis
      // Add function names or full identifiers to ignore
      // Examples:
      // 'isAuthenticated',
      // 'signIn',
      // 'signOut',
    ],
    reports: {
      json: true,                  // Generate JSON report
      csv: true,                   // Generate CSV report
      outputDir: './',             // Where to save reports
    },
    cache: {
      enabled: true,               // Use caching
      ttl: 0,                      // Cache forever (0 = until files change)
    },
  },

  // Schema command settings
  schema: {
    searchDirs: ['convex'],        // Where to search for usage
    includeUsed: false,            // Show details for used tables
    usageThreshold: 50,            // Highlight low usage tables
    reports: {
      json: false,
      outputDir: './',
    },
  },

  // Output settings
  output: {
    color: true,                   // Colored output
    verbose: false,                // Detailed logging
    quiet: false,                  // Minimal output
  },
};
