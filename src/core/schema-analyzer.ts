import * as fs from 'fs';
import * as path from 'path';
import type { TableSchema, SchemaUsageReport, TableUsage, FieldUsage } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export interface SchemaAnalyzerConfig {
  convexDir: string;
  searchDirs: string[];
}

export class SchemaAnalyzer {
  private config: SchemaAnalyzerConfig;
  private logger: Logger;
  private tables: Map<string, TableSchema> = new Map();
  private allFiles: string[] = [];

  constructor(config: SchemaAnalyzerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Parse schema.ts to extract table definitions
   */
  private parseSchema(): void {
    const schemaPath = path.join(this.config.convexDir, 'schema.ts');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // Extract table names - looking for patterns like: tableName: defineTable({
    const tableRegex = /(\w+):\s*defineTable\(\{/g;
    let match;

    while ((match = tableRegex.exec(schemaContent)) !== null) {
      const tableName = match[1];
      if (tableName !== 'authTables') {
        // Skip spread operators
        this.tables.set(tableName, {
          name: tableName,
          fields: [],
        });
      }
    }

    // For each table, extract field names
    for (const [tableName, tableSchema] of this.tables.entries()) {
      const fields = this.extractFieldsForTable(schemaContent, tableName);
      tableSchema.fields = fields;
    }

    this.logger.success(`Found ${this.tables.size} tables in schema`);
  }

  /**
   * Extract field names for a specific table
   */
  private extractFieldsForTable(schemaContent: string, tableName: string): string[] {
    const fields: string[] = [];

    // Find the table definition block
    const tableRegex = new RegExp(`${tableName}:\\s*defineTable\\(\\{([\\s\\S]*?)\\}\\)`, 'm');
    const tableMatch = tableRegex.exec(schemaContent);

    if (!tableMatch) return fields;

    const tableBlock = tableMatch[1];

    // Extract field names - looking for patterns like: fieldName: v.something(
    const fieldRegex = /^\s*(\w+):\s*v\./gm;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(tableBlock)) !== null) {
      const fieldName = fieldMatch[1];
      if (fieldName !== 'object' && fieldName !== 'optional') {
        fields.push(fieldName);
      }
    }

    // Also extract nested fields in metadata objects
    const metadataRegex = /metadata:\s*v\.optional\(\s*v\.object\(\{([^\}]+)\}\)/s;
    const metadataMatch = metadataRegex.exec(tableBlock);

    if (metadataMatch) {
      const metadataBlock = metadataMatch[1];
      const nestedFieldRegex = /(\w+):\s*v\./g;
      let nestedMatch;

      while ((nestedMatch = nestedFieldRegex.exec(metadataBlock)) !== null) {
        const nestedField = nestedMatch[1];
        fields.push(`metadata.${nestedField}`);
      }
    }

    return fields;
  }

  /**
   * Get all TypeScript files in specified directories (excluding generated files)
   */
  private getAllFiles(): void {
    const getAllFilesRecursive = (dir: string): string[] => {
      const files: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip _generated, node_modules, and schema.ts
        if (
          entry.name.startsWith('_generated') ||
          entry.name === 'node_modules' ||
          entry.name === 'schema.ts'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          files.push(...getAllFilesRecursive(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }

      return files;
    };

    // Always search the convex directory itself
    const convexPath = path.isAbsolute(this.config.convexDir)
      ? this.config.convexDir
      : path.join(process.cwd(), this.config.convexDir);

    if (fs.existsSync(convexPath)) {
      this.allFiles.push(...getAllFilesRecursive(convexPath));
    }

    // Get files from additional search directories
    for (const dir of this.config.searchDirs) {
      const fullPath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);

      // Skip if it's the same as convex directory (already added)
      if (path.resolve(fullPath) === path.resolve(convexPath)) {
        continue;
      }

      if (fs.existsSync(fullPath)) {
        this.allFiles.push(...getAllFilesRecursive(fullPath));
      }
    }

    this.logger.debug(`Scanning ${this.allFiles.length} TypeScript files...`);
  }

  /**
   * Analyze usage of tables and columns across all files
   */
  private analyzeUsageInternal(): {
    tableUsageCount: Map<string, number>;
    columnUsageCount: Map<string, Map<string, number>>;
  } {
    const tableUsageCount = new Map<string, number>();
    const columnUsageCount = new Map<string, Map<string, number>>();

    // Initialize counts
    for (const tableName of this.tables.keys()) {
      tableUsageCount.set(tableName, 0);
      columnUsageCount.set(tableName, new Map());
    }

    // Read all files and search for usage
    for (const filePath of this.allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');

      for (const [tableName, tableSchema] of this.tables.entries()) {
        // Check for table usage patterns
        const tablePatterns = [
          new RegExp(`ctx\\.db\\.query\\(["']${tableName}["']\\)`, 'g'),
          new RegExp(`ctx\\.db\\.insert\\(["']${tableName}["']`, 'g'),
          new RegExp(`ctx\\.db\\.patch\\(["']${tableName}["']`, 'g'),
          new RegExp(`ctx\\.db\\.delete\\(["']${tableName}["']`, 'g'),
          new RegExp(`v\\.id\\(["']${tableName}["']\\)`, 'g'), // ID references
        ];

        for (const pattern of tablePatterns) {
          if (pattern.test(content)) {
            tableUsageCount.set(tableName, (tableUsageCount.get(tableName) || 0) + 1);
            break;
          }
        }

        // Check for column/field usage
        for (const fieldName of tableSchema.fields) {
          const baseFieldName = fieldName.split('.')[0]; // Handle metadata.field
          const nestedField = fieldName.includes('.') ? fieldName.split('.')[1] : null;

          const fieldPatterns = [
            // Direct property access: asset.fieldName
            new RegExp(`\\.${baseFieldName}(?![a-zA-Z])`, 'g'),
            // Query field: q.field("fieldName")
            new RegExp(`q\\.field\\(["']${baseFieldName}["']\\)`, 'g'),
            // Query eq: q.eq("fieldName", ...)
            new RegExp(`q\\.eq\\(["']${baseFieldName}["']`, 'g'),
            // Object destructuring: { fieldName }
            new RegExp(`\\{[^}]*\\b${baseFieldName}\\b[^}]*\\}`, 'g'),
            // args.fieldName
            new RegExp(`args\\.${baseFieldName}(?![a-zA-Z])`, 'g'),
            // Index usage: .withIndex("by_field" or "by_something_field")
            new RegExp(`\\.withIndex\\(["'][^"']*${baseFieldName}[^"']*["']`, 'gi'),
            // Index definition in schema: ["fieldName"]
            new RegExp(`\\["${baseFieldName}"\\]`, 'g'),
          ];

          // For nested fields like metadata.field
          if (nestedField) {
            fieldPatterns.push(
              new RegExp(`metadata\\?\\.${nestedField}(?![a-zA-Z])`, 'g'),
              new RegExp(`\\.metadata\\.${nestedField}(?![a-zA-Z])`, 'g')
            );
          }

          for (const pattern of fieldPatterns) {
            if (pattern.test(content)) {
              const colMap = columnUsageCount.get(tableName)!;
              colMap.set(fieldName, (colMap.get(fieldName) || 0) + 1);
              break;
            }
          }
        }
      }
    }

    return { tableUsageCount, columnUsageCount };
  }

  /**
   * Run the full analysis
   */
  analyze(): SchemaUsageReport {
    this.logger.box('🔍 Convex Schema Usage Analysis');

    this.parseSchema();
    this.getAllFiles();

    const { tableUsageCount, columnUsageCount } = this.analyzeUsageInternal();

    // Build the report
    const tables: TableUsage[] = [];
    const unusedTables: string[] = [];
    const unusedFields: { table: string; field: string }[] = [];

    let totalFields = 0;
    let usedFields = 0;

    for (const [tableName, tableSchema] of this.tables.entries()) {
      const usageCount = tableUsageCount.get(tableName) || 0;
      const colMap = columnUsageCount.get(tableName)!;

      const fields: FieldUsage[] = [];

      for (const fieldName of tableSchema.fields) {
        totalFields++;
        const fieldUsageCount = colMap.get(fieldName) || 0;
        const used = fieldUsageCount > 0;

        if (used) {
          usedFields++;
        } else {
          unusedFields.push({ table: tableName, field: fieldName });
        }

        fields.push({
          field: fieldName,
          used,
          locations: [], // Not tracking specific locations for now
        });
      }

      const tableUsed = usageCount > 0;

      if (!tableUsed) {
        unusedTables.push(tableName);
      }

      tables.push({
        table: tableName,
        used: tableUsed,
        fields,
        usageCount,
      });
    }

    return {
      tables,
      unusedTables,
      unusedFields,
      summary: {
        totalTables: this.tables.size,
        usedTables: this.tables.size - unusedTables.length,
        totalFields,
        usedFields,
      },
    };
  }
}
