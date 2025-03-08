
import { MongoClient, Collection, Db } from 'mongodb';
import type { DataSource } from '@shared/schema';

export class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private initialized: boolean = false;

  constructor() {
    // Will be initialized later with specific connection details
  }

  async initialize(dataSource: DataSource): Promise<boolean> {
    try {
      if (!dataSource.mongodb) {
        throw new Error('MongoDB configuration missing');
      }

      const { uri, user, password, database } = dataSource.mongodb;
      
      if (!uri) {
        throw new Error('MongoDB URI is required');
      }

      // Construct connection string if user and password are provided
      let connectionString = uri;
      if (user && password) {
        // Insert credentials into the connection string if not already present
        if (!uri.includes('@')) {
          const uriParts = uri.split('://');
          connectionString = `${uriParts[0]}://${user}:${password}@${uriParts[1]}`;
        }
      }
      
      this.client = new MongoClient(connectionString);
      await this.client.connect();
      this.db = this.client.db(database || 'admin');
      
      this.initialized = true;
      console.log(`MongoDB service initialized for database: ${database || 'admin'}`);
      return true;
    } catch (error) {
      console.error('Error initializing MongoDB service:', error);
      return false;
    }
  }

  async query(collection: string, filters?: any) {
    if (!this.initialized || !this.db) {
      throw new Error('MongoDB service not initialized');
    }

    try {
      const coll: Collection = this.db.collection(collection);
      
      const query = filters || {};
      const documents = await coll.find(query).toArray();
      
      return documents.map(doc => ({
        id: doc._id.toString(),
        ...doc
      }));
    } catch (error) {
      console.error('MongoDB query error:', error);
      throw error;
    }
  }

  async getDocument(collection: string, documentId: string) {
    if (!this.initialized || !this.db) {
      throw new Error('MongoDB service not initialized');
    }

    try {
      const coll: Collection = this.db.collection(collection);
      
      // Handle if documentId is a MongoDB ObjectId string
      const query = { _id: documentId };
      const document = await coll.findOne(query);
      
      if (!document) {
        return null;
      }
      
      return {
        id: document._id.toString(),
        ...document
      };
    } catch (error) {
      console.error('MongoDB getDocument error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.initialized = false;
      console.log('MongoDB connection closed');
    }
  }
}
