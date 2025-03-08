
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
}

export const fileStorage = new FileStorageService();
