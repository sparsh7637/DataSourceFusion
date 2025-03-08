import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SourceCard from "@/components/data-sources/source-card";
import AddSourceDialog from "@/components/data-sources/add-source-dialog";
import type { DataSource } from "@shared/schema";

export default function DataSources() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);

  // Fetch data sources
  const { data: dataSources = [], isLoading } = useQuery({
    queryKey: ["/api/data-sources"],
  });

  const handleAddSource = () => {
    setEditingSource(null);
    setAddDialogOpen(true);
  };

  const handleEditSource = (source: DataSource) => {
    setEditingSource(source);
    setAddDialogOpen(true);
  };

  return (
    <>
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Data Sources</h3>
          <Button 
            onClick={handleAddSource}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Source
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-gray-500">Loading data sources...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.length === 0 ? (
              <div className="col-span-2 py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-blue-50 p-3 mb-4">
                    <div className="rounded-full bg-blue-100 p-3">
                      <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">No data sources yet</h3>
                  <p className="text-gray-500 mb-4 max-w-md text-center">
                    Connect to your first data source to start integrating and querying data across systems.
                  </p>
                  <Button 
                    onClick={handleAddSource}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Source
                  </Button>
                </div>
              </div>
            ) : (
              dataSources.map((source) => (
                <SourceCard
                  key={source.id}
                  dataSource={source}
                  onEdit={handleEditSource}
                />
              ))
            )}
          </div>
        )}
      </Card>

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        editingSource={editingSource}
      />
    </>
  );
}
