import { FirebaseService } from "./firebase";
import { MongoDBService } from "./mongodb";
import type { DataSource, SchemaMapping, Query } from "@shared/schema";
import { storage } from "../storage";
import { FileStorage, StoredCollection } from "./file-storage";

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
      // Get all data sources
      const sources = await storage.getDataSources();
      for (const source of sources) {
        this.dataSources.set(source.id, source);
        await this.connectToDataSource(source);
      }
      
      // Get all mappings
      const mappings = await storage.getSchemaMappings();
      for (const mapping of mappings) {
        this.mappings.set(mapping.id, mapping);
      }
      
      console.log(`Loaded ${this.dataSources.size} data sources and ${this.mappings.size} schema mappings`);
    } catch (error) {
      console.error("Error loading data sources:", error);
    }
  }

  private async connectToDataSource(dataSource: DataSource) {
    // Skip if already connected
    if (this.sourceServices.has(dataSource.id)) {
      return true;
    }
    
    try {

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

  private async connectToDataSource(dataSource: DataSource): Promise<boolean> {
    try {
      let service;

      if (dataSource.type === 'firebase') {
        service = this.firebaseService;
      } else if (dataSource.type === 'mongodb') {
        service = this.mongoDBService;
      } else {
        throw new Error(`Unsupported data source type: ${dataSource.type}`);
      }

      const connected = await service.connect(dataSource);
      if (connected) {
        this.sourceServices.set(dataSource.id, service);
      }

      return connected;
    } catch (error) {
      console.error(`Error connecting to data source ${dataSource.id}:`, error);
      return false;
    }
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
        return service.getCollectionSchema(collectionName);
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
      const collectionsData = await this.fetchCollectionsData(query.dataSources, collections);
      
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
    
    const joinMatches = queryString.matchAll(/JOIN\s+([a-zA-Z0-9_]+)/gi);
    for (const match of joinMatches) {
      if (match[1]) {
        collections.push(match[1].toLowerCase());
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
    const joinConditionMatches = queryString.matchAll(/JOIN\s+([a-zA-Z0-9_]+)\s+ON\s+(.+?)(?:\s+JOIN|\s+WHERE|\s+ORDER\s+BY|\s+LIMIT|$)/gi);
    for (const match of joinConditionMatches) {
      if (match[1] && match[2]) {
        operations.joins.push({
          table: match[1].toLowerCase(),
          condition: match[2].trim()
        });
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
    for (const mapping of this.mappings.values()) {
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
            // Handle table.field format
            const tableName = fieldParts[0];
            const fieldName = fieldParts[1];
            
            // Check for the field with table prefix
            const prefixedKey = `${tableName}.${fieldName}`;
            if (prefixedKey in item) {
              result[fieldName] = item[prefixedKey];
            } else if (fieldName in item) {
              result[fieldName] = item[fieldName];
            }
          } else {
            // Direct field access
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

      if (dataSource.type === 'firebase') {
        const service = new FirebaseService();
        const success = await service.connect(dataSource);
        if (success) {
          this.sourceServices.set(dataSource.id, service);
          return true;
        }
      } else if (dataSource.type === 'mongodb') {
        const service = new MongoDBService();
        const success = await service.connect(dataSource);
        if (success) {
          this.sourceServices.set(dataSource.id, service);
          return true;
        }
      }
    } catch (error) {
      console.error(`Error connecting to data source ${dataSource.id}:`, error);
    }
    
    return false;
  }

  async addDataSource(dataSource: DataSource): Promise<boolean> {
    try {
      // Store in our internal map
      this.dataSources.set(dataSource.id, dataSource);
      
      // Connect to the data source
      return await this.connectToDataSource(dataSource);
    } catch (error) {
      console.error(`Error adding data source ${dataSource.id}:`, error);
      return false;
    }
  }

  async removeDataSource(dataSourceId: number): Promise<boolean> {
    try {
      // Get the service if it exists
      const service = this.sourceServices.get(dataSourceId);
      if (service) {
        await service.disconnect();
        this.sourceServices.delete(dataSourceId);
      }
      
      // Remove from internal map
      this.dataSources.delete(dataSourceId);
      
      return true;
    } catch (error) {
      console.error(`Error removing data source ${dataSourceId}:`, error);
      return false;
    }
  }

  async addMapping(mapping: SchemaMapping): Promise<void> {
    this.mappings.set(mapping.id, mapping);
  }

  async removeMapping(mappingId: number): Promise<void> {
    this.mappings.delete(mappingId);
  }

  private async applyMapping(data: any[], mapping: SchemaMapping, direction: 'source-to-target' | 'target-to-source'): Promise<any[]> {
    // If no mapping rules, return the data as is
    if (!mapping.mappingRules || !Array.isArray(mapping.mappingRules) || mapping.mappingRules.length === 0) {
      return data;
    }
    
    const result = [];
    
    for (const item of data) {
      const mappedItem: any = {};
      
      for (const rule of mapping.mappingRules) {
        if (direction === 'source-to-target') {
          // Map from source field to target field
          if (item[rule.sourceField] !== undefined) {
            let value = item[rule.sourceField];
            
            // Apply transformation if needed
            if (rule.type === 'transform') {
              value = this.applyTransformation(value, rule.transform);
            }
            
            mappedItem[rule.targetField] = value;
          }
        } else {
          // Map from target field to source field
          if (item[rule.targetField] !== undefined) {
            let value = item[rule.targetField];
            
            // Apply transformation if needed (in reverse)
            if (rule.type === 'transform') {
              value = this.applyReverseTransformation(value, rule.transform);
            }
            
            mappedItem[rule.sourceField] = value;
          }
        }
      }
      
      result.push(mappedItem);
    }
    
    return result;
  }
  
  private applyTransformation(value: any, transform: string): any {
    // If no transform is specified, return the value as is
    if (!transform) return value;
    
    try {
      switch (transform) {
        case 'uppercase':
          return typeof value === 'string' ? value.toUpperCase() : value;
          
        case 'lowercase':
          return typeof value === 'string' ? value.toLowerCase() : value;
          
        case 'trim':
          return typeof value === 'string' ? value.trim() : value;
          
        case 'to-number':
          return typeof value === 'string' ? Number(value) : value;
          
        case 'to-string':
          return value !== null && value !== undefined ? String(value) : value;
          
        case 'to-date':
          return value !== null && value !== undefined ? new Date(value) : value;
          
        default:
          return value;
      }
    } catch (error) {
      console.error(`Error applying transformation ${transform}:`, error);
      return value;
    }
  }
  
  private applyReverseTransformation(value: any, transform: string): any {
    // For simple transformations, we can just return the value
    return value;
  }

  async executeQuery(query: Query, params?: Record<string, any>): Promise<any> {
    try {
      console.log(`Executing query: ${query.name}`);
      const startTime = Date.now();
      
      // Validate that the data sources exist
      if (!query.dataSources || !Array.isArray(query.dataSources) || query.dataSources.length === 0) {
        throw new Error("No data sources specified for query");
      }
      
      // Make sure all data sources are connected
      for (const sourceId of query.dataSources) {
        const dataSource = this.dataSources.get(sourceId);
        if (!dataSource) {
          throw new Error(`Data source ${sourceId} not found`);
        }
        
        // Connect if not already connected
        if (!this.sourceServices.has(sourceId)) {
          const success = await this.connectToDataSource(dataSource);
          if (!success) {
            throw new Error(`Failed to connect to data source ${sourceId}`);
          }
        }
      }
      
      // Parse and execute the query
      // For this example, we'll use a simplified query format
      // In a real system, you'd have a proper query language parser
      
      // For now, we'll just support simple collection-based queries with filters
      const queryResults: Record<string, any[]> = {};
      
      // Extract parameters from the SQL-like query string
      // This is a simplified parsing logic
      const collectionMatches = query.query.match(/FROM\s+([a-zA-Z0-9_.]+)/i);
      const whereMatches = query.query.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/is);
      const limitMatches = query.query.match(/LIMIT\s+(\d+)/i);
      const orderByMatches = query.query.match(/ORDER BY\s+(.+?)(?:WHERE|GROUP BY|LIMIT|$)/is);
      
      if (collectionMatches) {
        // Each source should potentially have this collection
        for (const sourceId of query.dataSources) {
          const service = this.sourceServices.get(sourceId);
          if (!service) continue;
          
          const collectionName = collectionMatches[1].trim();
          
          // Prepare query parameters
          const queryParams: any = {};
          
          // Parse WHERE conditions
          if (whereMatches) {
            queryParams.filters = this.parseWhereConditions(whereMatches[1], params || {});
          }
          
          // Parse LIMIT
          if (limitMatches) {
            queryParams.limit = parseInt(limitMatches[1], 10);
          }
          
          // Parse ORDER BY
          if (orderByMatches) {
            queryParams.orderBy = this.parseOrderBy(orderByMatches[1]);
          }
          
          // Execute the query against this data source
          try {
            const results = await service.executeQuery(collectionName, queryParams);
            queryResults[sourceId] = results;
          } catch (error) {
            console.error(`Error executing query on source ${sourceId}:`, error);
            queryResults[sourceId] = [];
          }
        }
      }
      
      // Apply schema mappings if defined
      let combinedResults = this.combineResults(queryResults, query);
      
      // Apply any federation strategy-specific logic
      if (query.federationStrategy === 'materialized') {
        // For materialized view, we would normally save the results to a cache
        console.log('Using materialized view strategy - results would be cached');
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        results: combinedResults,
        executionTime,
        lastUpdated: new Date().toISOString(),
        nextUpdate: query.federationStrategy === 'materialized' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
        cacheHit: false,
      };
    } catch (error) {
      console.error("Error executing federated query:", error);
      throw error;
    }
  }
  
  private parseWhereConditions(whereClause: string, params: Record<string, any>): any[] {
    const filters = [];
    
    // Looking for patterns like field = value, field > value, etc.
    // This is a very simplified parser for demonstration
    
    // Split by AND (we're not handling OR for simplicity)
    const conditions = whereClause.split(/\bAND\b/i);
    
    for (const condition of conditions) {
      // Match different operator patterns
      const operatorMatch = condition.match(/\s*([a-zA-Z0-9_.]+)\s*(=|!=|>|>=|<|<=|LIKE|IN)\s*(.+)/i);
      
      if (operatorMatch) {
        const [, field, op, valueStr] = operatorMatch;
        let operator: string;
        let value: any;
        
        // Convert SQL operators to our internal format
        switch (op.toUpperCase()) {
          case '=': operator = '=='; break;
          case '!=': operator = '!='; break;
          case '>': operator = '>'; break;
          case '>=': operator = '>='; break;
          case '<': operator = '<'; break;
          case '<=': operator = '<='; break;
          case 'LIKE': operator = 'array-contains'; break;
          case 'IN': operator = 'in'; break;
          default: operator = '==';
        }
        
        // Process the value
        const trimmedValueStr = valueStr.trim();
        
        // Check if it's a parameter reference
        if (trimmedValueStr.startsWith(':')) {
          const paramName = trimmedValueStr.substring(1);
          if (params && params[paramName] !== undefined) {
            value = params[paramName];
          } else {
            console.warn(`Parameter ${paramName} not provided`);
            continue;
          }
        } 
        // Check if it's a string literal
        else if (trimmedValueStr.match(/^['"].*['"]$/)) {
          value = trimmedValueStr.substring(1, trimmedValueStr.length - 1);
        } 
        // Check if it's a number
        else if (!isNaN(Number(trimmedValueStr))) {
          value = Number(trimmedValueStr);
        } 
        // Otherwise treat as an unknown value type
        else {
          value = trimmedValueStr;
        }
        
        filters.push({ field: field.trim(), operator, value });
      }
    }
    
    return filters;
  }
  
  private parseOrderBy(orderByClause: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    // Split by commas for multiple order by fields
    const parts = orderByClause.split(',');
    
    for (const part of parts) {
      const match = part.trim().match(/([a-zA-Z0-9_.]+)(?:\s+(ASC|DESC))?/i);
      
      if (match) {
        const [, field, direction] = match;
        result[field.trim()] = direction?.toUpperCase() === 'DESC' ? 'desc' : 'asc';
      }
    }
    
    return result;
  }
  
  private combineResults(resultsMap: Record<string, any[]>, query: Query): any[] {
    // Combine results from multiple data sources
    const allResults: any[] = [];
    
    for (const sourceId in resultsMap) {
      const sourceResults = resultsMap[sourceId];
      
      // Add source information to each result
      const annotatedResults = sourceResults.map(item => ({
        ...item,
        __source: sourceId
      }));
      
      allResults.push(...annotatedResults);
    }
    
    // Sort the combined results if necessary
    const orderByMatches = query.query.match(/ORDER BY\s+(.+?)(?:WHERE|GROUP BY|LIMIT|$)/is);
    if (orderByMatches) {
      const orderBy = this.parseOrderBy(orderByMatches[1]);
      
      if (Object.keys(orderBy).length > 0) {
        allResults.sort((a, b) => {
          for (const field in orderBy) {
            const direction = orderBy[field] === 'desc' ? -1 : 1;
            
            if (a[field] < b[field]) return -1 * direction;
            if (a[field] > b[field]) return 1 * direction;
          }
          
          return 0;
        });
      }
    }
    
    // Apply limit if specified
    const limitMatches = query.query.match(/LIMIT\s+(\d+)/i);
    if (limitMatches) {
      const limit = parseInt(limitMatches[1], 10);
      return allResults.slice(0, limit);
    }
    
    return allResults;
  }

  async getSourceCollectionSchema(sourceId: number, collectionName: string): Promise<any> {
    const service = this.sourceServices.get(sourceId);
    if (!service) {
      throw new Error(`Data source ${sourceId} not connected`);
    }
    
    return await service.getCollectionSchema(collectionName);
  }

  async validateQuery(query: string): Promise<any> {
    // Simplified query validator
    try {
      // Check for basic SQL syntax
      if (!query.match(/SELECT/i)) {
        return { isValid: false, error: "Query must start with SELECT" };
      }
      
      if (!query.match(/FROM/i)) {
        return { isValid: false, error: "Query must include FROM clause" };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: (error as Error).message };
    }
  }
}

export const queryFederationService = new QueryFederationService();
