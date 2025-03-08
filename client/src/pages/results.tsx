import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Database, Code, DownloadIcon, CopyIcon, BarChart3Icon, TableIcon, FilterIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Results() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [queryResults, setQueryResults] = useState<any>(null);
  const [visibleResults, setVisibleResults] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<string>("table");
  const [filterText, setFilterText] = useState<string>("");
  const [showSourceInfo, setShowSourceInfo] = useState<boolean>(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  useEffect(() => {
    // Load results from localStorage
    const resultsData = localStorage.getItem("queryResults");
    if (resultsData) {
      try {
        const parsedResults = JSON.parse(resultsData);
        setQueryResults(parsedResults);
        
        if (Array.isArray(parsedResults.results) && parsedResults.results.length > 0) {
          // Extract available columns from the first result
          const columns = Object.keys(parsedResults.results[0]);
          setAvailableColumns(columns);
          setSelectedColumns(columns);
          
          // Set initial visible results
          setVisibleResults(parsedResults.results);
        }
      } catch (error) {
        console.error("Error parsing results:", error);
      }
    }
  }, []);

  // Apply filters and column selection
  useEffect(() => {
    if (!queryResults || !Array.isArray(queryResults.results)) return;
    
    let filtered = [...queryResults.results];
    
    // Apply text filter if provided
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(row => {
        return Object.values(row).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(lowerFilter);
        });
      });
    }
    
    setVisibleResults(filtered);
  }, [queryResults, filterText, selectedColumns]);

  // Handle going back to the query builder
  const handleBackToBuilder = () => {
    navigate("/query-builder");
  };

  // Handle copying results to clipboard
  const handleCopyResults = () => {
    if (!visibleResults.length) return;
    
    // Create a version with only selected columns
    const filteredResults = visibleResults.map(row => {
      const filteredRow: Record<string, any> = {};
      selectedColumns.forEach(col => {
        filteredRow[col] = row[col];
      });
      return filteredRow;
    });
    
    navigator.clipboard.writeText(JSON.stringify(filteredResults, null, 2));
    
    toast({
      title: "Copied to Clipboard",
      description: `Copied ${filteredResults.length} results to clipboard`,
    });
  };

  // Handle downloading results as JSON
  const handleDownloadResults = () => {
    if (!visibleResults.length) return;
    
    // Create a version with only selected columns
    const filteredResults = visibleResults.map(row => {
      const filteredRow: Record<string, any> = {};
      selectedColumns.forEach(col => {
        filteredRow[col] = row[col];
      });
      return filteredRow;
    });
    
    const dataStr = JSON.stringify(filteredResults, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportName = "query-results.json";
    
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportName);
    linkElement.click();
  };

  // Handle column toggle
  const handleColumnToggle = (column: string) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(col => col !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Button 
            variant="ghost"
            size="sm"
            onClick={handleBackToBuilder}
            className="mr-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Builder
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Query Results</h1>
        </div>
      </div>

      {queryResults ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Results Overview
              </CardTitle>
              <CardDescription>
                {`Retrieved ${queryResults.results.length} records in ${queryResults.executionTime}ms`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Result Details</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Execution Time:</span>
                      <span className="text-sm font-medium">{queryResults.executionTime}ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Updated:</span>
                      <span className="text-sm font-medium">
                        {new Date(queryResults.lastUpdated).toLocaleString()}
                      </span>
                    </div>
                    {queryResults.nextUpdate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Next Update:</span>
                        <span className="text-sm font-medium">
                          {new Date(queryResults.nextUpdate).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cache Hit:</span>
                      <span className="text-sm font-medium">
                        {queryResults.cacheHit ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Result Operations</div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="show-source" 
                          checked={showSourceInfo} 
                          onCheckedChange={setShowSourceInfo} 
                        />
                        <Label htmlFor="show-source">Show Source Info</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label>View:</Label>
                        <div className="flex border rounded-md overflow-hidden">
                          <Button
                            size="sm"
                            variant={viewMode === "table" ? "default" : "ghost"}
                            className="rounded-none"
                            onClick={() => setViewMode("table")}
                          >
                            <TableIcon className="h-4 w-4 mr-1" />
                            Table
                          </Button>
                          <Button
                            size="sm"
                            variant={viewMode === "json" ? "default" : "ghost"}
                            className="rounded-none"
                            onClick={() => setViewMode("json")}
                          >
                            <Code className="h-4 w-4 mr-1" />
                            JSON
                          </Button>
                        </div>
                      </div>
                    </div>
                  
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="filter">Filter Results:</Label>
                      <div className="flex rounded-md overflow-hidden">
                        <div className="relative flex-grow">
                          <FilterIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="filter"
                            placeholder="Filter by any value..."
                            className="pl-8"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-muted-foreground">
                    Showing {visibleResults.length} of {queryResults.results.length} results
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleCopyResults}
                    >
                      <CopyIcon className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleDownloadResults}
                    >
                      <DownloadIcon className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              
                {viewMode === "table" ? (
                  <div className="border rounded-md overflow-auto max-h-[calc(100vh-400px)]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          {availableColumns.map(col => (
                            <th 
                              key={col} 
                              className={`px-4 py-2 text-left font-medium ${
                                selectedColumns.includes(col) ? "" : "opacity-50"
                              }`}
                            >
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <Switch 
                                  checked={selectedColumns.includes(col)}
                                  onCheckedChange={() => handleColumnToggle(col)}
                                  size="sm"
                                />
                                <span>{col}</span>
                              </label>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleResults.map((row, i) => (
                          <tr key={i} className="border-t">
                            {availableColumns.map(col => (
                              <td 
                                key={`${i}-${col}`} 
                                className={`px-4 py-2 ${
                                  selectedColumns.includes(col) ? "" : "opacity-50"
                                }`}
                              >
                                {(() => {
                                  const value = row[col];
                                  if (value === null || value === undefined) return "-";
                                  if (typeof value === 'object') return JSON.stringify(value).substring(0, 50);
                                  return String(value);
                                })()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-muted rounded-md p-4 overflow-auto max-h-[calc(100vh-400px)]">
                    <pre className="text-sm font-mono">
                      {JSON.stringify(visibleResults, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Results Available</CardTitle>
            <CardDescription>
              No query results found. Run a query first.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleBackToBuilder}>Go to Query Builder</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
