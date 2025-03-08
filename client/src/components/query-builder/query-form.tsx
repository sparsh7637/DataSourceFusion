
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface QueryFormProps {
  currentQuery: any;
  dataSources: any[];
  onQueryChange: (field: string, value: any) => void;
}

const QueryForm: React.FC<QueryFormProps> = ({
  currentQuery,
  dataSources,
  onQueryChange,
}) => {
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
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
    onQueryChange("collections", updatedCollections);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Query Name</Label>
        <Input
          id="name"
          value={currentQuery.name}
          onChange={(e) => onQueryChange("name", e.target.value)}
          placeholder="My Query"
        />
      </div>

      <div>
        <Label>Federation Strategy</Label>
        <Select
          value={currentQuery.federationStrategy}
          onValueChange={(value) => onQueryChange("federationStrategy", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="virtual">Virtual View</SelectItem>
            <SelectItem value="materialized">Materialized View</SelectItem>
            <SelectItem value="hybrid">Hybrid Approach</SelectItem>
          </SelectContent>
        </Select>
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
                      const isChecked = e.target.checked;
                      let updatedSources;
                      if (isChecked) {
                        updatedSources = [...currentQuery.dataSources, source.id];
                      } else {
                        updatedSources = currentQuery.dataSources.filter(
                          (id: number) => id !== source.id
                        );
                      }
                      onQueryChange("dataSources", updatedSources);
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
          onChange={(e) => onQueryChange("query", e.target.value)}
          placeholder="SELECT * FROM collection WHERE condition"
          className="font-mono"
          rows={6}
        />
      </div>
    </div>
  );
};

export default QueryForm;
