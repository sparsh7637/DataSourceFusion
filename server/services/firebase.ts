
import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { DataSource } from '@shared/schema';

export class FirebaseService {
  private app: any;
  private db: any;
  private storage: any;
  private initialized: boolean = false;

  constructor() {
    // Will be initialized later with specific project credentials
  }

  async initialize(dataSource: DataSource): Promise<boolean> {
    try {
      if (!dataSource.firebase) {
        throw new Error('Firebase configuration missing');
      }

      const { projectId, apiKey } = dataSource.firebase;
      
      if (!projectId) {
        throw new Error('Firebase project ID is required');
      }

      const appName = `firebase-${dataSource.id}`;
      
      // Initialize with available credentials
      this.app = initializeApp({
        projectId,
        credential: process.env.GOOGLE_APPLICATION_CREDENTIALS 
          ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as unknown as ServiceAccount)
          : undefined,
      }, appName);
      
      this.db = getFirestore(this.app);
      this.storage = getStorage(this.app);
      
      this.initialized = true;
      console.log(`Firebase service initialized for project: ${projectId}`);
      return true;
    } catch (error) {
      console.error('Error initializing Firebase service:', error);
      return false;
    }
  }

  async query(collection: string, filters?: any) {
    if (!this.initialized) {
      throw new Error('Firebase service not initialized');
    }

    try {
      let query = this.db.collection(collection);
      
      if (filters) {
        // Apply filters if provided
        Object.entries(filters).forEach(([field, value]) => {
          query = query.where(field, '==', value);
        });
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Firebase query error:', error);
      throw error;
    }
  }

  async getDocument(collection: string, documentId: string) {
    if (!this.initialized) {
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
}
