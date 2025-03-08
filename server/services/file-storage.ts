
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class FileStorageService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.resolve(__dirname, '../../temp');
    this.ensureTempDirExists();
  }

  private ensureTempDirExists(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async storeData(fileName: string, data: any): Promise<string> {
    const filePath = path.join(this.tempDir, `${fileName}.json`);
    
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return filePath;
    } catch (error) {
      console.error(`Error storing data to ${filePath}:`, error);
      throw error;
    }
  }

  async loadData(fileName: string): Promise<any> {
    const filePath = path.join(this.tempDir, `${fileName}.json`);
    
    try {
      if (fs.existsSync(filePath)) {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error(`Error loading data from ${filePath}:`, error);
      throw error;
    }
  }

  async listStoredFiles(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.tempDir);
      return files.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('Error listing stored files:', error);
      throw error;
    }
  }

  async deleteFile(fileName: string): Promise<boolean> {
    const filePath = path.join(this.tempDir, `${fileName}.json`);
    
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      throw error;
    }
  }
  
  // Method to find and retrieve stored data based on collection name prefix
  async getLatestDataForCollection(collectionName: string): Promise<any | null> {
    try {
      const files = await this.listStoredFiles();
      
      // Filter files that match the pattern for this collection
      const collectionFiles = files.filter(file => 
        file.startsWith(`firebase_${collectionName}_`) || 
        file.startsWith(`mongodb_${collectionName}_`)
      );
      
      if (collectionFiles.length === 0) return null;
      
      // Sort by timestamp (which is at the end of the filename)
      collectionFiles.sort((a, b) => {
        const aTimestamp = parseInt(a.split('_').pop() || '0', 10);
        const bTimestamp = parseInt(b.split('_').pop() || '0', 10);
        return bTimestamp - aTimestamp;
      });
      
      // Get the most recent file
      const latestFile = collectionFiles[0];
      return await this.loadData(latestFile);
    } catch (error) {
      console.error(`Error retrieving latest data for ${collectionName}:`, error);
      return null;
    }
  }
  
  // Method to execute SQL-like queries against stored data
  async executeQueryOnStoredData(sqlQuery: string): Promise<any[]> {
    try {
      // Very simple SQL parser (for demonstration)
      const selectMatch = sqlQuery.match(/SELECT\s+(.+?)\s+FROM\s+(.+?)(?:\s+WHERE|\s+LIMIT|$)/i);
      if (!selectMatch) return [];
      
      const columnsStr = selectMatch[1].trim();
      const collectionName = selectMatch[2].trim();
      
      // Get the data
      const data = await this.getLatestDataForCollection(collectionName);
      if (!data) return [];
      
      let selectedColumns: string[] = [];
      if (columnsStr === '*') {
        selectedColumns = Object.keys(data[0] || {});
      } else {
        selectedColumns = columnsStr.split(',').map(col => col.trim());
      }
      
      // Apply projection
      let results = data.map((item: any) => {
        const result: any = {};
        for (const column of selectedColumns) {
          if (item[column] !== undefined) {
            result[column] = item[column];
          }
        }
        return result;
      });
      
      // Handle WHERE clause
      const whereMatch = sqlQuery.match(/WHERE\s+(.+?)(?:\s+LIMIT|$)/i);
      if (whereMatch) {
        // This is a very simplified filter parser - would need more work for real use
        const whereCondition = whereMatch[1].trim();
        // For now, just implement simple equality checks
        const conditionMatch = whereCondition.match(/(.+?)\s*=\s*['"](.+?)['"]/);
        if (conditionMatch) {
          const field = conditionMatch[1].trim();
          const value = conditionMatch[2].trim();
          results = results.filter((item: any) => item[field] === value);
        }
      }
      
      // Handle LIMIT clause
      const limitMatch = sqlQuery.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1], 10);
        results = results.slice(0, limit);
      }
      
      return results;
    } catch (error) {
      console.error(`Error executing query on stored data:`, error);
      return [];
    }
  }
}

export const fileStorage = new FileStorageService();
