import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  Building2, 
  Mail, 
  Phone, 
  CalendarDays,
  ArrowLeft,
  Trash2,
  FolderKanban,
  Plus
} from 'lucide-react';
import { 
  useGetClient,
  useUpdateClient,
  useDeleteClient,
  useListProjects,
  getGetClientQueryKey,
  getListProjectsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ProjectStatusBadge } from '@/components/ProjectStatusBadge';

const clientSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  contactPerson: z.string().min(1, 'Contact Person is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientDetail({ id }: { id: string }) {
  const clientId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: client, isLoading: isClientLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) }
  });

  const { data: projects, isLoading: isProjectsLoading } = useListProjects(
    { clientId },
    { query: { enabled: !!clientId, queryKey: getListProjectsQueryKey({ clientId }) } }
  );

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
    },
  });

  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (client && !initializedRef.current) {
      form.reset({
        companyName: client.companyName,
        contactPerson: client.contactPerson,
        email: client.email,
        phone: client.phone || '',
      });
      initializedRef.current = true;
    }
  }, [client, form]);

  const updateClientMutation = useUpdateClient({
    mutation: {
      onSuccess: (data) => {
        toast.success('Client updated successfully');
        setIsEditing(false);
        queryClient.setQueryData(getGetClientQueryKey(clientId), data);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update client');
      },
    }
  });

  const deleteClientMutation = useDeleteClient({
    mutation: {
      onSuccess: () => {
        toast.success('Client deleted successfully');
        setLocation('/clients');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete client');
      },
    }
  });

  const onSubmit = (data: ClientFormValues) => {
    updateClientMutation.mutate({ id: clientId, data });
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return 'TBD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isClientLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold">Client not found</h2>
        <Button className="mt-4" onClick={() => setLocation('/clients')}>Return to Clients</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2">
        <Button asChild variant="ghost" size="sm" className="gap-1 pl-0 text-muted-foreground hover:text-foreground">
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shadow-sm border border-primary/20">
            {client.companyName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.companyName}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <CalendarDays className="h-4 w-4" />
              Client since {format(new Date(client.createdAt), 'MMMM yyyy')}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={updateClientMutation.isPending}>
                {updateClientMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Profile</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the client and all associated projects.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteClientMutation.mutate({ id: clientId })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteClientMutation.isPending ? 'Deleting...' : 'Delete Client'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-2">
        <div className="md:col-span-1">
          <Card className="border-border/50 shadow-sm sticky top-6">
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Primary Contact</p>
                    <p className="font-medium text-foreground">{client.contactPerson}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                    <a href={`mailto:${client.email}`} className="flex items-center gap-2 font-medium text-primary hover:underline">
                      <Mail className="h-4 w-4" />
                      {client.email}
                    </a>
                  </div>
                  {client.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Phone</p>
                      <a href={`tel:${client.phone}`} className="flex items-center gap-2 font-medium text-foreground hover:underline">
                        <Phone className="h-4 w-4" />
                        {client.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Projects</CardTitle>
                <CardDescription>All campaigns for {client.companyName}</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline" className="shadow-sm gap-1">
                <Link href={`/projects?new=true&clientId=${client.id}`}>
                  <Plus className="h-4 w-4" />
                  New Project
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isProjectsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : !projects?.length ? (
                <div className="text-center py-10 border border-dashed border-border rounded-xl bg-muted/10">
                  <FolderKanban className="mx-auto h-10 w-10 mb-3 opacity-20" />
                  <p className="font-medium text-foreground">No projects yet</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">Create the first campaign for this client.</p>
                  <Button asChild>
                    <Link href={`/projects?new=true&clientId=${client.id}`}>Create Project</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="group flex items-center justify-between p-4 border border-border/60 rounded-xl hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer bg-card shadow-sm hover:shadow-md">
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors text-base">{project.campaignName}</h3>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-1.5">
                            {project.budget != null && (
                              <span className="font-medium text-foreground/80">{formatCurrency(project.budget)}</span>
                            )}
                            {project.endDate && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {format(new Date(project.endDate), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <ProjectStatusBadge status={project.status} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}