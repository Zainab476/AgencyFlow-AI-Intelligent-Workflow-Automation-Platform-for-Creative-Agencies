import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  Search, 
  Plus, 
  FolderKanban, 
  MoreHorizontal, 
  CalendarDays,
  Filter
} from 'lucide-react';
import { 
  useListProjects,
  useCreateProject,
  useListClients,
  getListProjectsQueryKey,
  ProjectStatus,
  ListProjectsStatus
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ProjectStatusBadge } from '@/components/ProjectStatusBadge';

const projectSchema = z.object({
  clientId: z.coerce.number().min(1, 'Client is required'),
  campaignName: z.string().min(1, 'Campaign Name is required'),
  budget: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function Projects() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ListProjectsStatus | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Check URL for ?new=true to auto-open the create dialog
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('new') === 'true') {
      setIsCreateOpen(true);
    }
  }, []);

  const { data: projects, isLoading } = useListProjects(
    { 
      search: search || undefined, 
      status: statusFilter !== 'all' ? statusFilter : undefined 
    },
    { 
      query: { 
        queryKey: getListProjectsQueryKey({ 
          search: search || undefined, 
          status: statusFilter !== 'all' ? statusFilter : undefined 
        }) 
      } 
    }
  );

  const { data: clients } = useListClients();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      campaignName: '',
      status: ProjectStatus.planning,
      budget: undefined,
      startDate: '',
      endDate: '',
    },
  });

  // Pre-select client if passed in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const prefillClientId = searchParams.get('clientId');
    if (prefillClientId && !form.getValues('clientId')) {
      form.setValue('clientId', parseInt(prefillClientId, 10));
    }
  }, [form]);

  const createProjectMutation = useCreateProject({
    mutation: {
      onSuccess: (newProject) => {
        toast.success('Project created successfully');
        setIsCreateOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setLocation(`/projects/${newProject.id}`);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create project');
      },
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate({ 
      data: {
        ...data,
        budget: data.budget ? Number(data.budget) : undefined,
      } 
    });
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const openCreateDialog = () => {
    form.reset({
      campaignName: '',
      status: ProjectStatus.planning,
    });
    setIsCreateOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Track and manage all your ongoing campaigns.</p>
        </div>
        
        <Button onClick={openCreateDialog} className="shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new campaign for a client.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                <FormField
                  control={form.control}
                  name="campaignName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Q3 Marketing Push" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
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
                          <Input type="number" placeholder="10000" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-9 bg-card shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground ml-2 hidden sm:block" />
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(ListProjectsStatus).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[300px]">Campaign</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead className="text-right">Budget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : projects?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FolderKanban className="h-10 w-10 mb-3 opacity-20" />
                    <p className="font-medium text-foreground">No projects found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or create a new project</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              projects?.map((project) => (
                <TableRow 
                  key={project.id} 
                  className="cursor-pointer group hover:bg-muted/30 transition-colors"
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-secondary-foreground font-medium text-xs border border-border/50">
                        {project.campaignName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-base font-semibold group-hover:text-primary transition-colors">
                        {project.campaignName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/clients/${project.clientId}`}>
                      <span className="text-sm hover:underline hover:text-foreground text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                        {project.clientName}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ProjectStatusBadge status={project.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {project.startDate ? format(new Date(project.startDate), 'MMM d') : '?'} 
                      {' - '} 
                      {project.endDate ? format(new Date(project.endDate), 'MMM d, yyyy') : '?'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(project.budget)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}