import { FirebaseService } from "./firebase";
import { MongoDBService } from "./mongodb";
import type { DataSource, SchemaMapping, Query } from "@shared/schema";
import { storage } from "../storage";
import { FileStorage, StoredCollection } from "./file-storage";
import { Firestore, WhereFilterOp } from "firebase-admin/firestore";

export class QueryFederationService {
  private firebaseService: FirebaseService;
  private mongoDBService: MongoDBService;
  private dataSources: Map<number, DataSource> = new Map();
  private mappings: Map<number, SchemaMapping> = new Map();
  private sourceServices: Map<number, FirebaseService | MongoDBService> = new Map();

  constructor() {
    this.firebaseService = new FirebaseService();
    this.mongoDBService = new MongoDBService();
    
    // Immediately load data sources on startup
    this.loadDataSources();
  }

  private async loadDataSources() {
    try {
      // Load data sources from storage
      const dataSources = await storage.getDataSources();
      const mappings = await storage.getSchemaMappings();
      
      // Store in memory for quick access
      for (const source of dataSources) {
        this.dataSources.set(source.id, source);
        await this.connectToDataSource(source);
      }
      
      for (const mapping of mappings) {
        this.mappings.set(mapping.id, mapping);
      }
      
      console.log(`Loaded ${this.dataSources.size} data sources and ${this.mappings.size} schema mappings`);
    } catch (error) {
      console.error("Error loading data sources:", error);
    }
  }

  private async connectToDataSource(dataSource: DataSource): Promise<boolean> {
    // Skip if already connected
    if (this.sourceServices.has(dataSource.id)) {
      return true;
    }
    
    try {
      if (dataSource.type === 'firebase') {
        const service = this.firebaseService;
        const success = await service.connect(dataSource);
        if (success) {
          this.sourceServices.set(dataSource.id, service);
          return true;
        }
      } else if (dataSource.type === 'mongodb') {
        const service = this.mongoDBService;
        const success = await service.connect(dataSource);
        if (success) {
          this.sourceServices.set(dataSource.id, service);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`Error connecting to data source ${dataSource.id}:`, error);
      return false;
    }
  }

  async addDataSource(dataSource: DataSource): Promise<boolean> {
    this.dataSources.set(dataSource.id, dataSource);
    return this.connectToDataSource(dataSource);
  }

  async removeDataSource(id: number): Promise<boolean> {
    const service = this.sourceServices.get(id);
    if (service && 'disconnect' in service && typeof service.disconnect === 'function') {
      await service.disconnect();
    }
    this.sourceServices.delete(id);
    return this.dataSources.delete(id);
  }

  async addMapping(mapping: SchemaMapping): Promise<void> {
    this.mappings.set(mapping.id, mapping);
  }

  async removeMapping(id: number): Promise<boolean> {
    return this.mappings.delete(id);
  }

  async getSourceCollectionSchema(sourceId: number, collectionName: string): Promise<{ name: string; type: string }[] | null> {
    try {
      // Try to get from temp file first
      const storedCollection = await FileStorage.getCollection(sourceId, collectionName);
      if (storedCollection) {
        return storedCollection.schema;
      }
      
      // Fallback to service if temp file doesn't exist
      const service = this.sourceServices.get(sourceId);
      if (!service) return null;
      
      if ('getCollectionSchema' in service && typeof service.getCollectionSchema === 'function') {
        const schema = await service.getCollectionSchema(collectionName);
        return Array.isArray(schema) ? schema : null;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting schema for collection ${collectionName} from source ${sourceId}:`, error);
      return null;
    }
  }

  async validateQuery(queryString: string): Promise<{ isValid: boolean; error?: string }> {
    // Basic validation for SQL-like syntax
    try {
      if (!queryString.trim()) {
        return { isValid: false, error: "Query cannot be empty" };
      }
      
      const uppercaseQuery = queryString.toUpperCase();
      
      if (!uppercaseQuery.includes('SELECT')) {
        return { isValid: false, error: "Query must include a SELECT statement" };
      }
      
      if (!uppercaseQuery.includes('FROM')) {
        return { isValid: false, error: "Query must include a FROM clause" };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: (error as Error).message };
    }
  }

  async executeQuery(query: Query, params?: any): Promise<{ results: any[]; executionTime: number }> {
    const startTime = Date.now();
    
    try {
      // Step 1: Parse the query to identify collections and operations
      const { collections, operations } = this.parseQuery(query.query);
      
      // Step 2: Fetch data from temp files
      const collectionsData = await this.fetchCollectionsData(
        Array.isArray(query.dataSources) ? query.dataSources : [], 
        collections
      );
      
      // Step 3: Apply schema mappings
      const mappedData = await this.applyMappings(collectionsData);
      
      // Step 4: Execute the query operations
      const results = this.executeQueryOperations(mappedData, operations, params);
      
      const executionTime = Date.now() - startTime;
      
      return {
        results,
        executionTime
      };
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
  }

  private parseQuery(queryString: string): { collections: string[]; operations: any } {
    // This is a simplified parser for demonstration
    // In a real implementation, you would use a proper SQL parser
    
    const collections: string[] = [];
    const operations: any = {
      select: [],
      joins: [],
      where: null,
      orderBy: null,
      limit: null
    };
    
    // Extract tables/collections from FROM and JOIN clauses
    const fromMatches = queryString.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (fromMatches && fromMatches[1]) {
      collections.push(fromMatches[1].toLowerCase());
    }
    
    const joinMatches = queryString.match(/JOIN\s+([a-zA-Z0-9_]+)/gi);
    if (joinMatches) {
      for (const match of joinMatches) {
        const tableName = match.replace(/JOIN\s+/i, '');
        if (tableName) {
          collections.push(tableName.toLowerCase());
        }
      }
    }
    
    // Extract SELECT fields
    const selectMatches = queryString.match(/SELECT\s+(.+?)\s+FROM/i);
    if (selectMatches && selectMatches[1]) {
      const fields = selectMatches[1].split(',').map(field => field.trim());
      operations.select = fields;
    }
    
    // Extract WHERE clause
    const whereMatches = queryString.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatches && whereMatches[1]) {
      operations.where = whereMatches[1].trim();
    }
    
    // Extract JOIN conditions
    const joinConditionMatches = queryString.match(/JOIN\s+([a-zA-Z0-9_]+)\s+ON\s+(.+?)(?:\s+JOIN|\s+WHERE|\s+ORDER\s+BY|\s+LIMIT|$)/gi);
    if (joinConditionMatches) {
      for (const match of joinConditionMatches) {
        const parts = match.match(/JOIN\s+([a-zA-Z0-9_]+)\s+ON\s+(.+)/i);
        if (parts && parts[1] && parts[2]) {
          operations.joins.push({
            table: parts[1].toLowerCase(),
            condition: parts[2].trim()
          });
        }
      }
    }
    
    // Extract ORDER BY
    const orderByMatches = queryString.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
    if (orderByMatches && orderByMatches[1]) {
      operations.orderBy = orderByMatches[1].trim();
    }
    
    // Extract LIMIT
    const limitMatches = queryString.match(/LIMIT\s+(\d+)/i);
    if (limitMatches && limitMatches[1]) {
      operations.limit = parseInt(limitMatches[1]);
    }
    
    return { collections, operations };
  }

  private async fetchCollectionsData(dataSourceIds: number[], collections: string[]): Promise<Map<string, any[]>> {
    const collectionsData = new Map<string, any[]>();
    
    for (const sourceId of dataSourceIds) {
      const source = this.dataSources.get(sourceId);
      if (!source) continue;
      
      const sourceCollections = await FileStorage.listCollections(sourceId);
      
      for (const collName of collections) {
        if (sourceCollections.includes(collName)) {
          const storedCollection = await FileStorage.getCollection(sourceId, collName);
          if (storedCollection) {
            collectionsData.set(collName, storedCollection.data);
          }
        }
      }
    }
    
    return collectionsData;
  }

  private async applyMappings(collectionsData: Map<string, any[]>): Promise<Map<string, any[]>> {
    const mappedData = new Map<string, any[]>(collectionsData);
    
    // Apply all active schema mappings
    for (const [_, mapping] of this.mappings.entries()) {
      if (mapping.status !== 'active') continue;
      
      const sourceData = collectionsData.get(mapping.sourceCollection);
      const targetData = collectionsData.get(mapping.targetCollection);
      
      if (sourceData && !targetData) {
        // Map source data to target format
        const mappedCollection = this.mapDataWithSchemaRules(
          sourceData, 
          mapping.mappingRules
        );
        
        mappedData.set(mapping.targetCollection, mappedCollection);
      }
    }
    
    return mappedData;
  }

  private mapDataWithSchemaRules(sourceData: any[], mappingRules: any[]): any[] {
    return sourceData.map(item => {
      const mappedItem: any = {};
      
      for (const rule of mappingRules) {
        const { sourceField, targetField, type, transform } = rule;
        
        if (!(sourceField in item)) continue;
        
        if (type === 'direct') {
          mappedItem[targetField] = item[sourceField];
        } else if (type === 'transform') {
          mappedItem[targetField] = this.applyTransform(
            item[sourceField], 
            transform
          );
        } else if (type === 'custom') {
          // For custom mappings, we'd need a more sophisticated approach
          mappedItem[targetField] = item[sourceField];
        }
      }
      
      return mappedItem;
    });
  }

  private applyTransform(value: any, transform: string): any {
    if (!transform) return value;
    
    switch (transform) {
      case 'convertTimestampToDate':
        if (value instanceof Date) return value;
        if (typeof value === 'string') return new Date(value);
        if (typeof value === 'number') return new Date(value);
        return value;
        
      case 'toUpperCase':
        return typeof value === 'string' ? value.toUpperCase() : value;
        
      case 'toLowerCase':
        return typeof value === 'string' ? value.toLowerCase() : value;
        
      default:
        return value;
    }
  }

  private executeQueryOperations(collectionsData: Map<string, any[]>, operations: any, params?: any): any[] {
    // This is a simplified implementation - a real one would use a SQL engine
    
    // First, get the main table from FROM clause
    const mainTable = operations.select[0]?.split('.')[0];
    const mainData = collectionsData.get(mainTable) || [];
    
    // Apply WHERE filtering
    let filteredData = mainData;
    if (operations.where) {
      filteredData = this.applyWhereFilters(filteredData, operations.where, params);
    }
    
    // Apply JOINs
    let joinedData = filteredData;
    if (operations.joins.length > 0) {
      joinedData = this.applyJoins(joinedData, operations.joins, collectionsData);
    }
    
    // Apply projection (SELECT fields)
    const projectedData = this.applyProjection(joinedData, operations.select);
    
    // Apply ORDER BY
    let orderedData = projectedData;
    if (operations.orderBy) {
      orderedData = this.applyOrderBy(projectedData, operations.orderBy);
    }
    
    // Apply LIMIT
    let limitedData = orderedData;
    if (operations.limit) {
      limitedData = orderedData.slice(0, operations.limit);
    }
    
    return limitedData;
  }

  private applyWhereFilters(data: any[], whereClause: string, params?: any): any[] {
    // Replace parameters in the where clause
    let processedWhereClause = whereClause;
    
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        const paramPlaceholder = `:${key}`;
        if (processedWhereClause.includes(paramPlaceholder)) {
          const valueStr = typeof value === 'string' ? `'${value}'` : value;
          processedWhereClause = processedWhereClause.replace(
            new RegExp(paramPlaceholder, 'g'), 
            String(valueStr)
          );
        }
      }
    }
    
    // This is a simplified parser for demonstration
    // Parse conditions like "field = value" or "field1 = field2"
    // In reality, we would need a proper expression evaluator
    
    // Handle basic equality conditions
    const equalityPattern = /([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.']+)/g;
    const conditions: {field: string; value: string}[] = [];
    
    let match;
    while ((match = equalityPattern.exec(processedWhereClause)) !== null) {
      const field = match[1].trim();
      const value = match[2].trim().replace(/^'|'$/g, ''); // Remove quotes if present
      conditions.push({ field, value });
    }
    
    return data.filter(item => {
      for (const condition of conditions) {
        const fieldParts = condition.field.split('.');
        const fieldName = fieldParts.length > 1 ? fieldParts[1] : fieldParts[0];
        
        // If the condition value starts with a letter, it's likely another field
        if (/^[a-zA-Z]/.test(condition.value) && !condition.value.startsWith("'")) {
          const valueFieldParts = condition.value.split('.');
          const valueFieldName = valueFieldParts.length > 1 ? valueFieldParts[1] : valueFieldParts[0];
          
          if (item[fieldName] !== item[valueFieldName]) {
            return false;
          }
        } else {
          // Direct value comparison
          if (item[fieldName] != condition.value) { // Using != for type coercion
            return false;
          }
        }
      }
      return true;
    });
  }

  private applyJoins(mainData: any[], joins: any[], collectionsData: Map<string, any[]>): any[] {
    let result = [...mainData];
    
    for (const join of joins) {
      const joinTable = join.table;
      const joinData = collectionsData.get(joinTable) || [];
      
      // Parse the JOIN condition
      const joinCondition = join.condition;
      const conditionMatch = joinCondition.match(/([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)/);
      
      if (!conditionMatch) continue;
      
      const leftParts = conditionMatch[1].split('.');
      const rightParts = conditionMatch[2].split('.');
      
      const leftTable = leftParts[0];
      const leftField = leftParts[1];
      const rightTable = rightParts[0];
      const rightField = rightParts[1];
      
      // Determine which is the main table and which is the join table
      let mainTableName, mainField, joinField;
      
      if (leftTable === joinTable) {
        mainTableName = rightTable;
        mainField = rightField;
        joinField = leftField;
      } else {
        mainTableName = leftTable;
        mainField = leftField;
        joinField = rightField;
      }
      
      // Perform the join
      const joinedResult: any[] = [];
      
      for (const mainItem of result) {
        const mainValue = mainItem[mainField];
        
        // Find matching items in the join table
        const matches = joinData.filter(joinItem => joinItem[joinField] === mainValue);
        
        if (matches.length > 0) {
          // For each match, create a combined record
          for (const match of matches) {
            const combined = { ...mainItem };
            
            // Add join table fields with table name prefix to avoid conflicts
            for (const [key, value] of Object.entries(match)) {
              combined[`${joinTable}.${key}`] = value;
            }
            
            joinedResult.push(combined);
          }
        } else {
          // No matches, keep main item unchanged (LEFT JOIN behavior)
          joinedResult.push(mainItem);
        }
      }
      
      result = joinedResult;
    }
    
    return result;
  }

  private applyProjection(data: any[], selectFields: string[]): any[] {
    if (selectFields.length === 0 || (selectFields.length === 1 && selectFields[0] === '*')) {
      return data;
    }
    
    return data.map(item => {
      const result: any = {};
      
      for (const field of selectFields) {
        const trimmedField = field.trim();
        
        if (trimmedField === '*') {
          Object.assign(result, item);
        } else {
          const fieldParts = trimmedField.split('.');
          
          if (fieldParts.length > 1) {
            // Field contains a table prefix
            const table = fieldParts[0];
            const field = fieldParts[1];
            const prefixedField = `${table}.${field}`;
            
            if (prefixedField in item) {
              result[prefixedField] = item[prefixedField];
            } else if (field in item) {
              // Fallback to field without prefix
              result[trimmedField] = item[field];
            }
          } else {
            // Direct field name
            if (trimmedField in item) {
              result[trimmedField] = item[trimmedField];
            }
          }
        }
      }
      
      return result;
    });
  }

  private applyOrderBy(data: any[], orderByClause: string): any[] {
    const orderParts = orderByClause.split(',');
    
    // Process each ordering field
    const orderingConfig = orderParts.map(part => {
      const trimmed = part.trim();
      
      if (trimmed.endsWith(' DESC') || trimmed.endsWith(' desc')) {
        return {
          field: trimmed.substr(0, trimmed.length - 5).trim(),
          direction: 'desc'
        };
      } else if (trimmed.endsWith(' ASC') || trimmed.endsWith(' asc')) {
        return {
          field: trimmed.substr(0, trimmed.length - 4).trim(),
          direction: 'asc'
        };
      } else {
        return {
          field: trimmed,
          direction: 'asc'
        };
      }
    });
    
    return [...data].sort((a, b) => {
      for (const config of orderingConfig) {
        const aValue = a[config.field];
        const bValue = b[config.field];
        
        if (aValue === bValue) continue;
        
        if (aValue === null || aValue === undefined) return config.direction === 'asc' ? -1 : 1;
        if (bValue === null || bValue === undefined) return config.direction === 'asc' ? 1 : -1;
        
        if (config.direction === 'asc') {
          return aValue < bValue ? -1 : 1;
        } else {
          return aValue > bValue ? -1 : 1;
        }
      }
      
      return 0;
    });
  }
}

export const queryFederationService = new QueryFederationService();