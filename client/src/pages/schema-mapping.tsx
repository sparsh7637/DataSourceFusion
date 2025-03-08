import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import MappingCard from "@/components/schema-mapping/mapping-card";
import CreateMappingDialog from "@/components/schema-mapping/create-mapping-dialog";
import type { SchemaMapping } from "@shared/schema";

export default function SchemaMapping() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<SchemaMapping | null>(null);

  // Fetch schema mappings
  const { data: schemaMappings = [], isLoading: isLoadingMappings } = useQuery({
    queryKey: ["/api/schema-mappings"],
  });

  // Fetch data sources (needed for mapping references)
  const { data: dataSources = [], isLoading: isLoadingDataSources } = useQuery({
    queryKey: ["/api/data-sources"],
  });

  const isLoading = isLoadingMappings || isLoadingDataSources;

  const handleCreateMapping = () => {
    setEditingMapping(null);
    setCreateDialogOpen(true);
  };

  const handleEditMapping = (mapping: SchemaMapping) => {
    setEditingMapping(mapping);
    setCreateDialogOpen(true);
  };

  return (
    <>
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Schema Mapping</h3>
          <Button 
            onClick={handleCreateMapping}
            className="bg-violet-600 hover:bg-violet-700 text-white font-medium"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Mapping
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-600 mb-2"></div>
              <p className="text-gray-500">Loading schema mappings...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {schemaMappings.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-violet-50 p-3 mb-4">
                    <div className="rounded-full bg-violet-100 p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">No schema mappings yet</h3>
                  <p className="text-gray-500 mb-4 max-w-md text-center">
                    Create your first schema mapping to define relationships between data sources.
                  </p>
                  <Button 
                    onClick={handleCreateMapping}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-medium"
                    disabled={dataSources.length < 2}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Mapping
                  </Button>
                  {dataSources.length < 2 && (
                    <p className="text-xs text-orange-600 mt-2">
                      You need at least two data sources to create a mapping.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              schemaMappings.map((mapping) => (
                <MappingCard
                  key={mapping.id}
                  mapping={mapping}
                  dataSources={dataSources}
                  onEdit={handleEditMapping}
                />
              ))
            )}
          </div>
        )}
      </Card>

      <CreateMappingDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        dataSources={dataSources}
        editingMapping={editingMapping}
      />
    </>
  );
}
