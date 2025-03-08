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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
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
  const [activeTab, setActiveTab] = useState<string>("builder");
  const [sourceSchemas, setSourceSchemas] = useState<{[key: number]: any}>({});
  const [queryParameters, setQueryParameters] = useState<{name: string, value: string}[]>([]);

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
    // Convert parameters to params object
    const params: {[key: string]: any} = {};
    queryParameters.forEach(param => {
      if (param.name && param.value) {
        try {
          // Try to parse as JSON first
          params[param.name] = JSON.parse(param.value);
        } catch (e) {
          // If not valid JSON, store as string
          params[param.name] = param.value;
        }
      }
    });
    
    onChange({ ...formValues, params });
  }, [formValues, queryParameters, onChange]);

  // Load collections for selected data sources
  useEffect(() => {
    const fetchCollections = async () => {
      const collections: {[key: string]: string[]} = {};
      const schemas: {[key: number]: any} = {};
      
      for (const sourceId of selectedDataSources) {
        try {
          const source = dataSources.find(ds => ds.id === sourceId);
          if (!source) continue;
          
          // Fetch collections from the API
          const response = await apiRequest('GET', `/api/data-sources/${sourceId}/collections`);
          const collectionNames = await response.json();
          
          if (Array.isArray(collectionNames) && collectionNames.length > 0) {
            collections[source.name] = collectionNames;
            
            // Fetch schema for each collection
            for (const collName of collectionNames) {
              try {
                const schemaResp = await apiRequest('GET', `/api/data-sources/${sourceId}/collections/${collName}/schema`);
                const schema = await schemaResp.json();
                
                if (!schemas[sourceId]) schemas[sourceId] = {};
                schemas[sourceId][collName] = schema;
              } catch (err) {
                console.error(`Error fetching schema for ${collName}:`, err);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching collections for source ${sourceId}:`, error);
          // If API fails, use collections from data source if available
          const source = dataSources.find(ds => ds.id === sourceId);
          if (source && Array.isArray(source.collections)) {
            collections[source.name] = source.collections as string[];
          }
        }
      }
      
      setAvailableCollections(collections);
      setSourceSchemas(schemas);
      
      // Remove selected collections that are no longer available
      const flatAvailableCollections = Object.values(collections).flat();
      const validSelectedCollections = selectedCollections.filter(
        (collection) => flatAvailableCollections.includes(collection)
      );
      
      setSelectedCollections(validSelectedCollections);
      form.setValue("collections", validSelectedCollections);
    };
    
    if (selectedDataSources.length > 0) {
      fetchCollections();
    } else {
      setAvailableCollections({});
      setSourceSchemas({});
    }
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
    
    // Auto-generate a simple query when collections are selected
    if (newSelectedCollections.length > 0 && form.getValues("query") === "") {
      const collection = newSelectedCollections[0];
      generateSampleQuery(collection);
    }
  };
  
  // Generate a simple sample query based on selected collection
  const generateSampleQuery = (collectionName: string) => {
    // Find which data source this collection belongs to
    let dataSourceId: number | null = null;
    let fields: string[] = ["*"];
    
    // Look through available collections to find the source
    for (const [sourceName, collections] of Object.entries(availableCollections)) {
      if (collections.includes(collectionName)) {
        // Find the data source ID
        const source = dataSources.find(ds => ds.name === sourceName);
        if (source) {
          dataSourceId = source.id;
        }
        break;
      }
    }
    
    // If we have schema information, use specific fields
    if (dataSourceId && sourceSchemas[dataSourceId] && sourceSchemas[dataSourceId][collectionName]) {
      const schema = sourceSchemas[dataSourceId][collectionName];
      if (schema.fields && Array.isArray(schema.fields)) {
        fields = schema.fields.slice(0, 5).map((f: any) => f.name);
      }
    }
    
    // Create a simple SELECT query
    const sampleQuery = `SELECT ${fields.join(', ')} FROM ${collectionName} LIMIT 10`;
    form.setValue("query", sampleQuery);
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
      setQueryParameters([]);
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
    
    // Extract parameters from the query
    extractQueryParameters(query.query);
    
    toast({
      title: "Query Loaded",
      description: `Loaded query: ${query.name}`,
    });
  };
  
  // Extract parameters from the query (look for :paramName patterns)
  const extractQueryParameters = (query: string) => {
    const paramRegex = /:([a-zA-Z0-9_]+)/g;
    const matches = query.match(paramRegex);
    
    if (matches) {
      const uniqueParams = [...new Set(matches)];
      const newParams = uniqueParams.map(param => ({
        name: param.substring(1), // Remove the leading :
        value: ""
      }));
      setQueryParameters(newParams);
    } else {
      setQueryParameters([]);
    }
  };
  
  // Update parameter value
  const updateParameterValue = (index: number, value: string) => {
    const newParams = [...queryParameters];
    newParams[index].value = value;
    setQueryParameters(newParams);
  };
  
  // Add a new parameter
  const addParameter = () => {
    setQueryParameters([...queryParameters, { name: '', value: '' }]);
  };
  
  // Remove a parameter
  const removeParameter = (index: number) => {
    const newParams = [...queryParameters];
    newParams.splice(index, 1);
    setQueryParameters(newParams);
  };
  
  // Update parameter name
  const updateParameterName = (index: number, name: string) => {
    const newParams = [...queryParameters];
    newParams[index].name = name;
    setQueryParameters(newParams);
  };
  
  // When query changes, extract parameters
  useEffect(() => {
    const query = form.getValues("query");
    if (query) {
      extractQueryParameters(query);
    }
  }, [form.watch("query")]);

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
                        <SelectItem value="new">New Query</SelectItem>
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
                  <Tabs defaultValue="builder" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-2 grid grid-cols-2">
                      <TabsTrigger value="builder">SQL Query</TabsTrigger>
                      <TabsTrigger value="params">Parameters</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="builder">
                      <div className="border border-gray-300 rounded-md overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-300 flex space-x-2">
                          <Button type="button" size="sm" variant="secondary" className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Select</Button>
                          <Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded">From</Button>
                          <Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded">Where</Button>
                          <Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded">Order By</Button>
                          <Button type="button" size="sm" variant="ghost" className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded">Limit</Button>
                        </div>
                        <FormControl>
                          <textarea
                            {...field}
                            className="p-3 font-mono text-sm bg-gray-800 text-gray-200 h-48 w-full"
                            placeholder="SELECT users.name, orders.orderId, orders.orderDate FROM users JOIN orders ON users.uid = orders.userId WHERE users.uid = :userId LIMIT 10"
                          />
                        </FormControl>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="params">
                      <div className="border border-gray-300 rounded-md p-3">
                        <div className="space-y-2">
                          {queryParameters.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-4">
                              No parameters found in the query.<br />
                              Add parameters in your query using ':paramName' syntax.
                            </div>
                          ) : (
                            queryParameters.map((param, index) => (
                              <div key={index} className="flex space-x-2 items-center">
                                <div className="w-1/3">
                                  <Input 
                                    value={param.name}
                                    onChange={(e) => updateParameterName(index, e.target.value)}
                                    placeholder="Parameter name"
                                  />
                                </div>
                                <div className="w-2/3 flex space-x-2">
                                  <Input 
                                    value={param.value}
                                    onChange={(e) => updateParameterValue(index, e.target.value)}
                                    placeholder="Parameter value"
                                  />
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeParameter(index)}
                                    className="text-red-500"
                                  >
                                    &times;
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                          <Button 
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              // This button will fetch data directly without parameters
                              const fetchDataEvent = new CustomEvent('fetchData', {
                                detail: { collectionName: form.getValues('collections')[0] }
                              });
                              window.dispatchEvent(fetchDataEvent);
                            }}
                            className="mt-2 bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Fetch Data
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
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
