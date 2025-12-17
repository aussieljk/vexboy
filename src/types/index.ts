// Convex Function Analysis Types
export interface ConvexFunction {
  identifier: string;
  modulePath: string;
  functionName: string;
  functionType: string;
}

export interface FunctionUsage {
  file: string;
  line: number;
  matchedText: string;
}

export interface UsedFunction extends ConvexFunction {
  usages: FunctionUsage[];
}

export interface AnalysisResults {
  used: UsedFunction[];
  unused: ConvexFunction[];
  ignored: ConvexFunction[];
}

export interface ConvexFunctionSpec {
  functions: {
    identifier?: string;
    visibility?: { kind: string };
    functionType?: string;
  }[];
}

export interface RipgrepMatch {
  type: string;
  data: {
    path: { text: string };
    line_number: number;
    lines: { text: string };
  };
}

export interface CacheMeta {
  timestamp: number;
  newestFileMtime: number;
  fileHash: string;
}

// Schema Analysis Types
export interface TableSchema {
  name: string;
  fields: string[];
}

export interface FieldUsage {
  field: string;
  used: boolean;
  locations: string[];
}

export interface TableUsage {
  table: string;
  used: boolean;
  fields: FieldUsage[];
  usageCount: number;
}

export interface SchemaUsageReport {
  tables: TableUsage[];
  unusedTables: string[];
  unusedFields: { table: string; field: string }[];
  summary: {
    totalTables: number;
    usedTables: number;
    totalFields: number;
    usedFields: number;
  };
}

// Configuration Types
export interface AnalyzeConfig {
  searchDirs: string[];
  ignoreList: string[];
  ignorePatterns?: RegExp[];
  reports: {
    json: boolean;
    csv: boolean;
    outputDir: string;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
}

export interface SchemaConfig {
  searchDirs: string[];
  includeUsed: boolean;
  usageThreshold: number;
  reports: {
    json: boolean;
    outputDir: string;
  };
}

export interface VexboyConfig {
  convexDir: string;
  cacheDir: string;
  analyze: AnalyzeConfig;
  schema: SchemaConfig;
  output: {
    color: boolean;
    verbose: boolean;
    quiet: boolean;
  };
}

// CLI Option Types
export interface AnalyzeOptions {
  cache?: boolean;
  fresh?: boolean;
  cacheDir?: string;
  convexDir?: string;
  searchDirs?: string;
  ignore?: string;
  ignoreFile?: string;
  json?: boolean;
  csv?: boolean;
  output?: string;
  quiet?: boolean;
  verbose?: boolean;
  color?: boolean;
}

export interface SchemaOptions {
  convexDir?: string;
  searchDirs?: string;
  json?: boolean;
  includeUsed?: boolean;
  threshold?: number;
  output?: string;
  quiet?: boolean;
  verbose?: boolean;
  color?: boolean;
}

export interface InitOptions {
  force?: boolean;
  format?: 'js' | 'json';
}
