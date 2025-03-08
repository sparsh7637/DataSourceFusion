import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { DataSource, SchemaMapping } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  sourceId: z.string().min(1, "Source is required"),
  sourceCollection: z.string().min(1, "Source collection is required"),
  targetId: z.string().min(1, "Target is required"),
  targetCollection: z.string().min(1, "Target collection is required"),
  status: z.enum(["active", "inactive"]).default("active"),
  // We'll handle mapping rules separately
});

interface CreateMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSources: DataSource[];
  editingMapping?: SchemaMapping | null;
}

export default function CreateMappingDialog({
  open,
  onOpenChange,
  dataSources,
  editingMapping,
}: CreateMappingDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mappingRules, setMappingRules] = useState<any[]>([]);
  const [sourceCollections, setSourceCollections] = useState<string[]>([]);
  const [targetCollections, setTargetCollections] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editingMapping
      ? {
          name: editingMapping.name,
          sourceId: String(editingMapping.sourceId),
          sourceCollection: editingMapping.sourceCollection,
          targetId: String(editingMapping.targetId),
          targetCollection: editingMapping.targetCollection,
          status: editingMapping.status as "active" | "inactive",
        }
      : {
          name: "",
          sourceId: "",
          sourceCollection: "",
          targetId: "",
          targetCollection: "",
          status: "active",
        },
  });

  // Initialize mapping rules when editing
  useEffect(() => {
    if (editingMapping && open) {
      setMappingRules(
        Array.isArray(editingMapping.mappingRules)
          ? [...editingMapping.mappingRules]
          : []
      );
    } else if (!editingMapping && open) {
      setMappingRules([]);
    }
  }, [editingMapping, open]);

  // Update collections when source changes
  const selectedSourceId = form.watch("sourceId");
  const selectedTargetId = form.watch("targetId");

  useEffect(() => {
    if (selectedSourceId) {
      const source = dataSources.find(
        (ds) => ds.id === parseInt(selectedSourceId)
      );
      if (source && Array.isArray(source.collections)) {
        setSourceCollections(source.collections as string[]);
      } else {
        setSourceCollections([]);
      }
    }
  }, [selectedSourceId, dataSources]);

  useEffect(() => {
    if (selectedTargetId) {
      const target = dataSources.find(
        (ds) => ds.id === parseInt(selectedTargetId)
      );
      if (target && Array.isArray(target.collections)) {
        setTargetCollections(target.collections as string[]);
      } else {
        setTargetCollections([]);
      }
    }
  }, [selectedTargetId, dataSources]);

  // Add a new mapping rule
  const addMappingRule = () => {
    setMappingRules([
      ...mappingRules,
      {
        sourceField: "",
        targetField: "",
        type: "direct",
        transform: "",
      },
    ]);
  };

  // Remove a mapping rule
  const removeMappingRule = (index: number) => {
    const newRules = [...mappingRules];
    newRules.splice(index, 1);
    setMappingRules(newRules);
  };

  // Update a mapping rule field
  const updateMappingRule = (
    index: number,
    field: string,
    value: string
  ) => {
    const newRules = [...mappingRules];
    (newRules[index] as any)[field] = value;
    setMappingRules(newRules);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (mappingRules.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one mapping rule is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate mapping rules
    for (const rule of mappingRules) {
      if (!rule.sourceField || !rule.targetField || !rule.type) {
        toast({
          title: "Validation Error",
          description: "All mapping rule fields must be filled out.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name,
        sourceId: parseInt(values.sourceId),
        sourceCollection: values.sourceCollection,
        targetId: parseInt(values.targetId),
        targetCollection: values.targetCollection,
        status: values.status,
        mappingRules: mappingRules,
      };

      if (editingMapping) {
        await apiRequest(
          "PUT",
          `/api/schema-mappings/${editingMapping.id}`,
          payload
        );
        toast({
          title: "Schema Mapping Updated",
          description: `${values.name} has been updated successfully.`,
        });
      } else {
        await apiRequest("POST", "/api/schema-mappings", payload);
        toast({
          title: "Schema Mapping Created",
          description: `${values.name} has been created successfully.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/schema-mappings"] });
      onOpenChange(false);
      form.reset();
      setMappingRules([]);
    } catch (error) {
      console.error("Error saving schema mapping:", error);
      toast({
        title: "Error",
        description: `Failed to ${
          editingMapping ? "update" : "create"
        } schema mapping.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {editingMapping ? "Edit Schema Mapping" : "Create Schema Mapping"}
          </DialogTitle>
          <DialogDescription>
            Define how data should be mapped between sources.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mapping Name</FormLabel>
                    <FormControl>
                      <Input placeholder="User Data Integration" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Source</h3>
                <FormField
                  control={form.control}
                  name="sourceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Source</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dataSources.map((source) => (
                            <SelectItem
                              key={source.id}
                              value={String(source.id)}
                            >
                              {source.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sourceCollection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedSourceId || sourceCollections.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select collection" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sourceCollections.map((collection) => (
                            <SelectItem key={collection} value={collection}>
                              {collection}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Target</h3>
                <FormField
                  control={form.control}
                  name="targetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Source</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dataSources.map((source) => (
                            <SelectItem
                              key={source.id}
                              value={String(source.id)}
                            >
                              {source.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetCollection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedTargetId || targetCollections.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select collection" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetCollections.map((collection) => (
                            <SelectItem key={collection} value={collection}>
                              {collection}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Mapping Rules</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMappingRule}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Field</TableHead>
                    <TableHead>Target Field</TableHead>
                    <TableHead>Mapping Type</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappingRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-gray-500">
                        No mapping rules defined. Click "Add Rule" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mappingRules.map((rule, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={rule.sourceField}
                            onChange={(e) =>
                              updateMappingRule(index, "sourceField", e.target.value)
                            }
                            placeholder="e.g., uid"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={rule.targetField}
                            onChange={(e) =>
                              updateMappingRule(index, "targetField", e.target.value)
                            }
                            placeholder="e.g., _id"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={rule.type}
                            onValueChange={(value) =>
                              updateMappingRule(index, "type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="direct">Direct</SelectItem>
                              <SelectItem value="transform">Transform</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMappingRule(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingMapping
                  ? "Update Mapping"
                  : "Create Mapping"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
