import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExecutionDetails {
  executionTime: number;
  cacheHit: boolean;
  lastUpdated: string;
  nextUpdate: string | null;
  sourcesUsed: number;
  federationType: string;
}

interface ResultsTableProps {
  results: any[];
  executionDetails: ExecutionDetails;
  viewMode?: string;
}

export default function ResultsTable({ 
  results, 
  executionDetails,
  viewMode = "table"
}: ResultsTableProps) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  
  if (!results || !Array.isArray(results)) {
    return (
      <div className="text-center py-8 border border-gray-200 rounded-lg">
        <p className="text-gray-500">No results available</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8 border border-gray-200 rounded-lg">
        <p className="text-gray-500">Query executed successfully, but returned no results</p>
      </div>
    );
  }

  // Get all unique column names from the results
  const columns = [...new Set(results.flatMap(row => Object.keys(row)))];
  
  // Calculate pagination
  const totalPages = Math.ceil(results.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedResults = results.slice(startIndex, startIndex + rowsPerPage);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Calculate time until next update
  const getTimeUntilNextUpdate = () => {
    if (!executionDetails.nextUpdate) return "N/A";
    
    const now = new Date();
    const nextUpdate = new Date(executionDetails.nextUpdate);
    const diffMs = nextUpdate.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Due now";
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    
    return `${diffHours}h ${remainingMins}m`;
  };

  return (
    <div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {viewMode === "json" ? (
          <div className="p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs font-mono bg-gray-50 p-4 rounded">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedResults.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column) => (
                      <TableCell key={`${rowIndex}-${column}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row[column]?.toString() || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{paginatedResults.length}</span> of <span className="font-medium">{results.length}</span> results
          </div>
          {totalPages > 1 && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-1">Execution Details</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Query Time:</span>
              <span className="font-mono">{executionDetails.executionTime}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Sources Used:</span>
              <span className="font-mono">{executionDetails.sourcesUsed}</span>
            </div>
            <div className="flex justify-between">
              <span>Federation Type:</span>
              <span className="font-mono">{executionDetails.federationType}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-100 rounded-md p-4">
          <h4 className="text-sm font-medium text-green-800 mb-1">Data Transformations</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Type Conversions:</span>
              <span className="font-mono">2</span>
            </div>
            <div className="flex justify-between">
              <span>Field Mappings:</span>
              <span className="font-mono">{columns.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Join Strategy:</span>
              <span className="font-mono">Inner Join</span>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-100 rounded-md p-4">
          <h4 className="text-sm font-medium text-purple-800 mb-1">Cache Status</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Cache Hit:</span>
              <span className="font-mono">{executionDetails.cacheHit ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span className="font-mono">{executionDetails.lastUpdated ? formatDate(executionDetails.lastUpdated) : "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span>Next Update:</span>
              <span className="font-mono">{getTimeUntilNextUpdate()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
