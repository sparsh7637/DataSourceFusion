import type { DataSource } from "@shared/schema";
import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  DocumentData, 
  CollectionReference, 
  Firestore,
  limit,
  orderBy,
  WhereFilterOp
} from 'firebase/firestore';
import { fileStorage } from "./file-storage";

interface FirebaseCollection {
  name: string;
  fields: {
    name: string;
    type: string;
  }[];
}

interface FirebaseDocument {
  [key: string]: any;
}

export class FirebaseService {
  private dataSource: DataSource | null = null;
  private collections: Map<string, FirebaseCollection> = new Map();
  private data: Map<string, FirebaseDocument[]> = new Map();
  private isConnected: boolean = false;
  private firebaseApp: any = null;
  private firestore: Firestore | null = null;
  private cachedCollections: string[] = [];

  constructor() {
    // Set up sample schema and data as fallback
    this.setupSampleData();
  }

  private setupSampleData() {
    // Users collection
    const usersCollection: FirebaseCollection = {
      name: "users",
      fields: [
        { name: "uid", type: "string" },
        { name: "email", type: "string" },
        { name: "displayName", type: "string" },
        { name: "createdAt", type: "timestamp" },
      ]
    };

    // Orders collection
    const ordersCollection: FirebaseCollection = {
      name: "orders",
      fields: [
        { name: "orderId", type: "string" },
        { name: "userId", type: "string" },
        { name: "orderDate", type: "timestamp" },
        { name: "status", type: "string" },
      ]
    };

    // Products collection
    const productsCollection: FirebaseCollection = {
      name: "products",
      fields: [
        { name: "productId", type: "string" },
        { name: "name", type: "string" },
        { name: "price", type: "number" },
        { name: "inventory", type: "number" },
      ]
    };

    this.collections.set("users", usersCollection);
    this.collections.set("orders", ordersCollection);
    this.collections.set("products", productsCollection);

    // Sample user data with 20 entries
    const userData = [
      {
        uid: "user1",
        email: "john@example.com",
        displayName: "John Doe",
        createdAt: new Date("2023-01-15").toISOString()
      },
      {
        uid: "user2",
        email: "alice@example.com",
        displayName: "Alice Smith",
        createdAt: new Date("2023-03-20").toISOString()
      },
      {
        uid: "user3",
        email: "bob@example.com",
        displayName: "Bob Johnson",
        createdAt: new Date("2023-04-10").toISOString()
      },
      {
        uid: "user4",
        email: "sarah@example.com",
        displayName: "Sarah Williams",
        createdAt: new Date("2023-05-05").toISOString()
      },
      {
        uid: "user5",
        email: "michael@example.com",
        displayName: "Michael Brown",
        createdAt: new Date("2023-01-25").toISOString()
      },
      {
        uid: "user6",
        email: "emma@example.com",
        displayName: "Emma Davis",
        createdAt: new Date("2023-02-18").toISOString()
      },
      {
        uid: "user7",
        email: "david@example.com",
        displayName: "David Wilson",
        createdAt: new Date("2023-03-12").toISOString()
      },
      {
        uid: "user8",
        email: "olivia@example.com",
        displayName: "Olivia Miller",
        createdAt: new Date("2023-04-22").toISOString()
      },
      {
        uid: "user9",
        email: "james@example.com",
        displayName: "James Taylor",
        createdAt: new Date("2023-05-17").toISOString()
      },
      {
        uid: "user10",
        email: "sophia@example.com",
        displayName: "Sophia Anderson",
        createdAt: new Date("2023-06-03").toISOString()
      },
      {
        uid: "user11",
        email: "liam@example.com",
        displayName: "Liam Thomas",
        createdAt: new Date("2023-01-08").toISOString()
      },
      {
        uid: "user12",
        email: "ava@example.com",
        displayName: "Ava Jackson",
        createdAt: new Date("2023-02-27").toISOString()
      },
      {
        uid: "user13",
        email: "noah@example.com",
        displayName: "Noah White",
        createdAt: new Date("2023-03-30").toISOString()
      },
      {
        uid: "user14",
        email: "isabella@example.com",
        displayName: "Isabella Harris",
        createdAt: new Date("2023-04-14").toISOString()
      },
      {
        uid: "user15",
        email: "william@example.com",
        displayName: "William Martin",
        createdAt: new Date("2023-05-29").toISOString()
      },
      {
        uid: "user16",
        email: "mia@example.com",
        displayName: "Mia Thompson",
        createdAt: new Date("2023-06-09").toISOString()
      },
      {
        uid: "user17",
        email: "benjamin@example.com",
        displayName: "Benjamin Garcia",
        createdAt: new Date("2023-01-19").toISOString()
      },
      {
        uid: "user18",
        email: "charlotte@example.com",
        displayName: "Charlotte Martinez",
        createdAt: new Date("2023-02-11").toISOString()
      },
      {
        uid: "user19",
        email: "mason@example.com",
        displayName: "Mason Robinson",
        createdAt: new Date("2023-03-25").toISOString()
      },
      {
        uid: "user20",
        email: "amelia@example.com",
        displayName: "Amelia Clark",
        createdAt: new Date("2023-04-30").toISOString()
      }
    ];

    // Sample order data with 20 entries
    const orderData = [
      {
        orderId: "ORD-12345",
        userId: "user1",
        orderDate: new Date("2023-05-15").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12400",
        userId: "user1",
        orderDate: new Date("2023-06-22").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12398",
        userId: "user2",
        orderDate: new Date("2023-06-20").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12375",
        userId: "user3",
        orderDate: new Date("2023-06-18").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12410",
        userId: "user4",
        orderDate: new Date("2023-06-25").toISOString(),
        status: "pending"
      },
      {
        orderId: "ORD-12415",
        userId: "user5",
        orderDate: new Date("2023-06-27").toISOString(),
        status: "shipped"
      },
      {
        orderId: "ORD-12420",
        userId: "user6",
        orderDate: new Date("2023-06-28").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12425",
        userId: "user7",
        orderDate: new Date("2023-06-29").toISOString(),
        status: "processing"
      },
      {
        orderId: "ORD-12430",
        userId: "user8",
        orderDate: new Date("2023-06-30").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12435",
        userId: "user9",
        orderDate: new Date("2023-07-01").toISOString(),
        status: "pending"
      },
      {
        orderId: "ORD-12440",
        userId: "user10",
        orderDate: new Date("2023-07-02").toISOString(),
        status: "shipped"
      },
      {
        orderId: "ORD-12445",
        userId: "user11",
        orderDate: new Date("2023-07-03").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12450",
        userId: "user12",
        orderDate: new Date("2023-07-04").toISOString(),
        status: "processing"
      },
      {
        orderId: "ORD-12455",
        userId: "user13",
        orderDate: new Date("2023-07-05").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12460",
        userId: "user14",
        orderDate: new Date("2023-07-06").toISOString(),
        status: "pending"
      },
      {
        orderId: "ORD-12465",
        userId: "user15",
        orderDate: new Date("2023-07-07").toISOString(),
        status: "shipped"
      },
      {
        orderId: "ORD-12470",
        userId: "user16",
        orderDate: new Date("2023-07-08").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12475",
        userId: "user17",
        orderDate: new Date("2023-07-09").toISOString(),
        status: "processing"
      },
      {
        orderId: "ORD-12480",
        userId: "user18",
        orderDate: new Date("2023-07-10").toISOString(),
        status: "completed"
      },
      {
        orderId: "ORD-12485",
        userId: "user19",
        orderDate: new Date("2023-07-11").toISOString(),
        status: "completed"
      }
    ];

    this.data.set("users", userData);
    this.data.set("orders", orderData);
  }

  async connect(dataSource: DataSource): Promise<boolean> {
    try {
      this.dataSource = dataSource;
      
      // Get Firebase config from environment variables or data source
      const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY || dataSource.config?.apiKey,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || dataSource.config?.authDomain,
        projectId: process.env.FIREBASE_PROJECT_ID || dataSource.config?.projectId,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || dataSource.config?.storageBucket,
      };

      // Check if we have the required configuration
      if (!firebaseConfig.projectId) {
        console.warn("Missing Firebase project ID. Using sample data.");
        this.isConnected = true; // Use sample data as fallback
        return true;
      }

      // Initialize Firebase app with a unique name to avoid conflicts
      try {
        // Try to get an existing app or create a new one with a unique name
        const appName = `app-${dataSource.id || Date.now()}`;
        try {
          this.firebaseApp = getApp(appName);
        } catch (e) {
          this.firebaseApp = initializeApp(firebaseConfig, appName);
        }
        
        this.firestore = getFirestore(this.firebaseApp);
        this.isConnected = true;
        
        // Cache collections
        try {
          await this.cacheCollections();
        } catch (error) {
          console.warn("Failed to cache collections, will use sample data:", error);
        }
        
        console.log(`Connected to Firebase with project ID: ${firebaseConfig.projectId}`);
        return true;
      } catch (error) {
        console.error("Firebase initialization error:", error);
        console.log("Using sample data as fallback");
        this.isConnected = true; // Use sample data as fallback
        return true;
      }
    } catch (error) {
      console.error("Failed to connect to Firebase:", error);
      console.log("Using sample data as fallback");
      this.isConnected = true; // Use sample data as fallback
      return true;
    }
  }
  
  private async cacheCollections() {
    if (!this.firestore) return;
    
    try {
      // For Firebase, we can't list collections programmatically from the client SDK
      // Let's check a set of common collection names or ones from the config
      const commonCollections = ['users', 'orders', 'products', 'customers', 'transactions', 'inventory', 'profiles', 'posts', 'comments'];
      const configCollections = this.dataSource?.config?.collections as string[] || [];
      const collectionsToCheck = [...new Set([...commonCollections, ...configCollections])];
      
      this.cachedCollections = [];
      
      for (const collName of collectionsToCheck) {
        const collRef = collection(this.firestore, collName);
        try {
          const snapshot = await getDocs(query(collRef, limit(1)));
          if (!snapshot.empty) {
            this.cachedCollections.push(collName);
            
            // Extract fields from the first document
            if (snapshot.docs.length > 0) {
              const fields = this.extractFieldsFromDocument(snapshot.docs[0].data());
              this.collections.set(collName, {
                name: collName,
                fields
              });
            }
          }
        } catch (e) {
          // Collection might not exist, skip it
        }
      }
      
      console.log(`Cached ${this.cachedCollections.length} Firebase collections: ${this.cachedCollections.join(', ')}`);
    } catch (error) {
      console.error("Error caching collections:", error);
    }
  }
  
  private extractFieldsFromDocument(doc: any): { name: string; type: string }[] {
    const fields: { name: string; type: string }[] = [];
    
    for (const [key, value] of Object.entries(doc)) {
      let type = typeof value;
      
      if (value instanceof Date) {
        type = 'timestamp';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else if (value === null) {
        type = 'null';
      } else if (typeof value === 'object') {
        type = 'object';
      }
      
      fields.push({ name: key, type });
    }
    
    return fields;
  }

  async disconnect(): Promise<boolean> {
    this.dataSource = null;
    this.firebaseApp = null;
    this.firestore = null;
    this.isConnected = false;
    return true;
  }

  async getCollections(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to Firebase");
    }
    
    if (this.firestore && this.cachedCollections.length > 0) {
      return this.cachedCollections;
    }
    
    return Array.from(this.collections.keys());
  }

  async getCollectionSchema(collectionName: string): Promise<FirebaseCollection | null> {
    if (!this.isConnected) {
      throw new Error("Not connected to Firebase");
    }
    
    // If we have a real Firestore instance and the collection is in our cached list
    if (this.firestore && this.cachedCollections.includes(collectionName)) {
      // If we've already cached the schema, return it
      if (this.collections.has(collectionName)) {
        return this.collections.get(collectionName) || null;
      }
      
      // Otherwise, try to get sample data to infer schema
      try {
        const collRef = collection(this.firestore, collectionName);
        const snapshot = await getDocs(query(collRef, limit(1)));
        
        if (!snapshot.empty && snapshot.docs.length > 0) {
          const fields = this.extractFieldsFromDocument(snapshot.docs[0].data());
          const schema: FirebaseCollection = { name: collectionName, fields };
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

  async executeQuery(collectionName: string, queryParams: any): Promise<FirebaseDocument[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to Firebase");
    }
    
    console.log(`Executing Firebase query on collection: ${collectionName}`, queryParams);
    
    // Real query execution with Firestore
    if (this.firestore && this.cachedCollections.includes(collectionName)) {
      try {
        const collRef = collection(this.firestore, collectionName);
        let queryRef = query(collRef);
        
        // Apply filters from queryParams
        if (queryParams && typeof queryParams === 'object') {
          // Handle simple filters
          if (queryParams.filters && Array.isArray(queryParams.filters)) {
            for (const filter of queryParams.filters) {
              if (filter.field && filter.operator && filter.value !== undefined) {
                // Convert operator string to Firebase operator
                const op = this.getFirebaseOperator(filter.operator);
                queryRef = query(queryRef, where(filter.field, op, filter.value));
              }
            }
          }
          
          // Handle sorting
          if (queryParams.orderBy && typeof queryParams.orderBy === 'object') {
            for (const field in queryParams.orderBy) {
              const direction = queryParams.orderBy[field] === 'desc' ? 'desc' : 'asc';
              queryRef = query(queryRef, orderBy(field, direction));
            }
          }
          
          // Handle limit
          if (queryParams.limit && typeof queryParams.limit === 'number') {
            queryRef = query(queryRef, limit(queryParams.limit));
          }
        }
        
        const snapshot = await getDocs(queryRef);
        
        // Convert to array of documents with IDs
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Apply projection (selected columns) if provided
        let finalResults = results;
        if (queryParams && queryParams.columns && Array.isArray(queryParams.columns) && queryParams.columns.length > 0) {
          finalResults = results.map(item => {
            const projectedItem: any = {};
            for (const column of queryParams.columns) {
              if (item[column] !== undefined) {
                projectedItem[column] = item[column];
              }
            }
            return projectedItem;
          });
        }
        
        // Store results in temp file
        const timestamp = Date.now();
        const fileName = `firebase_${collectionName}_${timestamp}`;
        await fileStorage.storeData(fileName, finalResults);
        
        return finalResults;
      } catch (error) {
        console.error(`Error executing query on collection ${collectionName}:`, error);
        // Fall back to sample data on error
        console.log("Falling back to sample data due to error");
      }
    }
    
    // Fall back to sample data
    console.log("Using sample data for query execution");
    if (this.data.has(collectionName)) {
      let result = [...(this.data.get(collectionName) || [])];
      
      // Handle selected columns (projection)
      let selectedColumns = ['*'];
      if (queryParams.columns && Array.isArray(queryParams.columns) && queryParams.columns.length > 0) {
        selectedColumns = queryParams.columns;
      } else if (queryParams.selectedColumns && Array.isArray(queryParams.selectedColumns)) {
        selectedColumns = queryParams.selectedColumns;
      }
      
      // Apply simple filtering if queryParams is provided
      if (queryParams && typeof queryParams === 'object') {
        if (queryParams.filters && Array.isArray(queryParams.filters)) {
          result = result.filter(item => {
            return queryParams.filters.every((filter: any) => {
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
        if (queryParams.orderBy && typeof queryParams.orderBy === 'object') {
          const sortFields = Object.keys(queryParams.orderBy);
          if (sortFields.length > 0) {
            result.sort((a, b) => {
              for (const field of sortFields) {
                const direction = queryParams.orderBy[field] === 'desc' ? -1 : 1;
                if (a[field] < b[field]) return -1 * direction;
                if (a[field] > b[field]) return 1 * direction;
              }
              return 0;
            });
          }
        }
        
        // Apply limit
        if (queryParams.limit && typeof queryParams.limit === 'number') {
          result = result.slice(0, queryParams.limit);
        }
        
        // Apply projection (selected columns) if needed
        if (selectedColumns.length > 0 && !selectedColumns.includes('*')) {
          result = result.map(item => {
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
      const fileName = `firebase_${collectionName}_${timestamp}`;
      await fileStorage.storeData(fileName, result);
      
      return result;
    }
    
    return [];
  }
  
  async fetchAllData(collectionName: string): Promise<FirebaseDocument[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to Firebase");
    }
    
    // Check if we have a real connection
    if (this.firestore && this.cachedCollections.includes(collectionName)) {
      try {
        const collRef = collection(this.firestore, collectionName);
        const snapshot = await getDocs(query(collRef));
        
        // Convert to array of documents with IDs
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Store in temp file
        const timestamp = Date.now();
        const fileName = `firebase_${collectionName}_full_${timestamp}`;
        await fileStorage.storeData(fileName, results);
        
        return results;
      } catch (error) {
        console.error(`Error fetching all data from collection ${collectionName}:`, error);
        throw error;
      }
    }
    
    // Fall back to sample data
    if (this.data.has(collectionName)) {
      const results = this.data.get(collectionName) || [];
      
      // Store in temp file
      const timestamp = Date.now();
      const fileName = `firebase_${collectionName}_full_${timestamp}`;
      await fileStorage.storeData(fileName, results);
      
      return [...results];
    }
    
    return [];
  }
  
  async fetchDataWithProjection(collectionName: string, columns: string[]): Promise<FirebaseDocument[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to Firebase");
    }
    
    // Check if we have a real connection
    if (this.firestore && this.cachedCollections.includes(collectionName)) {
      try {
        const collRef = collection(this.firestore, collectionName);
        const snapshot = await getDocs(query(collRef));
        
        // Convert to array of documents with IDs and apply projection
        const results = snapshot.docs.map(doc => {
          const data = doc.data();
          const projectedItem: any = { id: doc.id };
          
          for (const column of columns) {
            if (data[column] !== undefined) {
              projectedItem[column] = data[column];
            }
          }
          
          return projectedItem;
        });
        
        // Store in temp file
        const timestamp = Date.now();
        const fileName = `firebase_${collectionName}_projection_${timestamp}`;
        await fileStorage.storeData(fileName, results);
        
        return results;
      } catch (error) {
        console.error(`Error fetching data with projection from collection ${collectionName}:`, error);
        throw error;
      }
    }
    
    // Fall back to sample data
    if (this.data.has(collectionName)) {
      const sourceData = this.data.get(collectionName) || [];
      
      // Apply projection
      const results = sourceData.map(item => {
        const projectedItem: any = {};
        for (const column of columns) {
          if (item[column] !== undefined) {
            projectedItem[column] = item[column];
          }
        }
        return projectedItem;
      });
      
      // Store in temp file
      const timestamp = Date.now();
      const fileName = `firebase_${collectionName}_projection_${timestamp}`;
      await fileStorage.storeData(fileName, results);
      
      return results;
    }
    
    return [];
  }
  
  private getFirebaseOperator(operator: string): WhereFilterOp {
    switch (operator) {
      case '==': return '==';
      case '!=': return '!=';
      case '>': return '>';
      case '>=': return '>=';
      case '<': return '<';
      case '<=': return '<=';
      case 'in': return 'in';
      case 'not-in': return 'not-in';
      case 'array-contains': return 'array-contains';
      case 'array-contains-any': return 'array-contains-any';
      default: return '==';
    }
  }

  isValid(): boolean {
    return this.isConnected;
  }
}
