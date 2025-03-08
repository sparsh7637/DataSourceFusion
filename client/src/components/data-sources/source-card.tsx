import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { DataSource } from "@shared/schema";

interface SourceCardProps {
  dataSource: DataSource;
  onEdit: (source: DataSource) => void;
}

export default function SourceCard({ dataSource, onEdit }: SourceCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  // Format the collections as an array
  const collections = Array.isArray(dataSource.collections) 
    ? dataSource.collections 
    : [];
    
  // Determine connection status
  const isConnected = dataSource.status === 'connected';
  const isSampleMode = isConnected && collections.length === 0;
  
  // Determine status display
  let statusColor = 'bg-green-500';
  let statusText = 'Connected';
  let statusTextColor = 'text-green-600';
  
  if (isSampleMode) {
    statusColor = 'bg-amber-400';
    statusText = 'Sample Mode';
    statusTextColor = 'text-amber-600';
  } else if (!isConnected) {
    statusColor = 'bg-red-500';
    statusText = 'Disconnected';
    statusTextColor = 'text-red-600';
  }

  // Determine gradient based on source type and connection status
  let gradientClass = dataSource.type === 'firebase' 
    ? 'bg-gradient-to-r from-red-50 to-orange-50' 
    : 'bg-gradient-to-r from-green-50 to-emerald-50';
    
  if (isSampleMode) {
    gradientClass = dataSource.type === 'firebase'
      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
      : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200';
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this data source?")) {
      setIsDeleting(true);
      try {
        await apiRequest('DELETE', `/api/data-sources/${dataSource.id}`);
        toast({
          title: "Data Source Deleted",
          description: `${dataSource.name} has been removed.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete data source.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Card className="border border-gray-200 rounded-lg overflow-hidden">
      <div className={`${gradientClass} px-6 py-4 border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {dataSource.type === 'firebase' ? (
              <svg className="h-8 w-8 text-orange-500" viewBox="0 0 32 32" fill="currentColor">
                <path d="M19.62 11.558l-3.203 2.98-2.972-5.995 1.538-3.448c.4-.7 1.024-.692 1.414 0l3.22 6.463zm-3.973 1.8l-9.14 8.535 2.958-12.653 2.04-2.272 4.142 6.39zm13.572-4.918L19.62 11.558l-3.23-6.46c-.394-.79-1.516-1.24-2.42-.286l-1.54 3.704-2.97-5.995c-.524-.805-1.9-.714-2.326.175l-3.84 7.596-.7 1.334c-.035.21.02.4.246.586l15.2 8.84 3.74-2.18c.345-.2.56-.33.56-.617l-.003-3.96c0-.382.37-.716.72-.757l1.8-.23c.34-.048.56-.33.56-.616v-1.95z"/>
              </svg>
            ) : (
              <svg className="h-8 w-8 text-green-600" viewBox="0 0 32 32" fill="currentColor">
                <path d="M15.9.087l.854 1.604c.192.296.4.558.645.802.715.715 1.394 1.464 2.004 2.266 1.447 1.9 2.423 4.01 3.12 6.292.418 1.394.645 2.824.662 4.27.07 4.323-1.412 8.035-4.4 11.12-.488.488-1.01.94-1.57 1.342-.296 0-.436-.227-.558-.436-.227-.383-.366-.82-.436-1.255-.105-.523-.174-1.046-.14-1.586v-.244c-.366-.13-.645-.436-.828-.767-.42-.296-.83-.592-1.257-.883-.662-.53-1.343-1.045-1.9-1.694-.374-.417-.645-.872-.918-1.323-.417-.73-.662-1.483-.78-2.266-.191-1.42-.087-2.824.313-4.185.645-2.075 1.9-3.872 3.363-5.5 1.032-1.15 2.18-2.162 3.43-3.033.77-.557 1.587-1.045 2.38-1.604.54-.313 1.06-.662 1.553-1.046.296-.21.506-.47.717-.767.105-.174.192-.383.21-.575.157-.196.157-.352.017-.567.336.135.39.44.097.643a31.67 31.67 0 00-1.553 2.962c-.21.452-.297.937-.23 1.414.105.767.273 1.517.575 2.232.6 1.39 1.447 2.617 2.533 3.694 1.484 1.483 3.233 2.496 5.174 3.12.93.313 1.9.54 2.882.662.12.017.23.07.366.105-1.76-1.085-3.12-2.496-3.964-4.374-.9-2.024-.952-4.2-.28-6.292.366-1.16.99-2.18 1.834-3.08.8-.867 1.76-1.518 2.882-1.883 1.814-.6 3.695-.522 5.443.28 1.06.488 1.97 1.15 2.734 2.042.767.9 1.342 1.95 1.694 3.12.3 1.01.38 2.042.227 3.12-.27 1.814-1.027 3.382-2.232 4.707-.967 1.07-2.18 1.832-3.59 2.25-.717.227-1.45.32-2.215.366-.68.035-1.325-.087-1.97-.28-.647-.18-1.24-.436-1.83-.713-.162-.087-.31-.035-.418.105-.05.087-.193.227-.227.366-1.68 2.617-3.553 5.117-5.634 7.476-1.097 1.225-2.267 2.38-3.555 3.43-.748.646-1.553 1.225-2.395 1.764-.68.452-1.44.835-2.215 1.116-.57.21-1.156.383-1.76.522-.106.035-.227.087-.336.087-.14.035-.28.07-.453.07L15.902.087z"/>
              </svg>
            )}
            <div className="ml-3">
              <h4 className="text-lg font-semibold text-gray-800">{dataSource.name}</h4>
              <div className="flex items-center">
                <span className={`inline-block h-2 w-2 rounded-full ${statusColor} mr-1`}></span>
                <span className={`text-sm ${statusTextColor}`}>{statusText}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(dataSource)}
            >
              <Edit className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      <CardContent className="px-6 py-4">
        <div className="mb-3">
          <h5 className="text-sm font-medium text-gray-600 mb-1">Collections</h5>
          <div className="flex flex-wrap gap-2">
            {collections.length > 0 ? (
              collections.map((collection, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-800"
                >
                  {collection}
                </Badge>
              ))
            ) : (
              <div className="w-full">
                {isSampleMode ? (
                  <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 text-xs">
                    <div className="font-medium mb-1">Using Sample Data Collections</div>
                    <p>This data source is using pre-defined sample collections.</p>
                    <p className="mt-1">To use real collections, please update source configuration.</p>
                  </div>
                ) : (
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-500 text-xs">
                    No collections available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <h5 className="text-sm font-medium text-gray-600 mb-1">Configuration</h5>
          <div className="text-xs text-gray-600 font-mono truncate bg-gray-50 rounded p-2">
            {dataSource.type === 'firebase' 
              ? `projectId: "${dataSource.config?.projectId || 'N/A'}"` 
              : `uri: "${dataSource.config?.uri ? dataSource.config.uri.replace(/:[^\/]+@/, ':****@') : 'N/A'}"`}
          </div>
          
          {isSampleMode && (
            <div className="mt-2 flex items-start space-x-2">
              <div className="text-amber-500 flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <p className="text-xs text-amber-700">
                Using demonstration data. Click edit to update credentials and connect to your {dataSource.type === 'firebase' ? 'Firebase' : 'MongoDB'} instance.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
