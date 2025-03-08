
import * as admin from 'firebase-admin';
import type { DataSource } from '@shared/schema';
import { fileStorage } from './file-storage';

export class FirebaseService {
  private app: admin.app.App | null = null;
  private db: admin.firestore.Firestore | null = null;
  private initialized: boolean = false;

  constructor() {
    // Will be initialized later with specific project credentials
  }

  async initialize(dataSource: DataSource): Promise<boolean> {
    try {
      if (!dataSource.firebase) {
        throw new Error('Firebase configuration missing');
      }

      const { projectId, credential } = dataSource.firebase;

      if (!projectId) {
        throw new Error('Firebase project ID is required');
      }

      // Check if we already have an app with this name
      try {
        this.app = admin.app(projectId);
      } catch (e) {
        // App doesn't exist yet, create it
        this.app = admin.initializeApp({
          projectId,
          credential: credential 
            ? admin.credential.cert(JSON.parse(credential)) 
            : admin.credential.applicationDefault()
        }, projectId);
      }

      this.db = admin.firestore(this.app);
      this.initialized = true;
      console.log(`Firebase service initialized for project: ${projectId}`);
      return true;
    } catch (error) {
      console.error('Error initializing Firebase service:', error);
      return false;
    }
  }

  async query(collection: string, filters?: any) {
    if (!this.initialized || !this.db) {
      throw new Error('Firebase service not initialized');
    }

    try {
      let queryRef: admin.firestore.Query = this.db.collection(collection);
      
      // Apply filters if any
      if (filters) {
        Object.entries(filters).forEach(([field, value]) => {
          queryRef = queryRef.where(field, '==', value);
        });
      }
      
      const snapshot = await queryRef.get();
      
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cache results to file system
      const timestamp = Date.now();
      await fileStorage.writeJSON(`firebase_${collection}_${timestamp}.json`, results);
      
      return results;
    } catch (error) {
      console.error('Firebase query error:', error);
      throw error;
    }
  }

  async getDocument(collection: string, documentId: string) {
    if (!this.initialized || !this.db) {
      throw new Error('Firebase service not initialized');
    }

    try {
      const docRef = this.db.collection(collection).doc(documentId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Firebase getDocument error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.app) {
      await this.app.delete();
      this.initialized = false;
      console.log('Firebase app deleted');
    }
  }
}
