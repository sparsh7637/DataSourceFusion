import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { queryFederationService } from "./services/query-federation";
import { z } from "zod";
import {
  dataSourceConfigSchema,
  mappingRuleSchema,
  schemaMappingRequestSchema,
  queryRequestSchema,
  executeQueryRequestSchema
} from "../shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // Data Sources
  app.get("/api/data-sources", async (req: Request, res: Response) => {
    const sources = await storage.getDataSources();
    res.json(sources);
  });

  app.get("/api/data-sources/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const source = await storage.getDataSource(id);
    
    if (!source) {
      return res.status(404).json({ error: "Data source not found" });
    }
    
    res.json(source);
  });

  app.post("/api/data-sources", async (req: Request, res: Response) => {
    try {
      const body = req.body;
      
      // Validate the config based on type
      if (body.type === 'firebase') {
        const configSchema = z.object({
          projectId: z.string().min(1, "Project ID is required"),
          apiKey: z.string().optional(),
          authDomain: z.string().optional(),
        });
        
        configSchema.parse(body.config);
      } else if (body.type === 'mongodb') {
        const configSchema = z.object({
          uri: z.string().min(1, "MongoDB URI is required"),
          database: z.string().min(1, "Database name is required"),
        });
        
        configSchema.parse(body.config);
      } else {
        return res.status(400).json({ error: "Invalid data source type" });
      }
      
      const newSource = await storage.createDataSource({
        name: body.name,
        type: body.type,
        config: body.config,
        status: body.status || "connected",
        collections: body.collections || [],
      });
      
      // Add to query federation service
      await queryFederationService.addDataSource(newSource);
      
      res.status(201).json(newSource);
    } catch (error) {
      console.error("Error creating data source:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.put("/api/data-sources/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const body = req.body;
      
      // Validate the config based on type
      if (body.type === 'firebase') {
        const configSchema = z.object({
          projectId: z.string().min(1, "Project ID is required"),
          apiKey: z.string().optional(),
          authDomain: z.string().optional(),
        });
        
        configSchema.parse(body.config);
      } else if (body.type === 'mongodb') {
        const configSchema = z.object({
          uri: z.string().min(1, "MongoDB URI is required"),
          database: z.string().min(1, "Database name is required"),
        });
        
        configSchema.parse(body.config);
      }
      
      const updatedSource = await storage.updateDataSource(id, {
        name: body.name,
        type: body.type,
        config: body.config,
        status: body.status,
        collections: body.collections,
      });
      
      if (!updatedSource) {
        return res.status(404).json({ error: "Data source not found" });
      }
      
      // Update in query federation service
      await queryFederationService.removeDataSource(id);
      await queryFederationService.addDataSource(updatedSource);
      
      res.json(updatedSource);
    } catch (error) {
      console.error("Error updating data source:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/data-sources/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDataSource(id);
      
      if (!success) {
        return res.status(404).json({ error: "Data source not found" });
      }
      
      // Remove from query federation service
      await queryFederationService.removeDataSource(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting data source:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Schema Mappings
  app.get("/api/schema-mappings", async (req: Request, res: Response) => {
    const mappings = await storage.getSchemaMappings();
    res.json(mappings);
  });

  app.get("/api/schema-mappings/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const mapping = await storage.getSchemaMapping(id);
    
    if (!mapping) {
      return res.status(404).json({ error: "Schema mapping not found" });
    }
    
    res.json(mapping);
  });

  app.post("/api/schema-mappings", async (req: Request, res: Response) => {
    try {
      const body = req.body;
      
      // Validate the mapping rules
      if (body.mappingRules && Array.isArray(body.mappingRules)) {
        for (const rule of body.mappingRules) {
          mappingRuleSchema.parse(rule);
        }
      }
      
      const newMapping = await storage.createSchemaMapping({
        name: body.name,
        sourceId: body.sourceId,
        sourceCollection: body.sourceCollection,
        targetId: body.targetId,
        targetCollection: body.targetCollection,
        status: body.status || "active",
        mappingRules: body.mappingRules || [],
      });
      
      // Add to query federation service
      await queryFederationService.addMapping(newMapping);
      
      res.status(201).json(newMapping);
    } catch (error) {
      console.error("Error creating schema mapping:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.put("/api/schema-mappings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const body = req.body;
      
      // Validate the mapping rules
      if (body.mappingRules && Array.isArray(body.mappingRules)) {
        for (const rule of body.mappingRules) {
          mappingRuleSchema.parse(rule);
        }
      }
      
      const updatedMapping = await storage.updateSchemaMapping(id, {
        name: body.name,
        sourceId: body.sourceId,
        sourceCollection: body.sourceCollection,
        targetId: body.targetId,
        targetCollection: body.targetCollection,
        status: body.status,
        mappingRules: body.mappingRules,
      });
      
      if (!updatedMapping) {
        return res.status(404).json({ error: "Schema mapping not found" });
      }
      
      // Update in query federation service
      await queryFederationService.removeMapping(id);
      await queryFederationService.addMapping(updatedMapping);
      
      res.json(updatedMapping);
    } catch (error) {
      console.error("Error updating schema mapping:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/schema-mappings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSchemaMapping(id);
      
      if (!success) {
        return res.status(404).json({ error: "Schema mapping not found" });
      }
      
      // Remove from query federation service
      await queryFederationService.removeMapping(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schema mapping:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Queries
  app.get("/api/queries", async (req: Request, res: Response) => {
    const queries = await storage.getQueries();
    res.json(queries);
  });

  app.get("/api/queries/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const query = await storage.getQuery(id);
    
    if (!query) {
      return res.status(404).json({ error: "Query not found" });
    }
    
    res.json(query);
  });

  app.post("/api/queries", async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const validation = await queryFederationService.validateQuery(body.query);
      
      if (!validation.isValid) {
        return res.status(400).json({ error: `Invalid query: ${validation.error}` });
      }
      
      const newQuery = await storage.createQuery({
        name: body.name,
        query: body.query,
        dataSources: body.dataSources || [],
        collections: body.collections || [],
        federationStrategy: body.federationStrategy || "virtual",
      });
      
      res.status(201).json(newQuery);
    } catch (error) {
      console.error("Error creating query:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.put("/api/queries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const body = req.body;
      
      if (body.query) {
        const validation = await queryFederationService.validateQuery(body.query);
        if (!validation.isValid) {
          return res.status(400).json({ error: `Invalid query: ${validation.error}` });
        }
      }
      
      const updatedQuery = await storage.updateQuery(id, {
        name: body.name,
        query: body.query,
        dataSources: body.dataSources,
        collections: body.collections,
        federationStrategy: body.federationStrategy,
      });
      
      if (!updatedQuery) {
        return res.status(404).json({ error: "Query not found" });
      }
      
      res.json(updatedQuery);
    } catch (error) {
      console.error("Error updating query:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/queries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteQuery(id);
      
      if (!success) {
        return res.status(404).json({ error: "Query not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting query:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Query Execution
  app.post("/api/execute-query", async (req: Request, res: Response) => {
    try {
      const body = req.body;
      
      let query;
      if (body.queryId) {
        // Execute existing query by ID
        query = await storage.getQuery(body.queryId);
        if (!query) {
          return res.status(404).json({ error: "Query not found" });
        }
      } else if (body.query) {
        // Execute ad-hoc query
        const validation = await queryFederationService.validateQuery(body.query);
        if (!validation.isValid) {
          return res.status(400).json({ error: `Invalid query: ${validation.error}` });
        }
        
        // Create a temporary query object
        query = {
          id: -1,
          name: "Ad-hoc Query",
          query: body.query,
          dataSources: body.dataSources || [],
          collections: body.collections || [],
          federationStrategy: body.federationStrategy || "virtual",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        return res.status(400).json({ error: "Either queryId or query must be provided" });
      }
      
      // Execute the query
      const result = await queryFederationService.executeQuery(query, body.params);
      
      // Check if we need to store the result
      const existingResult = await storage.getQueryResult(query.id);
      if (existingResult) {
        await storage.updateQueryResult(existingResult.id, {
          results: JSON.stringify(result.results),
          lastUpdated: new Date(),
        });
      } else if (query.id !== -1) {
        // Only store results for saved queries
        await storage.createQueryResult({
          queryId: query.id,
          results: JSON.stringify(result.results),
          lastUpdated: new Date(),
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error executing query:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Collection Schema API
  app.get("/api/data-sources/:id/collections", async (req: Request, res: Response) => {
    try {
      const sourceId = parseInt(req.params.id);
      const source = await storage.getDataSource(sourceId);
      
      if (!source) {
        return res.status(404).json({ error: "Data source not found" });
      }
      
      // Connect to the data source if needed
      await queryFederationService.addDataSource(source);
      
      // Get the service
      const service = queryFederationService["sourceServices"].get(sourceId);
      if (!service) {
        return res.status(400).json({ error: "Could not connect to data source" });
      }
      
      // Get collections
      const collections = await service.getCollections();
      res.json(collections);
    } catch (error) {
      console.error("Error getting collections:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/api/data-sources/:id/collections/:collection/schema", async (req: Request, res: Response) => {
    try {
      const sourceId = parseInt(req.params.id);
      const collectionName = req.params.collection;
      
      const schema = await queryFederationService.getSourceCollectionSchema(sourceId, collectionName);
      
      if (!schema) {
        return res.status(404).json({ error: "Collection or schema not found" });
      }
      
      res.json(schema);
    } catch (error) {
      console.error("Error getting collection schema:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Search/query in a specific collection (for testing)
  app.post("/api/data-sources/:id/collections/:collection/query", async (req: Request, res: Response) => {
    try {
      const sourceId = parseInt(req.params.id);
      const collectionName = req.params.collection;
      const queryParams = req.body;
      
      const source = await storage.getDataSource(sourceId);
      if (!source) {
        return res.status(404).json({ error: "Data source not found" });
      }
      
      // Connect to the data source if needed
      await queryFederationService.addDataSource(source);
      
      // Get the service
      const service = queryFederationService["sourceServices"].get(sourceId);
      if (!service) {
        return res.status(400).json({ error: "Could not connect to data source" });
      }
      
      // Execute the query
      const results = await service.executeQuery(collectionName, queryParams);
      res.json(results);
    } catch (error) {
      console.error("Error executing collection query:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  return server;
}
