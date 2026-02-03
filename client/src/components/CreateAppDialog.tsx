import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppSchema, type InsertApp } from "@shared/schema";
import { useCreateApp } from "@/hooks/use-apps";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Loader2 } from "lucide-react";

export function CreateAppDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createApp = useCreateApp();

  const form = useForm<InsertApp>({
    resolver: zodResolver(insertAppSchema),
    defaultValues: {
      displayName: "",
      internalName: "",
      baseUrl: "https://",
      isActive: true,
    },
  });

  function onSubmit(data: InsertApp) {
    createApp.mutate(data, {
      onSuccess: () => {
        toast({ title: "App added", description: `${data.displayName} is now being monitored.` });
        setOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({ 
          title: "Failed to add app", 
          description: error.message, 
          variant: "destructive" 
        });
      },
    });
  }

  // Auto-generate internal name from display name
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    form.setValue("displayName", val);
    if (!form.formState.dirtyFields.internalName) {
      form.setValue("internalName", val.toLowerCase().replace(/[^a-z0-9]/g, "-"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
          <Plus className="w-4 h-4" /> Add Application
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] border-white/10 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Monitor New Application</DialogTitle>
          <DialogDescription>
            Add an endpoint to start tracking uptime and performance.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Production API" 
                      {...field} 
                      onChange={handleDisplayNameChange} 
                      className="bg-secondary/50 border-white/5 focus:border-primary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="internalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="production-api" 
                      {...field} 
                      className="bg-secondary/50 border-white/5 font-mono text-xs focus:border-primary/50"
                    />
                  </FormControl>
                  <FormDescription>Unique identifier used in URLs.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://api.example.com" 
                      {...field} 
                      className="bg-secondary/50 border-white/5 font-mono text-xs focus:border-primary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createApp.isPending}>
                {createApp.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Application"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
