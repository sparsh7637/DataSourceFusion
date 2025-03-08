import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import SystemOverview from "@/components/dashboard/system-overview";
import StatusCard from "@/components/dashboard/status-card";
import SourceCard from "@/components/data-sources/source-card";
import MappingCard from "@/components/schema-mapping/mapping-card";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AlertCircle, Database, Server, Activity, CircleAlert } from "lucide-react";

// Define the data source interface
interface DataSource {
  id: number;
  name: string;
  type: string;
  config: any;
  collections: any;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Define the schema mapping interface
interface SchemaMapping {
  id: number;
  name: string;
  sourceId: number;
  sourceCollection: string;
  targetId: number;
  targetCollection: string;
  mappingRules: any;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Define the query interface
interface Query {
  id: number;
  name: string;
  query: string;
  federationStrategy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export default function Dashboard() {
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [systemHealth, setSystemHealth] = useState<{
    firebase: 'connected' | 'disconnected' | 'sample',
    mongodb: 'connected' | 'disconnected' | 'sample'
  }>({
    firebase: 'disconnected',
    mongodb: 'disconnected'
  });

  // Fetch data sources
  const { data: dataSources = [], isLoading: isLoadingDataSources } = useQuery<DataSource[]>({
    queryKey: ["/api/data-sources"],
  });

  // Fetch schema mappings
  const { data: schemaMappings = [], isLoading: isLoadingMappings } = useQuery<SchemaMapping[]>({
    queryKey: ["/api/schema-mappings"],
  });

  // Fetch queries
  const { data: queries = [], isLoading: isLoadingQueries } = useQuery<Query[]>({
    queryKey: ["/api/queries"],
  });

  // Determine system health from data sources
  useEffect(() => {
    if (dataSources.length > 0) {
      const firebaseSource = dataSources.find((source: DataSource) => source.type === 'firebase');
      const mongoSource = dataSources.find((source: DataSource) => source.type === 'mongodb');
      
      setSystemHealth({
        firebase: firebaseSource ? 
          (firebaseSource.status === 'connected' && !firebaseSource.collections?.length) ? 'sample' : 
          firebaseSource.status === 'connected' ? 'connected' : 'sample' : 
          'disconnected',
        mongodb: mongoSource ? 
          (mongoSource.status === 'connected' && !mongoSource.collections?.length) ? 'sample' : 
          mongoSource.status === 'connected' ? 'connected' : 'sample' : 
          'disconnected',
      });
    }
  }, [dataSources]);

  const isLoading = isLoadingDataSources || isLoadingMappings || isLoadingQueries;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }
  
  // Check if using sample data
  const usingSampleData = systemHealth.firebase === 'sample' || systemHealth.mongodb === 'sample';

  return (
    <>
      {/* Sample Data Mode Warning */}
      {usingSampleData && (
        <div className="mb-6 border border-amber-300 bg-amber-50 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
            <div>
              <h4 className="font-medium text-amber-800">Using Sample Data Mode</h4>
              <p className="text-sm text-amber-700 mt-1">
                Some data sources are using sample data instead of real connections. 
                The system is running in demonstration mode with limited functionality.
              </p>
              <Link href="/data-sources">
                <Button variant="outline" size="sm" className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100">
                  Update Data Sources
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* System Health Card */}
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Activity className="mr-2 h-5 w-5 text-blue-500" />
            System Health
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                  <Server className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">Firebase</h3>
                  <p className="text-xs text-muted-foreground">Firestore Document Database</p>
                </div>
              </div>
              <Badge variant={
                systemHealth.firebase === 'connected' ? 'default' : 
                systemHealth.firebase === 'sample' ? 'outline' : 'destructive'
              }>
                {
                  systemHealth.firebase === 'connected' ? 'Connected' :
                  systemHealth.firebase === 'sample' ? 'Sample Mode' : 'Disconnected'
                }
              </Badge>
            </div>
            {systemHealth.firebase === 'sample' && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
                Using sample data. Real-time updates not available.
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <Database className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">MongoDB</h3>
                  <p className="text-xs text-muted-foreground">NoSQL Document Database</p>
                </div>
              </div>
              <Badge variant={
                systemHealth.mongodb === 'connected' ? 'default' : 
                systemHealth.mongodb === 'sample' ? 'outline' : 'destructive'
              }>
                {
                  systemHealth.mongodb === 'connected' ? 'Connected' :
                  systemHealth.mongodb === 'sample' ? 'Sample Mode' : 'Disconnected'
                }
              </Badge>
            </div>
            {systemHealth.mongodb === 'sample' && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
                Using sample data. Real-time updates not available.
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {/* System Overview */}
      <SystemOverview 
        dataSourcesCount={dataSources.length} 
        schemaMappingsCount={schemaMappings.length} 
        recentQueriesCount={queries.length} 
      />

      {/* Data Sources */}
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Data Sources</h3>
          <div className="flex space-x-2">
            <a href="/data-sources" className="text-blue-600 text-sm hover:underline">
              View All
            </a>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataSources.length === 0 ? (
            <div className="col-span-2 text-center py-8">
              <p className="text-gray-500">No data sources configured yet.</p>
              <a 
                href="/data-sources" 
                className="mt-2 inline-block text-blue-600 hover:underline"
              >
                Add your first data source
              </a>
            </div>
          ) : (
            dataSources.slice(0, 2).map((source: DataSource) => (
              <SourceCard
                key={source.id}
                dataSource={source}
                onEdit={(src: DataSource) => setEditingSource(src)}
              />
            ))
          )}
        </div>
      </Card>

      {/* Schema Mapping Preview */}
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Schema Mappings</h3>
          <div className="flex space-x-2">
            <a href="/schema-mapping" className="text-blue-600 text-sm hover:underline">
              View All
            </a>
          </div>
        </div>
        
        <div className="space-y-4">
          {schemaMappings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No schema mappings created yet.</p>
              <a 
                href="/schema-mapping" 
                className="mt-2 inline-block text-blue-600 hover:underline"
              >
                Create your first mapping
              </a>
            </div>
          ) : (
            schemaMappings.slice(0, 1).map((mapping: SchemaMapping) => (
              <MappingCard
                key={mapping.id}
                mapping={mapping}
                dataSources={dataSources as DataSource[]}
                onEdit={() => {}}
              />
            ))
          )}
        </div>
      </Card>

      {/* Recent Queries */}
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Queries</h3>
          <div className="flex space-x-2">
            <a href="/query-builder" className="text-blue-600 text-sm hover:underline">
              View All
            </a>
          </div>
        </div>
        
        <div className="space-y-2">
          {queries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No queries executed yet.</p>
              <a 
                href="/query-builder" 
                className="mt-2 inline-block text-blue-600 hover:underline"
              >
                Build your first query
              </a>
            </div>
          ) : (
            queries.slice(0, 3).map((query: Query) => (
              <Card key={query.id} className="p-4 border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-800">{query.name}</h4>
                    <div className="text-xs text-gray-500 mt-1">
                      Strategy: {query.federationStrategy}
                    </div>
                  </div>
                  <a 
                    href={`/results?queryId=${query.id}`}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    View Results
                  </a>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </>
  );
}
