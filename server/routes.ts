import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { queryFederationService } from "./services/query-federation";
import {
  insertDataSourceSchema,
  schemaMappingRequestSchema,
  queryRequestSchema,
  executeQueryRequestSchema
} from "@shared/schema";
import z from "zod";
import { ZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for data sources
  app.get("/api/data-sources", async (req, res) => {
    try {
      const dataSources = await storage.getDataSources();
      res.json(dataSources);
    } catch (error) {
      console.error("Error fetching data sources:", error);
      res.status(500).json({ message: "Failed to fetch data sources" });
    }
  });

  app.get("/api/data-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      res.json(dataSource);
    } catch (error) {
      console.error("Error fetching data source:", error);
      res.status(500).json({ message: "Failed to fetch data source" });
    }
  });

  app.post("/api/data-sources", async (req, res) => {
    try {
      const validatedData = insertDataSourceSchema.parse(req.body);
      const dataSource = await storage.createDataSource(validatedData);
      
      // Connect to the data source
      const connected = await queryFederationService.addDataSource(dataSource);
      if (!connected) {
        await storage.updateDataSource(dataSource.id, { status: "error" });
        return res.status(400).json({ message: "Failed to connect to data source" });
      }
      
      res.status(201).json(dataSource);
    } catch (error) {
      console.error("Error creating data source:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data source configuration", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create data source" });
    }
  });

  app.put("/api/data-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingSource = await storage.getDataSource(id);
      if (!existingSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      const validatedData = insertDataSourceSchema.partial().parse(req.body);
      const updatedSource = await storage.updateDataSource(id, validatedData);
      
      // If connection details changed, reconnect
      if (validatedData.config || validatedData.type) {
        await queryFederationService.removeDataSource(id);
        await queryFederationService.addDataSource(updatedSource!);
      }
      
      res.json(updatedSource);
    } catch (error) {
      console.error("Error updating data source:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data source configuration", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update data source" });
    }
  });

  app.delete("/api/data-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingSource = await storage.getDataSource(id);
      if (!existingSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      // Remove from query federation service first
      await queryFederationService.removeDataSource(id);
      
      // Then remove from storage
      await storage.deleteDataSource(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting data source:", error);
      res.status(500).json({ message: "Failed to delete data source" });
    }
  });

  // API routes for schema mappings
  app.get("/api/schema-mappings", async (req, res) => {
    try {
      const mappings = await storage.getSchemaMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching schema mappings:", error);
      res.status(500).json({ message: "Failed to fetch schema mappings" });
    }
  });

  app.get("/api/schema-mappings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mapping = await storage.getSchemaMapping(id);
      if (!mapping) {
        return res.status(404).json({ message: "Schema mapping not found" });
      }
      res.json(mapping);
    } catch (error) {
      console.error("Error fetching schema mapping:", error);
      res.status(500).json({ message: "Failed to fetch schema mapping" });
    }
  });

  app.post("/api/schema-mappings", async (req, res) => {
    try {
      const validatedData = schemaMappingRequestSchema.parse(req.body);
      
      // Check if source and target exist
      const sourceDataSource = await storage.getDataSource(validatedData.sourceId);
      const targetDataSource = await storage.getDataSource(validatedData.targetId);
      
      if (!sourceDataSource || !targetDataSource) {
        return res.status(400).json({ message: "Source or target data source not found" });
      }
      
      const mapping = await storage.createSchemaMapping(validatedData);
      
      // Add mapping to query federation service
      await queryFederationService.addMapping(mapping);
      
      res.status(201).json(mapping);
    } catch (error) {
      console.error("Error creating schema mapping:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid schema mapping configuration", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create schema mapping" });
    }
  });

  app.put("/api/schema-mappings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingMapping = await storage.getSchemaMapping(id);
      if (!existingMapping) {
        return res.status(404).json({ message: "Schema mapping not found" });
      }
      
      const validatedData = schemaMappingRequestSchema.partial().parse(req.body);
      const updatedMapping = await storage.updateSchemaMapping(id, validatedData);
      
      // Update in query federation service
      await queryFederationService.removeMapping(id);
      await queryFederationService.addMapping(updatedMapping!);
      
      res.json(updatedMapping);
    } catch (error) {
      console.error("Error updating schema mapping:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid schema mapping configuration", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update schema mapping" });
    }
  });

  app.delete("/api/schema-mappings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingMapping = await storage.getSchemaMapping(id);
      if (!existingMapping) {
        return res.status(404).json({ message: "Schema mapping not found" });
      }
      
      // Remove from query federation service first
      await queryFederationService.removeMapping(id);
      
      // Then remove from storage
      await storage.deleteSchemaMapping(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schema mapping:", error);
      res.status(500).json({ message: "Failed to delete schema mapping" });
    }
  });

  // API routes for queries
  app.get("/api/queries", async (req, res) => {
    try {
      const queries = await storage.getQueries();
      res.json(queries);
    } catch (error) {
      console.error("Error fetching queries:", error);
      res.status(500).json({ message: "Failed to fetch queries" });
    }
  });

  app.get("/api/queries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const query = await storage.getQuery(id);
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }
      res.json(query);
    } catch (error) {
      console.error("Error fetching query:", error);
      res.status(500).json({ message: "Failed to fetch query" });
    }
  });

  app.post("/api/queries", async (req, res) => {
    try {
      const validatedData = queryRequestSchema.parse(req.body);
      
      // Validate the query syntax
      const validation = await queryFederationService.validateQuery(validatedData.query);
      if (!validation.valid) {
        return res.status(400).json({ message: "Invalid query syntax", errors: validation.errors });
      }
      
      const query = await storage.createQuery(validatedData);
      res.status(201).json(query);
    } catch (error) {
      console.error("Error creating query:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query configuration", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create query" });
    }
  });

  app.put("/api/queries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingQuery = await storage.getQuery(id);
      if (!existingQuery) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      const validatedData = queryRequestSchema.partial().parse(req.body);
      
      // If query changed, validate the new syntax
      if (validatedData.query) {
        const validation = await queryFederationService.validateQuery(validatedData.query);
        if (!validation.valid) {
          return res.status(400).json({ message: "Invalid query syntax", errors: validation.errors });
        }
      }
      
      const updatedQuery = await storage.updateQuery(id, validatedData);
      res.json(updatedQuery);
    } catch (error) {
      console.error("Error updating query:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query configuration", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update query" });
    }
  });

  app.delete("/api/queries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingQuery = await storage.getQuery(id);
      if (!existingQuery) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      await storage.deleteQuery(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting query:", error);
      res.status(500).json({ message: "Failed to delete query" });
    }
  });

  // API route for executing queries
  app.post("/api/execute-query", async (req, res) => {
    try {
      const validatedData = executeQueryRequestSchema.parse(req.body);
      
      if (!validatedData.queryId && !validatedData.query) {
        return res.status(400).json({ message: "Either queryId or query must be provided" });
      }
      
      let query;
      
      if (validatedData.queryId) {
        // Execute an existing query
        query = await storage.getQuery(validatedData.queryId);
        if (!query) {
          return res.status(404).json({ message: "Query not found" });
        }
      } else if (validatedData.query) {
        // Execute an ad-hoc query
        const validation = await queryFederationService.validateQuery(validatedData.query);
        if (!validation.valid) {
          return res.status(400).json({ message: "Invalid query syntax", errors: validation.errors });
        }
        
        // Create a temporary query object
        query = {
          id: 0,
          name: "Ad-hoc Query",
          query: validatedData.query,
          dataSources: [1, 2], // Assume we're using all data sources for ad-hoc queries
          collections: [],
          federationStrategy: "virtual",
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Execute the query using the federation service
      const result = await queryFederationService.executeQuery(query!, validatedData.params);
      
      res.json(result);
    } catch (error) {
      console.error("Error executing query:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to execute query" });
    }
  });

  // API route for getting collection schemas
  app.get("/api/data-sources/:id/collections/:collectionName/schema", async (req, res) => {
    try {
      const sourceId = parseInt(req.params.id);
      const collectionName = req.params.collectionName;
      
      const dataSource = await storage.getDataSource(sourceId);
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      const schema = await queryFederationService.getSourceCollectionSchema(sourceId, collectionName);
      if (!schema) {
        return res.status(404).json({ message: "Collection schema not found" });
      }
      
      res.json(schema);
    } catch (error) {
      console.error("Error fetching collection schema:", error);
      res.status(500).json({ message: "Failed to fetch collection schema" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
