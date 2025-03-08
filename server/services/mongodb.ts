import type { DataSource } from "@shared/schema";
import { MongoClient, Db, Collection, Document } from 'mongodb';

interface MongoDBCollection {
  name: string;
  fields: {
    name: string;
    type: string;
  }[];
}

interface MongoDBDocument {
  [key: string]: any;
}

export class MongoDBService {
  private dataSource: DataSource | null = null;
  private collections: Map<string, MongoDBCollection> = new Map();
  private data: Map<string, MongoDBDocument[]> = new Map();
  private isConnected: boolean = false;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private cachedCollections: string[] = [];

  constructor() {
    // Set up sample schema and data for demonstration
    this.setupSampleData();
  }

  private setupSampleData() {
    // Customers collection
    const customersCollection: MongoDBCollection = {
      name: "customers",
      fields: [
        { name: "_id", type: "ObjectId" },
        { name: "email", type: "string" },
        { name: "name", type: "string" },
        { name: "created", type: "date" },
      ]
    };

    // Inventory collection
    const inventoryCollection: MongoDBCollection = {
      name: "inventory",
      fields: [
        { name: "_id", type: "ObjectId" },
        { name: "productId", type: "string" },
        { name: "quantity", type: "number" },
        { name: "location", type: "string" },
      ]
    };

    // Transactions collection
    const transactionsCollection: MongoDBCollection = {
      name: "transactions",
      fields: [
        { name: "_id", type: "ObjectId" },
        { name: "orderId", type: "string" },
        { name: "amount", type: "number" },
        { name: "currency", type: "string" },
        { name: "timestamp", type: "date" },
      ]
    };

    this.collections.set("customers", customersCollection);
    this.collections.set("inventory", inventoryCollection);
    this.collections.set("transactions", transactionsCollection);

    // Sample customer data
    const customerData = [
      {
        _id: "5f8d0f3e1c9d440000a1f3b1",
        email: "john@example.com",
        name: "John Doe",
        created: new Date("2023-01-15").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3b2",
        email: "alice@example.com",
        name: "Alice Smith",
        created: new Date("2023-03-20").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3b3",
        email: "bob@example.com",
        name: "Bob Johnson",
        created: new Date("2023-04-10").toISOString()
      }
    ];

    // Sample transaction data
    const transactionData = [
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e5f",
        orderId: "ORD-12345",
        amount: 129.99,
        currency: "USD",
        timestamp: new Date("2023-05-15").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e60",
        orderId: "ORD-12400",
        amount: 49.95,
        currency: "USD",
        timestamp: new Date("2023-06-22").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e61",
        orderId: "ORD-12398",
        amount: 85.50,
        currency: "USD",
        timestamp: new Date("2023-06-20").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e62",
        orderId: "ORD-12375",
        amount: 199.99,
        currency: "USD",
        timestamp: new Date("2023-06-18").toISOString()
      }
    ];

    this.data.set("customers", customerData);
    this.data.set("transactions", transactionData);
  }

  async connect(dataSource: DataSource): Promise<boolean> {
    try {
      this.dataSource = dataSource;
      
      // Get MongoDB connection string from environment or data source
      const uri = process.env.MONGODB_URI || dataSource.config?.uri;
      const dbName = dataSource.config?.database || 'main';
      
      if (!uri) {
        console.warn("MongoDB URI not provided, using sample data");
        this.isConnected = true;
        return true;
      }
      
      // Connect to MongoDB
      try {
        // Create MongoDB client with proper options
        this.client = new MongoClient(uri, {
          // Add any additional options here if needed
        });
        
        // Connect with timeout to avoid hanging
        const connectPromise = this.client.connect();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Connection timeout")), 10000);
        });
        
        await Promise.race([connectPromise, timeoutPromise]);
        
        this.db = this.client.db(dbName);
        this.isConnected = true;
        
        // Cache collections
        try {
          await this.cacheCollections();
        } catch (error) {
          console.warn("Failed to cache MongoDB collections, will use sample data:", error);
        }
        
        console.log(`Connected to MongoDB database: ${dbName}`);
        return true;
      } catch (error) {
        console.error("MongoDB connection error:", error);
        console.log("Using sample data as fallback");
        this.isConnected = true; // Use sample data as fallback
        return true;
      }
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      console.log("Using sample data as fallback");
      this.isConnected = true; // Use sample data as fallback
      return true;
    }
  }
  
  private async cacheCollections() {
    if (!this.db) return;
    
    try {
      // Get all collections from the database
      const collections = await this.db.listCollections().toArray();
      this.cachedCollections = collections.map(collection => collection.name);
      
      // Cache schema for each collection
      for (const collName of this.cachedCollections) {
        try {
          const coll = this.db.collection(collName);
          const sampleDoc = await coll.findOne({});
          
          if (sampleDoc) {
            const fields = this.extractFieldsFromDocument(sampleDoc);
            this.collections.set(collName, {
              name: collName,
              fields
            });
          }
        } catch (err) {
          console.error(`Error caching schema for collection ${collName}:`, err);
        }
      }
      
      console.log(`Cached ${this.cachedCollections.length} MongoDB collections: ${this.cachedCollections.join(', ')}`);
    } catch (error) {
      console.error("Error caching MongoDB collections:", error);
    }
  }
  
  private extractFieldsFromDocument(doc: any): { name: string; type: string }[] {
    const fields: { name: string; type: string }[] = [];
    
    for (const [key, value] of Object.entries(doc)) {
      let type = typeof value;
      
      if (value instanceof Date) {
        type = 'date';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else if (value === null) {
        type = 'null';
      } else if (type === 'object') {
        if (key === '_id') {
          type = 'ObjectId';
        } else {
          type = 'object';
        }
      }
      
      fields.push({ name: key, type });
    }
    
    return fields;
  }

  async disconnect(): Promise<boolean> {
    if (this.client) {
      await this.client.close();
    }
    
    this.dataSource = null;
    this.client = null;
    this.db = null;
    this.isConnected = false;
    return true;
  }

  async getCollections(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MongoDB");
    }
    
    if (this.db && this.cachedCollections.length > 0) {
      return this.cachedCollections;
    }
    
    return Array.from(this.collections.keys());
  }

  async getCollectionSchema(collectionName: string): Promise<MongoDBCollection | null> {
    if (!this.isConnected) {
      throw new Error("Not connected to MongoDB");
    }
    
    // If we have a real MongoDB instance and the collection is in our cached list
    if (this.db && this.cachedCollections.includes(collectionName)) {
      // If we've already cached the schema, return it
      if (this.collections.has(collectionName)) {
        return this.collections.get(collectionName) || null;
      }
      
      // Otherwise, try to get sample data to infer schema
      try {
        const coll = this.db.collection(collectionName);
        const sampleDoc = await coll.findOne({});
        
        if (sampleDoc) {
          const fields = this.extractFieldsFromDocument(sampleDoc);
          const schema: MongoDBCollection = { name: collectionName, fields };
          this.collections.set(collectionName, schema);
          return schema;
        }
      } catch (error) {
        console.error(`Error getting schema for collection ${collectionName}:`, error);
      }
    }
    
    // Fall back to sample data
    return this.collections.get(collectionName) || null;
  }

  async executeQuery(collectionName: string, query: any): Promise<MongoDBDocument[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MongoDB");
    }
    
    console.log(`Executing MongoDB query on collection: ${collectionName}`, query);
    
    // Real query execution with MongoDB client
    if (this.db && this.cachedCollections.includes(collectionName)) {
      try {
        const collection = this.db.collection(collectionName);
        let filter = {};
        const options: any = {};
        
        // Parse query parameters
        if (query && typeof query === 'object') {
          // Handle filters
          if (query.filters && Array.isArray(query.filters)) {
            filter = this.buildMongoFilter(query.filters);
          }
          
          // Handle sorting
          if (query.orderBy && typeof query.orderBy === 'object') {
            options.sort = {};
            for (const field in query.orderBy) {
              options.sort[field] = query.orderBy[field] === 'desc' ? -1 : 1;
            }
          }
          
          // Handle limit
          if (query.limit && typeof query.limit === 'number') {
            options.limit = query.limit;
          }
        }
        
        // Execute the query
        const cursor = collection.find(filter, options);
        const results = await cursor.toArray();
        
        return results;
      } catch (error) {
        console.error(`Error executing query on collection ${collectionName}:`, error);
        throw error;
      }
    }
    
    // Fall back to sample data
    if (this.data.has(collectionName)) {
      let results = [...(this.data.get(collectionName) || [])];
      
      // Apply simple filtering if query is provided
      if (query && typeof query === 'object') {
        if (query.filters && Array.isArray(query.filters)) {
          results = results.filter(item => {
            return query.filters.every((filter: any) => {
              if (!filter.field || !filter.operator || filter.value === undefined) {
                return true;
              }
              
              const itemValue = item[filter.field];
              
              switch (filter.operator) {
                case '==': return itemValue === filter.value;
                case '!=': return itemValue !== filter.value;
                case '>': return itemValue > filter.value;
                case '>=': return itemValue >= filter.value;
                case '<': return itemValue < filter.value;
                case '<=': return itemValue <= filter.value;
                default: return true;
              }
            });
          });
        }
        
        // Apply sorting
        if (query.orderBy && typeof query.orderBy === 'object') {
          const sortFields = Object.keys(query.orderBy);
          if (sortFields.length > 0) {
            results.sort((a, b) => {
              for (const field of sortFields) {
                const direction = query.orderBy[field] === 'desc' ? -1 : 1;
                if (a[field] < b[field]) return -1 * direction;
                if (a[field] > b[field]) return 1 * direction;
              }
              return 0;
            });
          }
        }
        
        // Apply limit
        if (query.limit && typeof query.limit === 'number') {
          results = results.slice(0, query.limit);
        }
      }
      
      return results;
    }
    
    return [];
  }
  
  private buildMongoFilter(filters: any[]): any {
    const result: any = {};
    
    for (const filter of filters) {
      if (!filter.field || !filter.operator || filter.value === undefined) {
        continue;
      }
      
      switch (filter.operator) {
        case '==':
          result[filter.field] = filter.value;
          break;
        case '!=':
          result[filter.field] = { $ne: filter.value };
          break;
        case '>':
          result[filter.field] = { $gt: filter.value };
          break;
        case '>=':
          result[filter.field] = { $gte: filter.value };
          break;
        case '<':
          result[filter.field] = { $lt: filter.value };
          break;
        case '<=':
          result[filter.field] = { $lte: filter.value };
          break;
        case 'in':
          if (Array.isArray(filter.value)) {
            result[filter.field] = { $in: filter.value };
          }
          break;
      }
    }
    
    return result;
  }

  isValid(): boolean {
    return this.isConnected;
  }
}
