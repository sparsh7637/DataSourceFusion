import { Card, CardContent } from "@/components/ui/card";
import StatusCard from "./status-card";

interface SystemOverviewProps {
  dataSourcesCount: number;
  schemaMappingsCount: number;
  recentQueriesCount: number;
}

export default function SystemOverview({
  dataSourcesCount,
  schemaMappingsCount,
  recentQueriesCount
}: SystemOverviewProps) {
  return (
    <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard 
          title="Active Data Sources" 
          value={dataSourcesCount} 
          icon="sources"
          iconColor="text-green-600"
          bgColor="bg-green-100"
        />
        <StatusCard 
          title="Schema Mappings" 
          value={schemaMappingsCount} 
          icon="mappings"
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatusCard 
          title="Recent Queries" 
          value={recentQueriesCount} 
          icon="queries"
          iconColor="text-purple-600"
          bgColor="bg-purple-100"
        />
      </div>
    </Card>
  );
}
