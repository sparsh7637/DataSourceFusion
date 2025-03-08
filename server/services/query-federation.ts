import { FirebaseService } from './firebase';
import { MongoDBService } from './mongodb';
import type { DataSource, SchemaMapping, Query } from '@shared/schema';
import { storage } from '../storage';

// This service handles query federation across multiple data sources
export class QueryFederationService {
  private firebaseService: FirebaseService;
  private mongoDBService: MongoDBService;
  private dataSources: Map<number, DataSource> = new Map();
  private mappings: Map<number, SchemaMapping> = new Map();
  private sourceServices: Map<number, FirebaseService | MongoDBService> = new Map();

  constructor() {
    this.firebaseService = new FirebaseService();
    this.mongoDBService = new MongoDBService();
    this.loadDataSources();
  }

  private async loadDataSources() {
    // Load all data sources from storage
    const sources = await storage.getDataSources();
    for (const source of sources) {
      this.dataSources.set(source.id, source);
      await this.connectToDataSource(source);
    }

    // Load all mappings
    const mappings = await storage.getSchemaMappings();
    for (const mapping of mappings) {
      this.mappings.set(mapping.id, mapping);
    }
  }

  private async connectToDataSource(dataSource: DataSource) {
    let service: FirebaseService | MongoDBService | null = null;

    if (dataSource.type === 'firebase') {
      service = this.firebaseService;
    } else if (dataSource.type === 'mongodb') {
      service = this.mongoDBService;
    }

    if (service) {
      const connected = await service.connect(dataSource);
      if (connected) {
        this.sourceServices.set(dataSource.id, service);
        // Update data source status if needed
        if (dataSource.status !== 'connected') {
          await storage.updateDataSource(dataSource.id, { status: 'connected' });
        }
      } else if (dataSource.status !== 'error') {
        await storage.updateDataSource(dataSource.id, { status: 'error' });
      }
    }
  }

  async addDataSource(dataSource: DataSource): Promise<boolean> {
    this.dataSources.set(dataSource.id, dataSource);
    return await this.connectToDataSource(dataSource);
  }

  async removeDataSource(dataSourceId: number): Promise<boolean> {
    const service = this.sourceServices.get(dataSourceId);
    if (service) {
      if (service instanceof FirebaseService || service instanceof MongoDBService) {
        await service.disconnect();
      }
      this.sourceServices.delete(dataSourceId);
    }
    this.dataSources.delete(dataSourceId);
    return true;
  }

  async addMapping(mapping: SchemaMapping): Promise<void> {
    this.mappings.set(mapping.id, mapping);
  }

  async removeMapping(mappingId: number): Promise<void> {
    this.mappings.delete(mappingId);
  }

  private async applyMapping(data: any[], mapping: SchemaMapping, direction: 'source-to-target' | 'target-to-source'): Promise<any[]> {
    const result = [];
    
    for (const item of data) {
      const mappedItem: any = {};
      
      for (const rule of mapping.mappingRules as any[]) {
        const { sourceField, targetField, type, transform } = rule;
        
        if (direction === 'source-to-target') {
          if (type === 'direct') {
            mappedItem[targetField] = item[sourceField];
          } else if (type === 'transform' && transform) {
            // Apply transformation based on transform type
            if (transform === 'convertTimestampToDate') {
              mappedItem[targetField] = new Date(item[sourceField]).toISOString();
            } else {
              // Default behavior if transform is unknown
              mappedItem[targetField] = item[sourceField];
            }
          } else if (type === 'custom') {
            // Custom mapping logic would go here
            // For demo, just copy the value
            mappedItem[targetField] = item[sourceField];
          }
        } else {
          // Target to source mapping
          if (type === 'direct') {
            mappedItem[sourceField] = item[targetField];
          } else if (type === 'transform' && transform) {
            // Apply reverse transformation
            if (transform === 'convertTimestampToDate') {
              mappedItem[sourceField] = new Date(item[targetField]).getTime();
            } else {
              mappedItem[sourceField] = item[targetField];
            }
          } else if (type === 'custom') {
            mappedItem[sourceField] = item[targetField];
          }
        }
      }
      
      result.push(mappedItem);
    }
    
    return result;
  }

  // Parse and execute a simplified query
  async executeQuery(query: Query, params?: Record<string, any>): Promise<any> {
    const start = Date.now();
    
    // For materialized or hybrid strategies, check if we have cached results
    if (query.federationStrategy !== 'virtual') {
      const cachedResult = await storage.getQueryResult(query.queryId || query.id);
      if (cachedResult) {
        // For hybrid, we'll check if the cache is fresh enough (e.g., < 15 min old)
        if (query.federationStrategy === 'hybrid') {
          const cacheAge = Date.now() - new Date(cachedResult.lastUpdated).getTime();
          // 15 minutes in milliseconds
          if (cacheAge < 15 * 60 * 1000) {
            return {
              results: cachedResult.results,
              executionTime: cachedResult.executionTime,
              cacheHit: true,
              lastUpdated: cachedResult.lastUpdated,
              nextUpdate: cachedResult.nextUpdate
            };
          }
          // Cache too old, continue to execute query
        } else if (query.federationStrategy === 'materialized') {
          // For materialized strategy, always use cache if available
          return {
            results: cachedResult.results,
            executionTime: cachedResult.executionTime,
            cacheHit: true,
            lastUpdated: cachedResult.lastUpdated,
            nextUpdate: cachedResult.nextUpdate
          };
        }
      }
    }
    
    // Parse query (simplified for demo)
    // In a real implementation, this would parse the SQL-like query
    // Here we'll just execute a demo query
    
    try {
      // For demo purposes, we'll join users, orders, and transactions
      // First, get users from Firebase
      const firebaseService = Array.from(this.sourceServices.values()).find(
        service => service instanceof FirebaseService
      ) as FirebaseService;
      
      // Get transactions from MongoDB
      const mongoDBService = Array.from(this.sourceServices.values()).find(
        service => service instanceof MongoDBService
      ) as MongoDBService;
      
      if (!firebaseService || !mongoDBService) {
        throw new Error('Required data sources not connected');
      }
      
      const users = await firebaseService.executeQuery('users', {});
      const orders = await firebaseService.executeQuery('orders', {});
      const transactions = await mongoDBService.executeQuery('transactions', {});
      
      // Join the data
      const results = [];
      
      for (const user of users) {
        const userOrders = orders.filter(order => order.userId === user.uid);
        
        for (const order of userOrders) {
          const transaction = transactions.find(t => t.orderId === order.orderId);
          
          if (transaction) {
            results.push({
              displayName: user.displayName,
              orderId: order.orderId,
              orderDate: order.orderDate,
              amount: transaction.amount,
              currency: transaction.currency
            });
          }
        }
      }
      
      // Filter by userId if provided in params
      const filteredResults = params?.userId 
        ? results.filter(r => users.some(u => u.uid === params.userId && u.displayName === r.displayName))
        : results;
      
      const executionTime = Date.now() - start;
      
      // For materialized or hybrid strategies, cache the results
      if (query.federationStrategy !== 'virtual' && query.id) {
        const existingResult = await storage.getQueryResult(query.id);
        
        // Calculate next update time based on strategy
        const nextUpdate = new Date();
        if (query.federationStrategy === 'materialized') {
          // Update materialized view every hour
          nextUpdate.setHours(nextUpdate.getHours() + 1);
        } else if (query.federationStrategy === 'hybrid') {
          // Update hybrid view every 15 minutes
          nextUpdate.setMinutes(nextUpdate.getMinutes() + 15);
        }
        
        if (existingResult) {
          await storage.updateQueryResult(existingResult.id, {
            results: filteredResults,
            executionTime,
            nextUpdate
          });
        } else {
          await storage.createQueryResult({
            queryId: query.id,
            results: filteredResults,
            executionTime,
            nextUpdate
          });
        }
      }
      
      return {
        results: filteredResults,
        executionTime,
        cacheHit: false,
        lastUpdated: new Date(),
        nextUpdate: null
      };
    } catch (error) {
      console.error('Error executing federated query:', error);
      throw error;
    }
  }

  async getSourceCollectionSchema(sourceId: number, collectionName: string): Promise<any> {
    const service = this.sourceServices.get(sourceId);
    if (!service) {
      throw new Error(`Data source ${sourceId} not connected`);
    }
    
    if (service instanceof FirebaseService || service instanceof MongoDBService) {
      return await service.getCollectionSchema(collectionName);
    }
    
    return null;
  }

  async validateQuery(query: string): Promise<any> {
    // In a real implementation, this would validate the query syntax
    // For demo purposes, we'll just return a success
    return { valid: true };
  }
}

// Create singleton instance
export const queryFederationService = new QueryFederationService();
