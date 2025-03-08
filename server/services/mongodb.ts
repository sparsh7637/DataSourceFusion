
import { MongoClient, Collection, Db } from 'mongodb';
import type { DataSource } from '@shared/schema';
import { fileStorage } from './file-storage';

export class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private initialized: boolean = false;

  constructor() {
    // Will be initialized with connection details later
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

      // Build connection string with credentials if provided
      let connectionString = uri;
      if (user && password) {
        // Parse the URI to insert credentials
        const urlObj = new URL(uri);
        urlObj.username = user;
        urlObj.password = password;
        connectionString = urlObj.toString();
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

  async query(collectionName: string, filters?: any) {
    if (!this.initialized || !this.db) {
      throw new Error('MongoDB service not initialized');
    }

    try {
      const collection: Collection = this.db.collection(collectionName);
      
      // Execute the query
      const results = await collection.find(filters || {}).toArray();
      
      // Cache results to file system
      const timestamp = Date.now();
      await fileStorage.writeJSON(`mongodb_${collectionName}_${timestamp}.json`, results);
      
      return results;
    } catch (error) {
      console.error('MongoDB query error:', error);
      throw error;
    }
  }

  async getDocument(collectionName: string, documentId: string) {
    if (!this.initialized || !this.db) {
      throw new Error('MongoDB service not initialized');
    }

    try {
      const collection: Collection = this.db.collection(collectionName);
      
      // MongoDB uses _id for document IDs
      const result = await collection.findOne({ _id: documentId });
      return result;
    } catch (error) {
      console.error('MongoDB getDocument error:', error);
      throw error;
    }
  }

  async listCollections() {
    if (!this.initialized || !this.db) {
      throw new Error('MongoDB service not initialized');
    }

    try {
      const collections = await this.db.listCollections().toArray();
      return collections.map(c => c.name);
    } catch (error) {
      console.error('MongoDB listCollections error:', error);
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
