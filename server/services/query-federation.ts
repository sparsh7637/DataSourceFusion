import { FirebaseService } from "./firebase";
import { MongoDBService } from "./mongodb";
import type { DataSource, SchemaMapping, Query } from "@shared/schema";
import { storage } from "../storage";

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
