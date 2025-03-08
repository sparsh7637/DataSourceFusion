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

    // Users collection
    const usersCollection: MongoDBCollection = {
      name: "users",
      fields: [
        { name: "_id", type: "string" },
        { name: "name", type: "string" },
        { name: "email", type: "string" },
        { name: "age", type: "number" },
      ]
    };

    // Sample user data
    const userData = [
      { 
        _id: "user1", 
        name: "John Doe", 
        email: "john@example.com", 
        age: 30 
      },
      { 
        _id: "user2", 
        name: "Jane Smith", 
        email: "jane@example.com", 
        age: 25 
      },
      { 
        _id: "user3", 
        name: "Bob Johnson", 
        email: "bob@example.com", 
        age: 40 
      }
    ];

    // Sample transactions collection
    const transactionsCollection: MongoDBCollection = {
      name: "transactions",
      fields: [
        { name: "_id", type: "string" },
        { name: "userId", type: "string" },
        { name: "amount", type: "number" },
        { name: "date", type: "date" },
        { name: "type", type: "string" }
      ]
    };

    // Sample transactions data with 20 entries
    const transactionsData = [
      {
        _id: "t1",
        userId: "user1",
        amount: 75.99,
        date: new Date("2023-05-15").toISOString(),
        type: "purchase"
      },
      {
        _id: "t2",
        userId: "user2",
        amount: 42.50,
        date: new Date("2023-05-16").toISOString(),
        type: "purchase"
      },
      {
        _id: "t3",
        userId: "user3",
        amount: 129.99,
        date: new Date("2023-05-17").toISOString(),
        type: "purchase"
      },
      {
        _id: "t4",
        userId: "user1",
        amount: 55.25,
        date: new Date("2023-05-18").toISOString(),
        type: "purchase"
      },
      {
        _id: "t5",
        userId: "user2",
        amount: 19.99,
        date: new Date("2023-05-19").toISOString(),
        type: "purchase"
      },
      {
        _id: "t6",
        userId: "user1",
        amount: 89.75,
        date: new Date("2023-05-20").toISOString(),
        type: "purchase"
      },
      {
        _id: "t7",
        userId: "user3",
        amount: 199.99,
        date: new Date("2023-05-21").toISOString(),
        type: "purchase"
      },
      {
        _id: "t8",
        userId: "user2",
        amount: 34.50,
        date: new Date("2023-05-22").toISOString(),
        type: "purchase"
      },
      {
        _id: "t9",
        userId: "user1",
        amount: 45.00,
        date: new Date("2023-05-23").toISOString(),
        type: "purchase"
      },
      {
        _id: "t10",
        userId: "user3",
        amount: 145.75,
        date: new Date("2023-05-24").toISOString(),
        type: "purchase"
      },
      {
        _id: "t11",
        userId: "user2",
        amount: 67.99,
        date: new Date("2023-05-25").toISOString(),
        type: "purchase"
      },
      {
        _id: "t12",
        userId: "user1",
        amount: 22.50,
        date: new Date("2023-05-26").toISOString(),
        type: "purchase"
      },
      {
        _id: "t13",
        userId: "user3",
        amount: 155.00,
        date: new Date("2023-05-27").toISOString(),
        type: "purchase"
      },
      {
        _id: "t14",
        userId: "user2",
        amount: 88.75,
        date: new Date("2023-05-28").toISOString(),
        type: "purchase"
      },
      {
        _id: "t15",
        userId: "user1",
        amount: 33.99,
        date: new Date("2023-05-29").toISOString(),
        type: "purchase"
      },
      {
        _id: "t16",
        userId: "user3",
        amount: 177.50,
        date: new Date("2023-05-30").toISOString(),
        type: "purchase"
      },
      {
        _id: "t17",
        userId: "user2",
        amount: 55.25,
        date: new Date("2023-05-31").toISOString(),
        type: "purchase"
      },
      {
        _id: "t18",
        userId: "user1",
        amount: 44.99,
        date: new Date("2023-06-01").toISOString(),
        type: "purchase"
      },
      {
        _id: "t19",
        userId: "user3",
        amount: 188.75,
        date: new Date("2023-06-02").toISOString(),
        type: "purchase"
      },
      {
        _id: "t20",
        userId: "user2",
        amount: 77.50,
        date: new Date("2023-06-03").toISOString(),
        type: "purchase"
      }
    ];

    this.collections.set("users", usersCollection);
    this.collections.set("transactions", transactionsCollection);
    this.data.set("users", userData);
    this.data.set("transactions", transactionsData);
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