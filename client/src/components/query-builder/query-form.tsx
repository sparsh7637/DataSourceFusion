
import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { DataSource, Query } from "@shared/schema";

interface QueryFormProps {
  dataSources: DataSource[];
  savedQueries?: Query[];
  onChange: (newQuery: any) => void;
  currentQuery?: any;
}

const QueryForm: React.FC<QueryFormProps> = ({
  dataSources,
  savedQueries = [],
  onChange,
  currentQuery = { dataSources: [], collections: [], name: "", query: "", federationStrategy: "virtual", params: {} }
}) => {
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    currentQuery.collections || []
  );
  const [availableCollections, setAvailableCollections] = useState<string[]>([]);

  // Update available collections when data sources change
  useEffect(() => {
    const collections: string[] = [];
    currentQuery.dataSources.forEach((sourceId: number) => {
      const source = dataSources.find((s: any) => s.id === sourceId);
      if (source && Array.isArray(source.collections)) {
        collections.push(...source.collections);
      }
    });
    setAvailableCollections([...new Set(collections)]);
  }, [currentQuery.dataSources, dataSources]);

  const handleCollectionChange = (collection: string, isChecked: boolean) => {
    let updatedCollections;
    if (isChecked) {
      updatedCollections = [...selectedCollections, collection];
    } else {
      updatedCollections = selectedCollections.filter((c) => c !== collection);
    }
    setSelectedCollections(updatedCollections);
    onChange({ ...currentQuery, collections: updatedCollections });
  };

  const handleDataSourceChange = (sourceId: number, isChecked: boolean) => {
    let updatedSources;
    if (isChecked) {
      updatedSources = [...currentQuery.dataSources, sourceId];
    } else {
      updatedSources = currentQuery.dataSources.filter(
        (id: number) => id !== sourceId
      );
    }
    onChange({ ...currentQuery, dataSources: updatedSources });
  };

  const handleQueryChange = (field: string, value: any) => {
    onChange({ ...currentQuery, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Query Name</Label>
        <Input
          id="name"
          value={currentQuery.name}
          onChange={(e) => handleQueryChange("name", e.target.value)}
          placeholder="My Query"
        />
      </div>

      <div>
        <Label>Data Sources</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          {dataSources.map((source) => (
            <Card key={source.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`source-${source.id}`}
                    checked={currentQuery.dataSources.includes(source.id)}
                    onChange={(e) => {
                      handleDataSourceChange(source.id, e.target.checked);
                    }}
                  />
                  <Label htmlFor={`source-${source.id}`} className="cursor-pointer">
                    {source.name} ({source.type})
                  </Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {availableCollections.length > 0 && (
        <div>
          <Label>Collections</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {availableCollections.map((collection) => (
              <div key={collection} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`collection-${collection}`}
                  checked={currentQuery.collections.includes(collection)}
                  onChange={(e) => {
                    handleCollectionChange(collection, e.target.checked);
                  }}
                />
                <Label htmlFor={`collection-${collection}`} className="cursor-pointer">
                  {collection}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="query">Query</Label>
        <Textarea
          id="query"
          value={currentQuery.query}
          onChange={(e) => handleQueryChange("query", e.target.value)}
          placeholder="SELECT * FROM collection WHERE condition"
          className="font-mono"
          rows={6}
        />
      </div>
    </div>
  );
};

export default QueryForm;
