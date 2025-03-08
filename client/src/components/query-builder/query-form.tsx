import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DataSource } from "@shared/schema";

const queryFormSchema = z.object({
  name: z.string().min(2, "Query name is required"),
  dataSources: z.array(z.number()).min(1, "At least one data source is required"),
  collections: z.array(z.string()).min(1, "At least one collection is required"),
  query: z.string().min(10, "Query is required"),
  federationStrategy: z.enum(["materialized", "virtual", "hybrid"]),
  params: z.record(z.any()).optional(),
});

interface QueryFormProps {
  dataSources: DataSource[];
  savedQueries: any[];
  onChange: (formData: any) => void;
}

export default function QueryForm({ dataSources, savedQueries, onChange }: QueryFormProps) {
  const { toast } = useToast();
  const [selectedDataSources, setSelectedDataSources] = useState<number[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<{[key: string]: string[]}>({});
  const [selectedSavedQuery, setSelectedSavedQuery] = useState<string | null>(null);

  const form = useForm<z.infer<typeof queryFormSchema>>({
    resolver: zodResolver(queryFormSchema),
    defaultValues: {
      name: "",
      dataSources: [],
      collections: [],
      query: "",
      federationStrategy: "virtual",
      params: {},
    },
  });

  // Watch for changes to update the parent component
  const formValues = form.watch();
  
  useEffect(() => {
    onChange(formValues);
  }, [formValues, onChange]);

  // Build available collections based on selected data sources
  useEffect(() => {
    const collections: {[key: string]: string[]} = {};
    
    selectedDataSources.forEach((sourceId) => {
      const source = dataSources.find((ds) => ds.id === sourceId);
      if (source && Array.isArray(source.collections)) {
        collections[source.name] = source.collections as string[];
      }
    });
    
    setAvailableCollections(collections);
    
    // Remove selected collections that are no longer available
    const flatAvailableCollections = Object.values(collections).flat();
    const validSelectedCollections = selectedCollections.filter(
      (collection) => flatAvailableCollections.includes(collection)
    );
    
    setSelectedCollections(validSelectedCollections);
    form.setValue("collections", validSelectedCollections);
  }, [selectedDataSources, dataSources]);

  // Handle data source selection
  const handleDataSourceChange = (sourceId: number, checked: boolean) => {
    let newSelectedSources;
    
    if (checked) {
      newSelectedSources = [...selectedDataSources, sourceId];
    } else {
      newSelectedSources = selectedDataSources.filter((id) => id !== sourceId);
    }
    
    setSelectedDataSources(newSelectedSources);
    form.setValue("dataSources", newSelectedSources);
  };

  // Handle collection selection
  const handleCollectionChange = (collection: string, checked: boolean) => {
    let newSelectedCollections;
    
    if (checked) {
      newSelectedCollections = [...selectedCollections, collection];
    } else {
      newSelectedCollections = selectedCollections.filter((c) => c !== collection);
    }
    
    setSelectedCollections(newSelectedCollections);
    form.setValue("collections", newSelectedCollections);
  };

  // Handle loading a saved query
  const handleLoadSavedQuery = (queryId: string) => {
    if (!queryId) {
      setSelectedSavedQuery(null);
      form.reset({
        name: "",
        dataSources: [],
        collections: [],
        query: "",
        federationStrategy: "virtual",
        params: {},
      });
      setSelectedDataSources([]);
      setSelectedCollections([]);
      return;
    }
    
    const query = savedQueries.find(q => q.id === parseInt(queryId));
    if (!query) return;
    
    setSelectedSavedQuery(queryId);
    
    // Update form values from saved query
    form.reset({
      name: query.name,
      dataSources: Array.isArray(query.dataSources) ? query.dataSources : [],
      collections: Array.isArray(query.collections) ? query.collections : [],
      query: query.query,
      federationStrategy: query.federationStrategy,
      params: {},
    });
    
    // Update selected data sources and collections
    setSelectedDataSources(Array.isArray(query.dataSources) ? query.dataSources : []);
    setSelectedCollections(Array.isArray(query.collections) ? query.collections : []);
    
    toast({
      title: "Query Loaded",
      description: `Loaded query: ${query.name}`,
    });
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Query Name</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input placeholder="User Purchase History" {...field} />
                    </FormControl>
                    
                    <Select value={selectedSavedQuery || ""} onValueChange={handleLoadSavedQuery}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Load Query" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">New Query</SelectItem>
                        {savedQueries.map((query) => (
                          <SelectItem key={query.id} value={String(query.id)}>
                            {query.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Data Sources</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {dataSources.length === 0 ? (
                  <p className="text-sm text-gray-500">No data sources available</p>
                ) : (
                  dataSources.map((source) => (
                    <label key={source.id} className="inline-flex items-center">
                      <Checkbox
                        checked={selectedDataSources.includes(source.id)}
                        onCheckedChange={(checked) => 
                          handleDataSourceChange(source.id, checked as boolean)
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">{source.name}</span>
                    </label>
                  ))
                )}
              </div>
              {form.formState.errors.dataSources && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.dataSources.message}
                </p>
              )}
            </div>
            
            <div>
              <FormLabel>Collections/Tables</FormLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.keys(availableCollections).length === 0 ? (
                  <p className="text-sm text-gray-500 col-span-2">
                    Select a data source to view available collections
                  </p>
                ) : (
                  Object.entries(availableCollections).map(([sourceName, collections]) => (
                    <div key={sourceName} className={`p-2 rounded-md text-sm ${
                      sourceName.toLowerCase().includes('firebase') 
                        ? 'bg-orange-50' 
                        : 'bg-green-50'
                    }`}>
                      <div className="font-medium text-gray-800 mb-1">{sourceName}</div>
                      <div className="flex flex-wrap gap-1">
                        {collections.map((collection) => {
                          const isSelected = selectedCollections.includes(collection);
                          return (
                            <Badge
                              key={collection}
                              variant={isSelected ? "default" : "outline"}
                              className={`px-2 py-1 cursor-pointer ${
                                isSelected 
                                  ? sourceName.toLowerCase().includes('firebase')
                                    ? 'bg-orange-100 border-orange-200 text-orange-800'
                                    : 'bg-green-100 border-green-200 text-green-800'
                                  : 'bg-white'
                              }`}
                              onClick={() => handleCollectionChange(collection, !isSelected)}
                            >
                              {collection}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {form.formState.errors.collections && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.collections.message}
                </p>
              )}
            </div>
          </div>
          
          <div>
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Query Builder</FormLabel>
                  <div className="border border-gray-300 rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300 flex space-x-2">
                      <Button type="button" size="sm" variant="secondary" className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Select</Button>
                      <Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded">Join</Button>
                      <Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded">Where</Button>
                      <Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded">Group</Button>
                      <Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded">Order</Button>
                    </div>
                    <FormControl>
                      <textarea
                        {...field}
                        className="p-3 font-mono text-sm bg-gray-800 text-gray-200 h-48 w-full"
                        placeholder="SELECT u.displayName, o.orderId, o.orderDate, t.amount, t.currency FROM users u JOIN orders o ON u.uid = o.userId JOIN transactions t ON o.orderId = t.orderId WHERE u.uid = :userId"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="federationStrategy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Federation Strategy</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <RadioGroup 
                  defaultValue={field.value} 
                  onValueChange={field.onChange}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <FormItem className="border border-gray-200 rounded-md p-3 bg-gray-50 flex">
                    <FormControl>
                      <RadioGroupItem value="materialized" id="materialized" />
                    </FormControl>
                    <div className="ml-2">
                      <Label htmlFor="materialized" className="font-medium text-gray-700">Materialized View</Label>
                      <p className="mt-1 text-xs text-gray-500">Creates and maintains a physical copy of the joined data with scheduled updates.</p>
                    </div>
                  </FormItem>
                  <FormItem className="border border-gray-200 rounded-md p-3 bg-gray-50 flex">
                    <FormControl>
                      <RadioGroupItem value="virtual" id="virtual" />
                    </FormControl>
                    <div className="ml-2">
                      <Label htmlFor="virtual" className="font-medium text-gray-700">Virtual View</Label>
                      <p className="mt-1 text-xs text-gray-500">Executes federated queries in real-time across data sources when requested.</p>
                    </div>
                  </FormItem>
                  <FormItem className="border border-gray-200 rounded-md p-3 bg-gray-50 flex">
                    <FormControl>
                      <RadioGroupItem value="hybrid" id="hybrid" />
                    </FormControl>
                    <div className="ml-2">
                      <Label htmlFor="hybrid" className="font-medium text-gray-700">Hybrid Approach</Label>
                      <p className="mt-1 text-xs text-gray-500">Uses cached results with real-time updates for optimal performance and freshness.</p>
                    </div>
                  </FormItem>
                </RadioGroup>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
