import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import ResultsTable from "@/components/results/results-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Results() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [queryId, setQueryId] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState("table");
  
  // Parse query ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    const id = params.get('queryId');
    if (id) {
      setQueryId(parseInt(id));
    }
  }, [location]);

  // Fetch queries for selection
  const { data: queries = [], isLoading: isLoadingQueries } = useQuery({
    queryKey: ["/api/queries"],
  });

  // Fetch specific query details if ID is provided
  const { data: selectedQuery, isLoading: isLoadingSelectedQuery } = useQuery({
    queryKey: ["/api/queries", queryId],
    enabled: !!queryId,
  });

  // Auto-execute the selected query once loaded
  useEffect(() => {
    if (selectedQuery && !results) {
      executeQuery(selectedQuery.id);
    }
  }, [selectedQuery]);

  const executeQuery = async (id: number) => {
    setIsExecuting(true);
    setResults(null);
    
    try {
      const payload = {
        queryId: id,
      };
      
      const response = await apiRequest("POST", "/api/execute-query", payload);
      const data = await response.json();
      setResults(data);
      
      toast({
        title: "Query Executed",
        description: `Query completed in ${data.executionTime}ms`,
      });
    } catch (error) {
      console.error("Error executing query:", error);
      toast({
        title: "Error",
        description: "Failed to execute query. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleQueryChange = (id: string) => {
    setQueryId(parseInt(id));
    setResults(null);
  };

  const handleRefresh = () => {
    if (queryId) {
      executeQuery(queryId);
    }
  };

  const handleExport = () => {
    if (!results?.results) return;
    
    // Create a downloadable JSON file
    const dataStr = JSON.stringify(results.results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `query-results-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const isLoading = isLoadingQueries || isLoadingSelectedQuery;

  return (
    <>
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Query Results</h3>
          <div className="flex space-x-2">
            <Select 
              value={queryId ? String(queryId) : undefined} 
              onValueChange={handleQueryChange}
              disabled={isLoading || isExecuting}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select a query" />
              </SelectTrigger>
              <SelectContent>
                {queries.map((query) => (
                  <SelectItem key={query.id} value={String(query.id)}>
                    {query.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={!queryId || isExecuting}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-gray-500">Loading queries...</p>
            </div>
          </div>
        ) : !queryId ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <div className="rounded-full bg-blue-50 p-3 mb-4">
              <div className="rounded-full bg-blue-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">No Query Selected</h3>
            <p className="text-gray-500 mb-4 max-w-md">
              Please select a query from the dropdown above to view its results.
            </p>
            <a 
              href="/query-builder" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Create New Query
            </a>
          </div>
        ) : isExecuting ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-gray-500">Executing query...</p>
            </div>
          </div>
        ) : (
          results && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {selectedQuery?.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Federation Strategy: {selectedQuery?.federationStrategy}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={!results?.results?.length}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  
                  <Select value={viewMode} onValueChange={setViewMode}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Table View</SelectItem>
                      <SelectItem value="json">JSON View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <ResultsTable 
                results={results.results} 
                executionDetails={{
                  executionTime: results.executionTime,
                  cacheHit: results.cacheHit,
                  lastUpdated: results.lastUpdated,
                  nextUpdate: results.nextUpdate,
                  sourcesUsed: selectedQuery?.dataSources?.length || 0,
                  federationType: selectedQuery?.federationStrategy
                }}
                viewMode={viewMode}
              />
            </div>
          )
        )}
      </Card>
    </>
  );
}
