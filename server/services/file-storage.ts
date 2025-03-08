
import fs from 'fs';
import path from 'path';
import { DataSource } from '@shared/schema';

// Ensure temp directory exists
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

export interface StoredCollection {
  name: string;
  data: any[];
  schema: { name: string; type: string }[];
  lastUpdated: Date;
}

export class FileStorage {
  private static getFilePath(dataSourceId: number, collection: string): string {
    return path.join(tempDir, `ds_${dataSourceId}_${collection}.json`);
  }

  static async storeCollection(
    dataSourceId: number, 
    collection: string, 
    data: any[], 
    schema: { name: string; type: string }[]
  ): Promise<void> {
    const storedCollection: StoredCollection = {
      name: collection,
      data,
      schema,
      lastUpdated: new Date()
    };
    
    const filePath = this.getFilePath(dataSourceId, collection);
    await fs.promises.writeFile(
      filePath, 
      JSON.stringify(storedCollection, null, 2)
    );
    
    console.log(`Stored collection ${collection} from data source ${dataSourceId} to ${filePath}`);
  }

  static async getCollection(dataSourceId: number, collection: string): Promise<StoredCollection | null> {
    const filePath = this.getFilePath(dataSourceId, collection);
    
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent) as StoredCollection;
      }
    } catch (error) {
      console.error(`Error reading collection ${collection} from data source ${dataSourceId}:`, error);
    }
    
    return null;
  }

  static async listCollections(dataSourceId: number): Promise<string[]> {
    const prefix = `ds_${dataSourceId}_`;
    const suffix = '.json';
    
    try {
      const files = await fs.promises.readdir(tempDir);
      return files
        .filter(file => file.startsWith(prefix) && file.endsWith(suffix))
        .map(file => file.slice(prefix.length, -suffix.length));
    } catch (error) {
      console.error(`Error listing collections for data source ${dataSourceId}:`, error);
      return [];
    }
  }
}
