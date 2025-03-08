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
import { Textarea } from "@/components/ui/textarea";
import type { DataSource } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";


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
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<{[key: string]: any[]}>({});
  const [selectedLimit, setSelectedLimit] = useState<number>(20);
  const [selectedOrderBy, setSelectedOrderBy] = useState<string>("");
  const [selectedOrderDirection, setSelectedOrderDirection] = useState<string>("ASC");
  const [whereConditions, setWhereConditions] = useState<{field: string, operator: string, value: string}[]>([]);
  const [activeCollection, setActiveCollection] = useState<{sourceId: number, collection: string} | null>(null);


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

  // Fetch column information when a collection is selected
  useEffect(() => {
    const fetchColumns = async () => {
      if (!activeCollection) return;

      const { sourceId, collection } = activeCollection;
      const key = `${sourceId}:${collection}`;

      // Skip if we already have the columns for this collection
      if (availableColumns[key]) return;

      try {
        const response = await apiRequest('GET', `/api/data-sources/${sourceId}/collections/${collection}/schema`);
        const schema = await response.json();

        if (schema && schema.fields) {
          setAvailableColumns(prev => ({
            ...prev,
            [key]: schema.fields
          }));
        }
      } catch (error) {
        console.error(`Error fetching schema for collection ${collection}:`, error);
      }
    };

    fetchColumns();
  }, [activeCollection, availableColumns, apiRequest]);


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
  const handleCollectionChange = (collection: string, sourceId: number) => {
    let newSelectedCollections;
    const collectionKey = `${sourceId}:${collection}`;

    if (selectedCollections.includes(collectionKey)) {
      newSelectedCollections = selectedCollections.filter((c) => c !== collectionKey);
      setActiveCollection(null);
      setSelectedColumns([]);
      setWhereConditions([]);
      setSelectedOrderBy("");
    } else {
      newSelectedCollections = [...selectedCollections, collectionKey];
      setActiveCollection({ sourceId, collection });
    }

    setSelectedCollections(newSelectedCollections);
    form.setValue("collections", newSelectedCollections);
    generateSampleQuery(collection);
  };


  // Generate a simple sample query based on selected collection
  const generateSampleQuery = (collectionName: string) => {
    // Find which data source this collection belongs to
    let dataSourceId: number | null = null;
    let fields: string[] = ["*"];

    // Look through available collections to find the source
    for (const [sourceName, collections] of Object.entries(availableCollections)) {
      const collectionKey = Object.entries(availableCollections).find(([k,v])=>v.includes(collectionName))
      if (collectionKey){
        dataSourceId = parseInt(collectionKey[0].split(':')[0])
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
    const sampleQuery = `SELECT ${fields.join(', ')} FROM ${collectionName} LIMIT ${selectedLimit}`;
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

  // Update SQL query when selections change
  useEffect(() => {
    if (activeCollection) {
      generateSqlQuery();
    }
  }, [selectedColumns, selectedLimit, selectedOrderBy, selectedOrderDirection, whereConditions, activeCollection]);

  const generateSqlQuery = () => {
    if (!activeCollection) return;

    const { collection } = activeCollection;
    let query = "SELECT ";

    // Add columns
    if (selectedColumns.length === 0) {
      query += "* ";
    } else {
      query += selectedColumns.join(", ");
    }

    query += ` FROM ${collection}`;

    // Add WHERE conditions
    if (whereConditions.length > 0) {
      const conditions = whereConditions
        .filter(c => c.field && c.operator)
        .map(c => {
          let value = c.value;
          // Add quotes for string values
          if (isNaN(Number(value)) && !value.startsWith(":")) {
            value = `'${value}'`;
          }
          return `${c.field} ${c.operator} ${value}`;
        });

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }
    }

    // Add ORDER BY
    if (selectedOrderBy) {
      query += ` ORDER BY ${selectedOrderBy} ${selectedOrderDirection}`;
    }

    // Add LIMIT
    query += ` LIMIT ${selectedLimit}`;

    form.setValue("query", query);
  };

  const handleColumnSelect = (column: string) => {
    setSelectedColumns(prev => {
      // If column is already selected, remove it
      if (prev.includes(column)) {
        return prev.filter(c => c !== column);
      }
      // Otherwise add it
      return [...prev, column];
    });
  };

  const addWhereCondition = () => {
    setWhereConditions(prev => [...prev, { field: "", operator: "=", value: "" }]);
  };

  const updateWhereCondition = (index: number, field: string, value: any) => {
    setWhereConditions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeWhereCondition = (index: number) => {
    setWhereConditions(prev => prev.filter((_, i) => i !== index));
  };

  // Get columns for active collection
  const getColumnsForActiveCollection = () => {
    if (!activeCollection) return [];
    const key = `${activeCollection.sourceId}:${activeCollection.collection}`;
    return availableColumns[key] || [];
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
              <ScrollArea className="h-40 rounded-md border">
                <div className="p-4">
                  {selectedDataSources.map((sourceId) => (
                    <div key={sourceId} className="mb-4">
                      <div className="font-medium mb-2">
                        {dataSources.find(ds => ds.id === sourceId)?.name || `Source ${sourceId}`}
                      </div>
                      <div className="flex flex-col space-y-2">
                        {availableCollections[dataSources.find(ds => ds.id === sourceId)?.name]?.map((collection) => (
                          <div key={collection} className="flex items-center space-x-2">
                            <Checkbox
                              id={`collection-${sourceId}-${collection}`}
                              checked={selectedCollections.includes(`${sourceId}:${collection}`)}
                              onCheckedChange={() => handleCollectionChange(collection, sourceId)}
                            />
                            <label
                              htmlFor={`collection-${sourceId}-${collection}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {collection}
                            </label>
                          </div>
                        ))}
                        {(!availableCollections[dataSources.find(ds => ds.id === sourceId)?.name] || availableCollections[dataSources.find(ds => ds.id === sourceId)?.name].length === 0) && (
                          <div className="text-sm text-muted-foreground">No collections available</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedDataSources.length === 0 && (
                    <div className="text-sm text-muted-foreground">Select data sources to view available collections</div>
                  )}
                </div>
              </ScrollArea>
              {form.formState.errors.collections && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.collections.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Card className="h-full">
              <CardContent className="pt-6">
                {activeCollection ? (
                  <Tabs defaultValue="columns" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="columns">Columns</TabsTrigger>
                      <TabsTrigger value="filters">Filters</TabsTrigger>
                      <TabsTrigger value="sort">Sort & Limit</TabsTrigger>
                      <TabsTrigger value="query">Raw Query</TabsTrigger>
                    </TabsList>

                    <TabsContent value="columns">
                      <div className="mb-4">
                        <h3 className="font-medium mb-2">Select Columns</h3>
                        <div className="border rounded-md p-2 flex flex-col gap-2 max-h-60 overflow-y-auto">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="select-all-columns"
                              checked={selectedColumns.length === 0}
                              onCheckedChange={() => setSelectedColumns(getColumnsForActiveCollection().map(c => c.name))}
                            />
                            <label htmlFor="select-all-columns" className="font-medium">All Columns (*)</label>
                          </div>
                          {getColumnsForActiveCollection().map((column) => (
                            <div key={column.name} className="flex items-center space-x-2">
                              <Checkbox
                                id={`column-${column.name}`}
                                checked={selectedColumns.includes(column.name)}
                                onCheckedChange={() => handleColumnSelect(column.name)}
                              />
                              <label htmlFor={`column-${column.name}`} className="text-sm">
                                {column.name} <span className="text-xs text-muted-foreground">({column.type})</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="filters">
                      <div className="mb-4">
                        <h3 className="font-medium mb-2">WHERE Conditions</h3>
                        <div className="border rounded-md p-2 space-y-3 max-h-60 overflow-y-auto">
                          {whereConditions.map((condition, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-4">
                                <Select
                                  value={condition.field}
                                  onValueChange={(value) => updateWhereCondition(index, 'field', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Field" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getColumnsForActiveCollection().map((column) => (
                                      <SelectItem key={column.name} value={column.name}>
                                        {column.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-3">
                                <Select
                                  value={condition.operator}
                                  onValueChange={(value) => updateWhereCondition(index, 'operator', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Op" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="=">Equal (=)</SelectItem>
                                    <SelectItem value="!=">Not Equal (!=)</SelectItem>
                                    <SelectItem value=">">Greater Than (&gt;)</SelectItem>
                                    <SelectItem value=">=">Greater Than or Equal (&gt;=)</SelectItem>
                                    <SelectItem value="<">Less Than (&lt;)</SelectItem>
                                    <SelectItem value="<=">Less Than or Equal (&lt;=)</SelectItem>
                                    <SelectItem value="LIKE">Like</SelectItem>
                                    <SelectItem value="IN">In</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-4">
                                <Input
                                  placeholder="Value"
                                  value={condition.value}
                                  onChange={(e) => updateWhereCondition(index, 'value', e.target.value)}
                                />
                              </div>
                              <div className="col-span-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeWhereCondition(index)}
                                  className="h-8 w-8"
                                >
                                  ✕
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button onClick={addWhereCondition} variant="outline" size="sm" className="w-full">
                            Add Condition
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="sort">
                      <div className="mb-4">
                        <h3 className="font-medium mb-2">Order By</h3>
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-8">
                            <Select
                              value={selectedOrderBy}
                              onValueChange={setSelectedOrderBy}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field to sort by" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {getColumnsForActiveCollection().map((column) => (
                                  <SelectItem key={column.name} value={column.name}>
                                    {column.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-4">
                            <Select
                              value={selectedOrderDirection}
                              onValueChange={setSelectedOrderDirection}
                              disabled={!selectedOrderBy}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Direction" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ASC">Ascending</SelectItem>
                                <SelectItem value="DESC">Descending</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <h3 className="font-medium mb-2 mt-4">Limit</h3>
                        <Input
                          type="number"
                          min="1"
                          max="1000"
                          value={selectedLimit}
                          onChange={(e) => setSelectedLimit(parseInt(e.target.value) || 20)}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="query">
                      <FormField
                        control={form.control}
                        name="query"
                        render={({ field }) => (
                          <FormItem className="h-full flex flex-col">
                            <FormLabel>SQL Query</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="SELECT * FROM collection WHERE field = value"
                                className="flex-1 min-h-[250px] font-mono"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              You can manually edit the query or use the other tabs to build it.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <FormField
                    control={form.control}
                    name="query"
                    render={({ field }) => (
                      <FormItem className="h-full flex flex-col">
                        <FormLabel>Query</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="SELECT * FROM collection WHERE field = value"
                            className="flex-1 min-h-[250px] font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Simple SQL-like query language. Use <code>SELECT * FROM collection WHERE field = value</code> syntax.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
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