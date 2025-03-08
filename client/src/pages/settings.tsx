import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const generalSettingsSchema = z.object({
  applicationName: z.string().min(1, "Application name is required"),
  enableNotifications: z.boolean().default(true),
  defaultFederationStrategy: z.string().min(1, "Default federation strategy is required"),
  dataRefreshInterval: z.string().min(1, "Data refresh interval is required"),
});

const firebaseSettingsSchema = z.object({
  firebaseApiKey: z.string().optional(),
  firebaseProjectId: z.string().optional(),
  firebaseAuthDomain: z.string().optional(),
});

const mongodbSettingsSchema = z.object({
  mongodbUri: z.string().optional(),
  mongodbUser: z.string().optional(),
  mongodbPassword: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  // General settings form
  const generalForm = useForm<z.infer<typeof generalSettingsSchema>>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      applicationName: "Unified Data Aggregation System",
      enableNotifications: true,
      defaultFederationStrategy: "virtual",
      dataRefreshInterval: "15",
    },
  });

  // Firebase settings form
  const firebaseForm = useForm<z.infer<typeof firebaseSettingsSchema>>({
    resolver: zodResolver(firebaseSettingsSchema),
    defaultValues: {
      firebaseApiKey: "",
      firebaseProjectId: "",
      firebaseAuthDomain: "",
    },
  });

  // MongoDB settings form
  const mongodbForm = useForm<z.infer<typeof mongodbSettingsSchema>>({
    resolver: zodResolver(mongodbSettingsSchema),
    defaultValues: {
      mongodbUri: "",
      mongodbUser: "",
      mongodbPassword: "",
    },
  });

  // Handle form submissions
  const onGeneralSubmit = (values: z.infer<typeof generalSettingsSchema>) => {
    toast({
      title: "Settings Saved",
      description: "General settings have been updated successfully.",
    });
    console.log(values);
  };

  const onFirebaseSubmit = (values: z.infer<typeof firebaseSettingsSchema>) => {
    toast({
      title: "Firebase Settings Saved",
      description: "Firebase connection settings have been updated.",
    });
    console.log(values);
  };

  const onMongodbSubmit = (values: z.infer<typeof mongodbSettingsSchema>) => {
    toast({
      title: "MongoDB Settings Saved",
      description: "MongoDB connection settings have been updated.",
    });
    console.log(values);
  };

  return (
    <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Settings</h3>
        <p className="text-sm text-gray-500">
          Configure application settings and data source defaults
        </p>
      </div>
      
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="firebase">Firebase</TabsTrigger>
          <TabsTrigger value="mongodb">MongoDB</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Form {...generalForm}>
            <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-6">
              <FormField
                control={generalForm.control}
                name="applicationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      The name displayed in the browser title and header
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={generalForm.control}
                name="defaultFederationStrategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Federation Strategy</FormLabel>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      {...field}
                    >
                      <option value="virtual">Virtual View</option>
                      <option value="materialized">Materialized View</option>
                      <option value="hybrid">Hybrid Approach</option>
                    </select>
                    <FormDescription>
                      Default strategy for query federation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={generalForm.control}
                name="dataRefreshInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Refresh Interval (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min="5" max="1440" {...field} />
                    </FormControl>
                    <FormDescription>
                      How often materialized views should be refreshed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={generalForm.control}
                name="enableNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Notifications</FormLabel>
                      <FormDescription>
                        Receive alerts about query completion and errors
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <Button type="submit">Save General Settings</Button>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="firebase">
          <Form {...firebaseForm}>
            <form onSubmit={firebaseForm.handleSubmit(onFirebaseSubmit)} className="space-y-6">
              <FormField
                control={firebaseForm.control}
                name="firebaseProjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firebase Project ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Your Firebase project identifier
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={firebaseForm.control}
                name="firebaseApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Firebase Web API key for authentication
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={firebaseForm.control}
                name="firebaseAuthDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth Domain</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Firebase authentication domain
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit">Save Firebase Settings</Button>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="mongodb">
          <Form {...mongodbForm}>
            <form onSubmit={mongodbForm.handleSubmit(onMongodbSubmit)} className="space-y-6">
              <FormField
                control={mongodbForm.control}
                name="mongodbUri"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MongoDB Connection URI</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Connection string for your MongoDB instance
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={mongodbForm.control}
                  name="mongodbUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MongoDB User</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={mongodbForm.control}
                  name="mongodbPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MongoDB Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit">Save MongoDB Settings</Button>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="security">
          <div className="space-y-6">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium mb-2">Security Settings</h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure security options for your data integration system.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Enable API Key Authentication</h4>
                    <p className="text-xs text-gray-500">Require API keys for external access</p>
                  </div>
                  <Switch checked={true} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Data Encryption at Rest</h4>
                    <p className="text-xs text-gray-500">Encrypt cached query results</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Enforce TLS for Connections</h4>
                    <p className="text-xs text-gray-500">Require secure connections to data sources</p>
                  </div>
                  <Switch checked={true} />
                </div>
              </div>
            </div>
            
            <Button variant="outline" className="w-full">Reset Security Settings to Default</Button>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
