import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import QueryForm from "@/components/query-builder/query-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, AlertTriangle, ChevronRight, Code, Database, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLocation } from "wouter";
import type { DataSource, Query } from "@shared/schema";

export default function QueryBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [currentQuery, setCurrentQuery] = useState<any>({
    name: "",
    dataSources: [],
    collections: [],
    query: "",
    federationStrategy: "virtual",
    params: {},
  });
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryExecutionResults, setQueryExecutionResults] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [selectedQueryId, setSelectedQueryId] = useState<number | null>(null);

  // Fetch data sources
  const { data: dataSources = [], isLoading: isLoadingDataSources } = useQuery({
    queryKey: ['/api/data-sources'],
    enabled: true,
  });

  // Fetch saved queries
  const { data: savedQueries = [], isLoading: isLoadingSavedQueries } = useQuery({
    queryKey: ['/api/queries'],
    enabled: true,
  });

  // Create a new query
  const createQueryMutation = useMutation({
    mutationFn: async (query: any) => {
      const response = await apiRequest('POST', '/api/queries', query);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queries'] });
      toast({
        title: "Query Created",
        description: "Your query has been saved successfully!",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create query",
        variant: "destructive",
      });
    },
  });

  // Update an existing query
  const updateQueryMutation = useMutation({
    mutationFn: async (query: any) => {
      const response = await apiRequest('PUT', `/api/queries/${query.id}`, query);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queries'] });
      toast({
        title: "Query Updated",
        description: "Your query has been updated successfully!",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update query",
        variant: "destructive",
      });
    },
  });

  // Execute query
  const executeQueryMutation = useMutation({
    mutationFn: async (data: { queryId?: number; query?: any; params?: any }) => {
      const response = await apiRequest('POST', '/api/execute-query', data);
      return response.json();
    },
    onSuccess: (data) => {
      setQueryExecutionResults(data);
      toast({
        title: "Query Executed",
        description: `Retrieved ${data.results.length} results in ${data.executionTime}ms`,
      });
    },
    onError: (error: any) => {
      setQueryError(error.message || "Failed to execute query");
      toast({
        title: "Query Execution Failed",
        description: error.message || "An error occurred while executing the query",
        variant: "destructive",
      });
    },
  });

  // Handle form changes
  const handleQueryFormChange = (formData: any) => {
    setCurrentQuery(formData);
    // Clear any previous errors
    setQueryError(null);
  };

  // Handle save query
  const handleSaveQuery = () => {
    if (!currentQuery.name || !currentQuery.query || currentQuery.dataSources.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name, query, and select at least one data source",
        variant: "destructive",
      });
      return;
    }

    if (selectedQueryId) {
      // Update existing query
      updateQueryMutation.mutate({
        id: selectedQueryId,
        ...currentQuery,
      });
    } else {
      // Create new query
      createQueryMutation.mutate(currentQuery);
    }
  };

  const handleFetchData = async (dataSource: string, collection: string) => {
    // Build a simple SELECT * query for the given collection, limiting to 20 entries
    const simpleQuery = `SELECT * FROM ${collection} LIMIT 20`;

    // Execute the query
    await executeQueryMutation.mutateAsync({
      query: simpleQuery,
      params: {},
      dataSources: [dataSource],
      collections: [collection],
      federationStrategy: "virtual"
    });
  };

  // Handle execute query -  This remains largely unchanged, but could be adapted if needed.
  const handleExecuteQuery = async () => {
    if (!currentQuery) return;

    // Execute the query
    await executeQueryMutation.mutateAsync({
      query: currentQuery.query,
      params: currentQuery.params,
      dataSources: currentQuery.dataSources,
      collections: currentQuery.collections,
      federationStrategy: currentQuery.federationStrategy
    });
  };

  // Handle view results
  const handleViewResults = () => {
    // Store the results in local storage for the results page
    if (queryExecutionResults) {
      localStorage.setItem('queryResults', JSON.stringify(queryExecutionResults));
      navigate('/results');
    }
  };

  // Add a button to fetch data.  This assumes a mechanism exists to select a datasource and collection.
  //  This section needs significant expansion to handle selecting data sources and collections in a user-friendly way
  const handleFetchDataClick = async () => {
    //  Placeholder: Replace with actual datasource and collection selection logic
    const dataSourceId = dataSources[0].id; // Select the first datasource (needs improvement)
    const collectionName = "users"; // Placeholder: Needs user input or selection mechanism


    await handleFetchData(dataSourceId, collectionName);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Query Builder</h1>
          <p className="text-muted-foreground">
            Create, save, and execute federated queries across data sources
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentQuery({
                name: "",
                dataSources: [],
                collections: [],
                query: "",
                federationStrategy: "virtual",
                params: {},
              });
              setSelectedQueryId(null);
              setIsEditing(true);
              setQueryExecutionResults(null);
              setQueryError(null);
            }}
          >
            New Query
          </Button>
          {!isEditing && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit Query
            </Button>
          )}
          <Button onClick={handleFetchDataClick}>Fetch Data</Button> {/* Added Fetch Data button */}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoadingDataSources || isLoadingSavedQueries ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {isEditing ? (
              <Card>
                <CardHeader>
                  <CardTitle>Build Your Query</CardTitle>
                  <CardDescription>
                    Select data sources, collections, and write your query
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QueryForm
                    dataSources={dataSources as DataSource[]}
                    savedQueries={savedQueries as Query[]}
                    onChange={handleQueryFormChange}
                  />
                </CardContent>
                <CardFooter className="flex justify-between pt-4 border-t">
                  <Button
                    variant="secondary"
                    onClick={handleSaveQuery}
                    disabled={createQueryMutation.isPending || updateQueryMutation.isPending}
                  >
                    {createQueryMutation.isPending || updateQueryMutation.isPending ? "Saving..." : "Save Query"}
                  </Button>
                  <Button
                    onClick={handleExecuteQuery}
                    disabled={executeQueryMutation.isPending}
                  >
                    {executeQueryMutation.isPending ? "Executing..." : "Execute Query"}
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{currentQuery.name}</CardTitle>
                  <CardDescription>
                    {`Query using ${currentQuery.federationStrategy} federation strategy across ${currentQuery.dataSources.length} data sources`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-md bg-secondary/50 p-4">
                      <pre className="text-sm font-mono whitespace-pre-wrap">{currentQuery.query}</pre>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className="text-sm font-medium mr-2">Data Sources:</div>
                      {currentQuery.dataSources.map((sourceId: number) => {
                        const source = dataSources.find((s: DataSource) => s.id === sourceId);
                        return source ? (
                          <span key={sourceId} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                            {source.name}
                          </span>
                        ) : null;
                      })}
                    </div>

                    {currentQuery.collections && currentQuery.collections.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <div className="text-sm font-medium mr-2">Collections:</div>
                        {currentQuery.collections.map((collection: string) => (
                          <span key={collection} className="px-2 py-1 bg-secondary/20 text-secondary-foreground text-xs rounded-full">
                            {collection}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Removed Accordion for Parameters */}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-4 border-t">
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Query
                  </Button>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleExecuteQuery}
                      disabled={executeQueryMutation.isPending}
                    >
                      {executeQueryMutation.isPending ? "Executing..." : "Execute Query"}
                    </Button>
                    {queryExecutionResults && (
                      <Button
                        variant="outline"
                        onClick={handleViewResults}
                      >
                        View Results <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            )}

            {queryError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Query Execution Error</AlertTitle>
                <AlertDescription>
                  {queryError}
                </AlertDescription>
              </Alert>
            )}

            {queryExecutionResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="mr-2 h-5 w-5" />
                    Query Results
                  </CardTitle>
                  <CardDescription>
                    {`Retrieved ${queryExecutionResults.results.length} records in ${queryExecutionResults.executionTime}ms`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Last Updated:</span>
                        <span>{new Date(queryExecutionResults.lastUpdated).toLocaleString()}</span>
                      </div>
                      {queryExecutionResults.cacheHit && (
                        <div className="flex items-center text-green-600">
                          <Check className="mr-1 h-4 w-4" />
                          <span>Cache Hit</span>
                        </div>
                      )}
                    </div>

                    <Tabs defaultValue="preview">
                      <TabsList>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                        <TabsTrigger value="json">JSON</TabsTrigger>
                      </TabsList>
                      <TabsContent value="preview">
                        <div className="border rounded-md overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted">
                                {queryExecutionResults.results.length > 0 &&
                                  Object.keys(queryExecutionResults.results[0]).map((key) => (
                                    <th key={key} className="px-4 py-2 text-left font-medium">
                                      {key}
                                    </th>
                                  ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryExecutionResults.results.slice(0, 20).map((row: any, i: number) => ( // Increased limit to 20
                                <tr key={i} className="border-t">
                                  {Object.values(row).map((value: any, j: number) => (
                                    <td key={j} className="px-4 py-2">
                                      {typeof value === 'object'
                                        ? JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
                                        : String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '')
                                      }
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {queryExecutionResults.results.length > 20 && ( // Increased limit to 20
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              Showing 20 of {queryExecutionResults.results.length} results.
                              <Button
                                variant="link"
                                onClick={handleViewResults}
                                className="ml-1"
                              >
                                View all
                              </Button>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="json">
                        <div className="relative rounded-md bg-muted/50 p-4">
                          <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-80">
                            {JSON.stringify(queryExecutionResults.results, null, 2)}
                          </pre>
                          <div className="absolute top-2 right-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(queryExecutionResults.results, null, 2));
                                toast({
                                  title: "Copied",
                                  description: "JSON copied to clipboard",
                                });
                              }}
                            >
                              <Code className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
                <CardFooter className="justify-end pt-4 border-t">
                  <Button
                    onClick={handleViewResults}
                  >
                    View Full Results
                  </Button>
                </CardFooter>
              </Card>
            )}

            {queryError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Query Execution Error</AlertTitle>
                <AlertDescription>
                  {queryError}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </div>
  );
}