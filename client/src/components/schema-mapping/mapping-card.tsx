import { useState } from "react";
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { SchemaMapping, DataSource } from "@shared/schema";

interface MappingCardProps {
  mapping: SchemaMapping;
  dataSources: DataSource[];
  onEdit: (mapping: SchemaMapping) => void;
}

export default function MappingCard({
  mapping,
  dataSources,
  onEdit,
}: MappingCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const sourceDataSource = dataSources.find(ds => ds.id === mapping.sourceId);
  const targetDataSource = dataSources.find(ds => ds.id === mapping.targetId);
  
  const mappingRules = Array.isArray(mapping.mappingRules) 
    ? mapping.mappingRules 
    : [];

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this schema mapping?")) {
      setIsDeleting(true);
      try {
        await apiRequest('DELETE', `/api/schema-mappings/${mapping.id}`);
        toast({
          title: "Schema Mapping Deleted",
          description: `${mapping.name} has been removed.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/schema-mappings'] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete schema mapping.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (!sourceDataSource || !targetDataSource) {
    return (
      <Card className="border border-gray-200 rounded-lg overflow-hidden">
        <CardContent className="p-4">
          <div className="text-sm text-red-500">
            Data source not found. This mapping may reference deleted sources.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h4 className="text-md font-semibold text-gray-800">{mapping.name}</h4>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={mapping.status === 'active' ? 'success' : 'secondary'}
              className={`px-2 py-1 ${mapping.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} text-xs rounded-full`}
            >
              {mapping.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <CardContent className="px-6 py-4">
          <div className="flex justify-between mb-6">
            <div className="w-5/12">
              <div className="flex items-center mb-2">
                <div className={`h-3 w-3 rounded-full ${sourceDataSource.type === 'firebase' ? 'bg-orange-500' : 'bg-green-500'} mr-2`}></div>
                <h5 className="text-sm font-medium text-gray-800">
                  {sourceDataSource.name}: {mapping.sourceCollection}
                </h5>
              </div>
              <div className={`rounded-md p-3 border ${sourceDataSource.type === 'firebase' ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                <ul className="text-xs text-gray-600">
                  {mappingRules.map((rule: any, index: number) => (
                    <li key={index} className={`py-1 ${index < mappingRules.length - 1 ? 'border-b' : ''} ${sourceDataSource.type === 'firebase' ? 'border-orange-100' : 'border-green-100'}`}>
                      {rule.sourceField} 
                      <span className={`float-right ${sourceDataSource.type === 'firebase' ? 'text-orange-600' : 'text-green-600'}`}>
                        {rule.type === 'transform' ? 'transformed' : 'string'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="w-1/12 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 17L18 12L13 7M6 17L11 12L6 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <div className="w-5/12">
              <div className="flex items-center mb-2">
                <div className={`h-3 w-3 rounded-full ${targetDataSource.type === 'firebase' ? 'bg-orange-500' : 'bg-green-500'} mr-2`}></div>
                <h5 className="text-sm font-medium text-gray-800">
                  {targetDataSource.name}: {mapping.targetCollection}
                </h5>
              </div>
              <div className={`rounded-md p-3 border ${targetDataSource.type === 'firebase' ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                <ul className="text-xs text-gray-600">
                  {mappingRules.map((rule: any, index: number) => (
                    <li key={index} className={`py-1 ${index < mappingRules.length - 1 ? 'border-b' : ''} ${targetDataSource.type === 'firebase' ? 'border-orange-100' : 'border-green-100'}`}>
                      {rule.targetField} 
                      <span className={`float-right ${targetDataSource.type === 'firebase' ? 'text-orange-600' : 'text-green-600'}`}>
                        {rule.type === 'transform' ? 'date' : 'string'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Mapping Rules</h5>
            <div className="space-y-2">
              {mappingRules.map((rule: any, index: number) => (
                <div key={index} className="flex items-center text-xs">
                  <span className={`w-5/12 ${sourceDataSource.type === 'firebase' ? 'text-orange-600' : 'text-green-600'}`}>
                    {mapping.sourceCollection}.{rule.sourceField}
                  </span>
                  <span className="w-1/12 text-center text-gray-500">→</span>
                  <span className={`w-5/12 ${targetDataSource.type === 'firebase' ? 'text-orange-600' : 'text-green-600'}`}>
                    {mapping.targetCollection}.{rule.targetField}
                  </span>
                  <span className="w-1/12 text-gray-500 text-right">{rule.type}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(mapping)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
