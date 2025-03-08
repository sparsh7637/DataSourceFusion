import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Data Sources schema
export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "firebase" or "mongodb"
  config: jsonb("config").notNull(), // Connection details as JSON
  collections: jsonb("collections"), // Available collections/tables
  status: text("status").notNull().default("connected"), // "connected", "disconnected", "error"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDataSourceSchema = createInsertSchema(dataSources).pick({
  name: true,
  type: true,
  config: true,
  collections: true,
  status: true,
});

export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSource = typeof dataSources.$inferSelect;

// Schema Mappings
export const schemaMappings = pgTable("schema_mappings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sourceId: integer("source_id").notNull(), // Reference to first data source
  sourceCollection: text("source_collection").notNull(),
  targetId: integer("target_id").notNull(), // Reference to second data source
  targetCollection: text("target_collection").notNull(),
  mappingRules: jsonb("mapping_rules").notNull(), // Array of field mappings
  status: text("status").notNull().default("active"), // "active", "inactive"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSchemaMappingSchema = createInsertSchema(schemaMappings).pick({
  name: true,
  sourceId: true,
  sourceCollection: true,
  targetId: true,
  targetCollection: true,
  mappingRules: true,
  status: true,
});

export type InsertSchemaMapping = z.infer<typeof insertSchemaMappingSchema>;
export type SchemaMapping = typeof schemaMappings.$inferSelect;

// Queries
export const queries = pgTable("queries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  query: text("query").notNull(), // SQL-like query string
  dataSources: jsonb("data_sources").notNull(), // Array of data source IDs
  collections: jsonb("collections").notNull(), // Array of collections used
  federationStrategy: text("federation_strategy").notNull(), // "materialized", "virtual", "hybrid"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQuerySchema = createInsertSchema(queries).pick({
  name: true,
  query: true,
  dataSources: true,
  collections: true,
  federationStrategy: true,
});

export type InsertQuery = z.infer<typeof insertQuerySchema>;
export type Query = typeof queries.$inferSelect;

// Query Results (for caching materialized views)
export const queryResults = pgTable("query_results", {
  id: serial("id").primaryKey(),
  queryId: integer("query_id").notNull(),
  results: jsonb("results").notNull(),
  executionTime: integer("execution_time").notNull(), // in milliseconds
  lastUpdated: timestamp("last_updated").defaultNow(),
  nextUpdate: timestamp("next_update"),
});

export const insertQueryResultSchema = createInsertSchema(queryResults).pick({
  queryId: true,
  results: true,
  executionTime: true,
  nextUpdate: true,
});

export type InsertQueryResult = z.infer<typeof insertQueryResultSchema>;
export type QueryResult = typeof queryResults.$inferSelect;

// Zod schemas for validating API requests
export const dataSourceConfigSchema = z.object({
  firebase: z.object({
    projectId: z.string(),
    apiKey: z.string().optional(),
    authDomain: z.string().optional(),
    serviceAccountKey: z.record(z.any()).optional(),
  }).optional(),
  mongodb: z.object({
    uri: z.string(),
    database: z.string(),
  }).optional(),
});

export const mappingRuleSchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  type: z.enum(["direct", "custom", "transform"]),
  transform: z.string().optional(),
});

export const schemaMappingRequestSchema = z.object({
  name: z.string(),
  sourceId: z.number(),
  sourceCollection: z.string(),
  targetId: z.number(),
  targetCollection: z.string(),
  mappingRules: z.array(mappingRuleSchema),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const queryRequestSchema = z.object({
  name: z.string(),
  query: z.string(),
  dataSources: z.array(z.number()),
  collections: z.array(z.string()),
  federationStrategy: z.enum(["materialized", "virtual", "hybrid"]),
});

export const executeQueryRequestSchema = z.object({
  queryId: z.number().optional(),
  query: z.string().optional(),
  params: z.record(z.any()).optional(),
});
