import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import SystemOverview from "@/components/dashboard/system-overview";
import StatusCard from "@/components/dashboard/status-card";
import SourceCard from "@/components/data-sources/source-card";
import MappingCard from "@/components/schema-mapping/mapping-card";
import { useState } from "react";

export default function Dashboard() {
  const [editingSource, setEditingSource] = useState(null);

  // Fetch data sources
  const { data: dataSources = [], isLoading: isLoadingDataSources } = useQuery({
    queryKey: ["/api/data-sources"],
  });

  // Fetch schema mappings
  const { data: schemaMappings = [], isLoading: isLoadingMappings } = useQuery({
    queryKey: ["/api/schema-mappings"],
  });

  // Fetch queries
  const { data: queries = [], isLoading: isLoadingQueries } = useQuery({
    queryKey: ["/api/queries"],
  });

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

  return (
    <>
      {/* System Status Card */}
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
            dataSources.slice(0, 2).map((source) => (
              <SourceCard
                key={source.id}
                dataSource={source}
                onEdit={setEditingSource}
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
            schemaMappings.slice(0, 1).map((mapping) => (
              <MappingCard
                key={mapping.id}
                mapping={mapping}
                dataSources={dataSources}
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
            queries.slice(0, 3).map((query) => (
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
