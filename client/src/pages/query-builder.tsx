import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Save } from "lucide-react";
import QueryForm from "@/components/query-builder/query-form";
import ResultsTable from "@/components/results/results-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function QueryBuilder() {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [queryFormData, setQueryFormData] = useState<any | null>(null);
  
  // Fetch data sources
  const { data: dataSources = [], isLoading: isLoadingDataSources } = useQuery({
    queryKey: ["/api/data-sources"],
  });

  // Fetch existing queries
  const { data: savedQueries = [], isLoading: isLoadingQueries } = useQuery({
    queryKey: ["/api/queries"],
  });

  const isLoading = isLoadingDataSources || isLoadingQueries;

  const handleQueryChange = (formData: any) => {
    setQueryFormData(formData);
  };

  const executeQuery = async () => {
    if (!queryFormData || !queryFormData.query) {
      toast({
        title: "Error",
        description: "Please provide a query to execute",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setResults(null);
    
    try {
      const payload = {
        query: queryFormData.query,
        params: queryFormData.params || {},
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

  const saveQuery = async () => {
    if (!queryFormData || !queryFormData.name || !queryFormData.query) {
      toast({
        title: "Error",
        description: "Please provide a name and query to save",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const payload = {
        name: queryFormData.name,
        query: queryFormData.query,
        dataSources: queryFormData.dataSources || [],
        collections: queryFormData.collections || [],
        federationStrategy: queryFormData.federationStrategy || "virtual",
      };
      
      await apiRequest("POST", "/api/queries", payload);
      
      toast({
        title: "Query Saved",
        description: "Your query has been saved successfully",
      });
      
      // Refresh queries list
      queryClient.invalidateQueries({ queryKey: ["/api/queries"] });
    } catch (error) {
      console.error("Error saving query:", error);
      toast({
        title: "Error",
        description: "Failed to save query. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Query Builder</h3>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              onClick={saveQuery}
              disabled={isSaving || !queryFormData}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-700 mr-1"></div>
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Query
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={executeQuery}
              disabled={isExecuting || !queryFormData}
            >
              {isExecuting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-1"></div>
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Execute
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-gray-500">Loading...</p>
            </div>
          </div>
        ) : (
          <QueryForm 
            dataSources={dataSources}
            savedQueries={savedQueries}
            onChange={handleQueryChange}
          />
        )}
      </Card>

      {results && (
        <Card className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Results Preview</h3>
          </div>
          
          <ResultsTable 
            results={results.results} 
            executionDetails={{
              executionTime: results.executionTime,
              cacheHit: results.cacheHit,
              lastUpdated: results.lastUpdated,
              nextUpdate: results.nextUpdate,
              sourcesUsed: queryFormData?.dataSources?.length || 0,
              federationType: queryFormData?.federationStrategy || "virtual"
            }}
          />
        </Card>
      )}
    </>
  );
}
