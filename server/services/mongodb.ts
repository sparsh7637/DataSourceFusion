import type { DataSource } from "@shared/schema";
import { MongoClient, Db } from "mongodb";
import { fileStorage } from "./file-storage";

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
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3b4",
        email: "charlie@example.com",
        name: "Charlie Brown",
        created: new Date("2023-05-05").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3b5",
        email: "david@example.com",
        name: "David Lee",
        created: new Date("2023-06-15").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3b6",
        email: "eve@example.com",
        name: "Eve Johnson",
        created: new Date("2023-07-20").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3b7",
        email: "frank@example.com",
        name: "Frank Miller",
        created: new Date("2023-08-10").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3b8",
        email: "grace@example.com",
        name: "Grace Hopper",
        created: new Date("2023-09-01").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3b9",
        email: "henry@example.com",
        name: "Henry Ford",
        created: new Date("2023-10-15").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3ba",
        email: "ivy@example.com",
        name: "Ivy League",
        created: new Date("2023-11-20").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3bb",
        email: "jack@example.com",
        name: "Jack Sparrow",
        created: new Date("2023-12-05").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3bc",
        email: "kate@example.com",
        name: "Kate Winslet",
        created: new Date("2024-01-10").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3bd",
        email: "leo@example.com",
        name: "Leo DiCaprio",
        created: new Date("2024-02-15").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3be",
        email: "mia@example.com",
        name: "Mia Wallace",
        created: new Date("2024-03-20").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3bf",
        email: "nate@example.com",
        name: "Nate Dogg",
        created: new Date("2024-04-10").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3c0",
        email: "olivia@example.com",
        name: "Olivia Rodrigo",
        created: new Date("2024-05-05").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3c1",
        email: "peter@example.com",
        name: "Peter Pan",
        created: new Date("2024-06-15").toISOString()
      },
      {
        _id: "5f8d0f3e1c9d440000a1f3c2",
        email: "quinn@example.com",
        name: "Quinn Mallory",
        created: new Date("2024-07-20").toISOString()
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
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e63",
        orderId: "ORD-12500",
        amount: 25.75,
        currency: "USD",
        timestamp: new Date("2023-07-01").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e64",
        orderId: "ORD-12600",
        amount: 150.00,
        currency: "USD",
        timestamp: new Date("2023-07-15").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e65",
        orderId: "ORD-12700",
        amount: 99.99,
        currency: "USD",
        timestamp: new Date("2023-07-29").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e66",
        orderId: "ORD-12800",
        amount: 39.50,
        currency: "USD",
        timestamp: new Date("2023-08-05").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e67",
        orderId: "ORD-12900",
        amount: 75.25,
        currency: "USD",
        timestamp: new Date("2023-08-12").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e68",
        orderId: "ORD-13000",
        amount: 110.00,
        currency: "USD",
        timestamp: new Date("2023-08-20").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e69",
        orderId: "ORD-13100",
        amount: 64.99,
        currency: "USD",
        timestamp: new Date("2023-08-28").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e6a",
        orderId: "ORD-13200",
        amount: 200.00,
        currency: "USD",
        timestamp: new Date("2023-09-05").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e6b",
        orderId: "ORD-13300",
        amount: 12.50,
        currency: "USD",
        timestamp: new Date("2023-09-12").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e6c",
        orderId: "ORD-13400",
        amount: 80.75,
        currency: "USD",
        timestamp: new Date("2023-09-20").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e6d",
        orderId: "ORD-13500",
        amount: 175.50,
        currency: "USD",
        timestamp: new Date("2023-09-27").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e6e",
        orderId: "ORD-13600",
        amount: 45.00,
        currency: "USD",
        timestamp: new Date("2023-10-04").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e6f",
        orderId: "ORD-13700",
        amount: 105.25,
        currency: "USD",
        timestamp: new Date("2023-10-11").toISOString()
      },
      {
        _id: "6a1b2c3d4e5f6a1b2c3d4e70",
        orderId: "ORD-13800",
        amount: 160.00,
        currency: "USD",
        timestamp: new Date("2023-10-18").toISOString()
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

          // Apply limit
          if (query.limit && typeof query.limit === 'number') {
            options.limit = query.limit;
          } else {
            options.limit = 20; // Default limit increased to 20
          }

          // Handle projection
          if (query.columns && Array.isArray(query.columns) && query.columns.length > 0) {
            options.projection = {};
            for (const column of query.columns) {
              options.projection[column] = 1;
            }
          } else if (query.selectedColumns && Array.isArray(query.selectedColumns) && 
                     query.selectedColumns.length > 0 && !query.selectedColumns.includes('*')) {
            options.projection = {};
            for (const column of query.selectedColumns) {
              options.projection[column] = 1;
            }
          }
        }

        // Execute the query
        const cursor = collection.find(filter, options);
        const results = await cursor.toArray();

        // Store results in temp file
        const timestamp = Date.now();
        const fileName = `mongodb_${collectionName}_${timestamp}`;
        await fileStorage.storeData(fileName, results);

        return results;
      } catch (error) {
        console.error(`Error executing query on collection ${collectionName}:`, error);
        console.log("Falling back to sample data due to error");
      }
    }

    // Fall back to sample data
    console.log("Using sample data for query execution");
    if (this.data.has(collectionName)) {
      let results = [...(this.data.get(collectionName) || [])];

      // Handle selected columns (projection)
      let selectedColumns = ['*'];
      if (query.columns && Array.isArray(query.columns) && query.columns.length > 0) {
        selectedColumns = query.columns;
      } else if (query.selectedColumns && Array.isArray(query.selectedColumns)) {
        selectedColumns = query.selectedColumns;
      }

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
                case 'like': 
                case 'contains':
                case 'array-contains':
                  if (typeof itemValue === 'string' && typeof filter.value === 'string') {
                    const pattern = filter.value.replace(/%/g, '.*');
                    return new RegExp(pattern).test(itemValue);
                  }
                  return false;
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

        // Apply projection (selected columns) if needed
        if (selectedColumns.length > 0 && !selectedColumns.includes('*')) {
          results = results.map(item => {
            const projectedItem: any = {};
            for (const column of selectedColumns) {
              if (item[column] !== undefined) {
                projectedItem[column] = item[column];
              }
            }
            return projectedItem;
          });
        }
      }

      // Store results in temp file
      const timestamp = Date.now();
      const fileName = `mongodb_${collectionName}_${timestamp}`;
      await fileStorage.storeData(fileName, results);

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
        case 'like':
        case 'contains':
        case 'array-contains':
          if (typeof filter.value === 'string') {
            // Convert SQL LIKE pattern to MongoDB regex
            const pattern = filter.value.replace(/%/g, '.*');
            result[filter.field] = { $regex: new RegExp(pattern, 'i') };
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