import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  Building2, 
  CalendarDays,
  ArrowLeft,
  Trash2,
  FolderKanban,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { 
  useGetProject,
  useUpdateProject,
  useDeleteProject,
  useListClients,
  getGetProjectQueryKey,
  ProjectStatus
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const projectSchema = z.object({
  clientId: z.coerce.number().min(1, 'Client is required'),
  campaignName: z.string().min(1, 'Campaign Name is required'),
  budget: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(ProjectStatus),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function ProjectDetail({ id }: { id: string }) {
  const projectId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: clients } = useListClients();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      clientId: 0,
      campaignName: '',
      status: ProjectStatus.planning,
      budget: undefined,
      startDate: '',
      endDate: '',
    },
  });

  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (project && !initializedRef.current) {
      form.reset({
        clientId: project.clientId,
        campaignName: project.campaignName,
        status: project.status,
        budget: project.budget || undefined,
        startDate: project.startDate || '',
        endDate: project.endDate || '',
      });
      initializedRef.current = true;
    }
  }, [project, form]);

  const updateProjectMutation = useUpdateProject({
    mutation: {
      onSuccess: (data) => {
        toast.success('Project updated successfully');
        setIsEditing(false);
        queryClient.setQueryData(getGetProjectQueryKey(projectId), data);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update project');
      },
    }
  });

  const deleteProjectMutation = useDeleteProject({
    mutation: {
      onSuccess: () => {
        toast.success('Project deleted successfully');
        setLocation('/projects');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete project');
      },
    }
  });

  const onSubmit = (data: ProjectFormValues) => {
    updateProjectMutation.mutate({ 
      id: projectId, 
      data: {
        ...data,
        budget: data.budget ? Number(data.budget) : undefined,
      } 
    });
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return 'TBD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  if (isProjectLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold">Project not found</h2>
        <Button className="mt-4" onClick={() => setLocation('/projects')}>Return to Projects</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2">
        <Button asChild variant="ghost" size="sm" className="gap-1 pl-0 text-muted-foreground hover:text-foreground">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ProjectStatusBadge status={project.status} />
            <Link href={`/clients/${project.clientId}`}>
              <span className="text-sm font-medium text-primary hover:underline cursor-pointer flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {project.clientName}
              </span>
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{project.campaignName}</h1>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={updateProjectMutation.isPending}>
                {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Project</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this project.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteProjectMutation.mutate({ id: projectId })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 pt-4">
        {isEditing ? (
          <Card className="md:col-span-2 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Edit Project Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="campaignName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(Number(val))} 
                            value={field.value ? String(field.value) : undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients?.map(client => (
                                <SelectItem key={client.id} value={String(client.id)}>
                                  {client.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(ProjectStatus).map(([key, value]) => (
                                <SelectItem key={key} value={value}>
                                  {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
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
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget (USD)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  Key Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Budget</p>
                  <p className="text-2xl font-semibold tracking-tight">
                    {formatCurrency(project.budget)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Start Date</p>
                  <p className="font-medium text-foreground">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">End Date</p>
                  <p className="font-medium text-foreground">{formatDate(project.endDate)}</p>
                </div>
                
                {/* Visual timeline bar if dates exist */}
                {project.startDate && project.endDate && (
                  <div className="pt-4">
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-full opacity-60"></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}