import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { DataSource } from "@shared/schema";

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
  FormDescription,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  type: z.enum(["firebase", "mongodb"]),
  firebase: z
    .object({
      projectId: z.string().min(1, "Project ID is required"),
      apiKey: z.string().optional(),
      authDomain: z.string().optional(),
    })
    .optional(),
  mongodb: z
    .object({
      uri: z.string().min(1, "MongoDB URI is required"),
      database: z.string().min(1, "Database name is required"),
    })
    .optional(),
});

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSource?: DataSource | null;
}

export default function AddSourceDialog({
  open,
  onOpenChange,
  editingSource,
}: AddSourceDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editingSource
      ? {
          name: editingSource.name,
          type: editingSource.type as any,
          firebase:
            editingSource.type === "firebase"
              ? editingSource.config as any
              : undefined,
          mongodb:
            editingSource.type === "mongodb"
              ? editingSource.config as any
              : undefined,
        }
      : {
          name: "",
          type: "firebase",
          firebase: {
            projectId: "",
            apiKey: "",
            authDomain: "",
          },
          mongodb: {
            uri: "",
            database: "",
          },
        },
  });

  const sourceType = form.watch("type");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const configData =
        values.type === "firebase" ? values.firebase : values.mongodb;

      const payload = {
        name: values.name,
        type: values.type,
        config: configData,
        status: "connected", // Will be updated after actual connection attempt
      };

      if (editingSource) {
        await apiRequest(
          "PUT",
          `/api/data-sources/${editingSource.id}`,
          payload
        );
        toast({
          title: "Data Source Updated",
          description: `${values.name} has been updated successfully.`,
        });
      } else {
        await apiRequest("POST", "/api/data-sources", payload);
        toast({
          title: "Data Source Added",
          description: `${values.name} has been added successfully.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error saving data source:", error);
      toast({
        title: "Error",
        description: `Failed to ${
          editingSource ? "update" : "add"
        } data source.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {editingSource ? "Edit Data Source" : "Add New Data Source"}
          </DialogTitle>
          <DialogDescription>
            Configure connection details for your data source.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Data Source" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!editingSource}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a data source type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="firebase">Firebase</SelectItem>
                        <SelectItem value="mongodb">MongoDB</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Tabs defaultValue={sourceType} value={sourceType}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="firebase">Firebase</TabsTrigger>
                  <TabsTrigger value="mongodb">MongoDB</TabsTrigger>
                </TabsList>

                <TabsContent value="firebase" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="firebase.projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project ID</FormLabel>
                        <FormControl>
                          <Input placeholder="my-project-12345" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your Firebase project identifier
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="firebase.apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="AIzaSyC..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="firebase.authDomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auth Domain (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="my-project.firebaseapp.com"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="mongodb" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="mongodb.uri"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Connection URI</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="mongodb+srv://user:password@cluster.example.net"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mongodb.database"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Database Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="my-database"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
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
                  : editingSource
                  ? "Update Source"
                  : "Add Source"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
