import {
  User, InsertUser, users,
  DataSource, InsertDataSource, dataSources,
  SchemaMapping, InsertSchemaMapping, schemaMappings,
  Query, InsertQuery, queries,
  QueryResult, InsertQueryResult, queryResults
} from "@shared/schema";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Data Source operations
  getDataSources(): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  createDataSource(dataSource: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, dataSource: Partial<DataSource>): Promise<DataSource | undefined>;
  deleteDataSource(id: number): Promise<boolean>;

  // Schema Mapping operations
  getSchemaMappings(): Promise<SchemaMapping[]>;
  getSchemaMapping(id: number): Promise<SchemaMapping | undefined>;
  createSchemaMapping(schemaMapping: InsertSchemaMapping): Promise<SchemaMapping>;
  updateSchemaMapping(id: number, schemaMapping: Partial<SchemaMapping>): Promise<SchemaMapping | undefined>;
  deleteSchemaMapping(id: number): Promise<boolean>;

  // Query operations
  getQueries(): Promise<Query[]>;
  getQuery(id: number): Promise<Query | undefined>;
  createQuery(query: InsertQuery): Promise<Query>;
  updateQuery(id: number, query: Partial<Query>): Promise<Query | undefined>;
  deleteQuery(id: number): Promise<boolean>;

  // Query Result operations
  getQueryResult(queryId: number): Promise<QueryResult | undefined>;
  createQueryResult(queryResult: InsertQueryResult): Promise<QueryResult>;
  updateQueryResult(id: number, queryResult: Partial<QueryResult>): Promise<QueryResult | undefined>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private dataSourcesMap: Map<number, DataSource>;
  private schemaMappingsMap: Map<number, SchemaMapping>;
  private queriesMap: Map<number, Query>;
  private queryResultsMap: Map<number, QueryResult>;
  private currentUserId: number;
  private currentDataSourceId: number;
  private currentSchemaMappingId: number;
  private currentQueryId: number;
  private currentQueryResultId: number;

  constructor() {
    this.users = new Map();
    this.dataSourcesMap = new Map();
    this.schemaMappingsMap = new Map();
    this.queriesMap = new Map();
    this.queryResultsMap = new Map();
    this.currentUserId = 1;
    this.currentDataSourceId = 1;
    this.currentSchemaMappingId = 1;
    this.currentQueryId = 1;
    this.currentQueryResultId = 1;

    // Initialize with sample data for demo purposes
    this.initializeData();
  }

  private initializeData() {
    // Create sample data sources
    const firebaseSource: InsertDataSource = {
      name: "Firebase",
      type: "firebase",
      config: {
        projectId: "myapp-12345",
      },
      collections: ["users", "products", "orders"],
      status: "connected",
    };

    const mongoSource: InsertDataSource = {
      name: "MongoDB",
      type: "mongodb",
      config: {
        uri: "mongodb+srv://user:password@cluster0.example.net",
        database: "myapp",
      },
      collections: ["customers", "inventory", "transactions"],
      status: "connected",
    };

    this.createDataSource(firebaseSource);
    this.createDataSource(mongoSource);

    // Create sample schema mapping
    const sampleMapping: InsertSchemaMapping = {
      name: "User Data Integration",
      sourceId: 1, // Firebase
      sourceCollection: "users",
      targetId: 2, // MongoDB
      targetCollection: "customers",
      mappingRules: [
        {
          sourceField: "uid",
          targetField: "_id",
          type: "custom",
        },
        {
          sourceField: "email",
          targetField: "email",
          type: "direct",
        },
        {
          sourceField: "displayName",
          targetField: "name",
          type: "direct",
        },
        {
          sourceField: "createdAt",
          targetField: "created",
          type: "transform",
          transform: "convertTimestampToDate",
        },
      ],
      status: "active",
    };

    this.createSchemaMapping(sampleMapping);

    // Create sample query
    const sampleQuery: InsertQuery = {
      name: "User Purchase History",
      query: "SELECT u.displayName, o.orderId, o.orderDate, t.amount, t.currency FROM users u JOIN orders o ON u.uid = o.userId JOIN transactions t ON o.orderId = t.orderId WHERE u.uid = :userId",
      dataSources: [1, 2],
      collections: ["users", "orders", "transactions"],
      federationStrategy: "materialized",
    };

    this.createQuery(sampleQuery);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Data Source operations
  async getDataSources(): Promise<DataSource[]> {
    return Array.from(this.dataSourcesMap.values());
  }

  async getDataSource(id: number): Promise<DataSource | undefined> {
    return this.dataSourcesMap.get(id);
  }

  async createDataSource(dataSource: InsertDataSource): Promise<DataSource> {
    const id = this.currentDataSourceId++;
    const createdAt = new Date();
    const updatedAt = createdAt;
    const newDataSource: DataSource = { ...dataSource, id, createdAt, updatedAt };
    this.dataSourcesMap.set(id, newDataSource);
    return newDataSource;
  }

  async updateDataSource(id: number, dataSource: Partial<DataSource>): Promise<DataSource | undefined> {
    const existingDataSource = this.dataSourcesMap.get(id);
    if (!existingDataSource) return undefined;

    const updatedDataSource: DataSource = {
      ...existingDataSource,
      ...dataSource,
      updatedAt: new Date(),
    };
    this.dataSourcesMap.set(id, updatedDataSource);
    return updatedDataSource;
  }

  async deleteDataSource(id: number): Promise<boolean> {
    return this.dataSourcesMap.delete(id);
  }

  // Schema Mapping operations
  async getSchemaMappings(): Promise<SchemaMapping[]> {
    return Array.from(this.schemaMappingsMap.values());
  }

  async getSchemaMapping(id: number): Promise<SchemaMapping | undefined> {
    return this.schemaMappingsMap.get(id);
  }

  async createSchemaMapping(schemaMapping: InsertSchemaMapping): Promise<SchemaMapping> {
    const id = this.currentSchemaMappingId++;
    const createdAt = new Date();
    const updatedAt = createdAt;
    const newSchemaMapping: SchemaMapping = { ...schemaMapping, id, createdAt, updatedAt };
    this.schemaMappingsMap.set(id, newSchemaMapping);
    return newSchemaMapping;
  }

  async updateSchemaMapping(id: number, schemaMapping: Partial<SchemaMapping>): Promise<SchemaMapping | undefined> {
    const existingSchemaMapping = this.schemaMappingsMap.get(id);
    if (!existingSchemaMapping) return undefined;

    const updatedSchemaMapping: SchemaMapping = {
      ...existingSchemaMapping,
      ...schemaMapping,
      updatedAt: new Date(),
    };
    this.schemaMappingsMap.set(id, updatedSchemaMapping);
    return updatedSchemaMapping;
  }

  async deleteSchemaMapping(id: number): Promise<boolean> {
    return this.schemaMappingsMap.delete(id);
  }

  // Query operations
  async getQueries(): Promise<Query[]> {
    return Array.from(this.queriesMap.values());
  }

  async getQuery(id: number): Promise<Query | undefined> {
    return this.queriesMap.get(id);
  }

  async createQuery(query: InsertQuery): Promise<Query> {
    const id = this.currentQueryId++;
    const createdAt = new Date();
    const updatedAt = createdAt;
    const newQuery: Query = { ...query, id, createdAt, updatedAt };
    this.queriesMap.set(id, newQuery);
    return newQuery;
  }

  async updateQuery(id: number, query: Partial<Query>): Promise<Query | undefined> {
    const existingQuery = this.queriesMap.get(id);
    if (!existingQuery) return undefined;

    const updatedQuery: Query = {
      ...existingQuery,
      ...query,
      updatedAt: new Date(),
    };
    this.queriesMap.set(id, updatedQuery);
    return updatedQuery;
  }

  async deleteQuery(id: number): Promise<boolean> {
    return this.queriesMap.delete(id);
  }

  // Query Result operations
  async getQueryResult(queryId: number): Promise<QueryResult | undefined> {
    const results = Array.from(this.queryResultsMap.values());
    return results.find(result => result.queryId === queryId);
  }

  async createQueryResult(queryResult: InsertQueryResult): Promise<QueryResult> {
    const id = this.currentQueryResultId++;
    const lastUpdated = new Date();
    const newQueryResult: QueryResult = { ...queryResult, id, lastUpdated };
    this.queryResultsMap.set(id, newQueryResult);
    return newQueryResult;
  }

  async updateQueryResult(id: number, queryResult: Partial<QueryResult>): Promise<QueryResult | undefined> {
    const existingQueryResult = this.queryResultsMap.get(id);
    if (!existingQueryResult) return undefined;

    const updatedQueryResult: QueryResult = {
      ...existingQueryResult,
      ...queryResult,
      lastUpdated: new Date(),
    };
    this.queryResultsMap.set(id, updatedQueryResult);
    return updatedQueryResult;
  }
}

export const storage = new MemStorage();
