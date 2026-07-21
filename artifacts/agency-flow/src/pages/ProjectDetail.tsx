import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Building2, 
  CalendarDays,
  ArrowLeft,
  Trash2,
  FolderKanban,
  DollarSign,
  Briefcase,
  Users,
  CheckSquare,
  Files,
  Activity,
  Plus,
  Edit2,
  UserPlus,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  X
} from 'lucide-react';
import { 
  useGetProject,
  useUpdateProject,
  useDeleteProject,
  useListClients,
  useListProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
  useListTasks,
  useUpdateTaskStatus,
  useListActivity,
  useListUploads,
  useDeleteUpload,
  getGetProjectQueryKey,
  getListProjectMembersQueryKey,
  getListTasksQueryKey,
  getListActivityQueryKey,
  getListUploadsQueryKey,
  ProjectStatus,
  MemberRole,
  TaskStatus,
  TaskPriority
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const memberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  role: z.nativeEnum(MemberRole),
});

type MemberFormValues = z.infer<typeof memberSchema>;

const ROLE_COLORS: Record<MemberRole, string> = {
  project_manager: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  designer: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  copywriter: 'bg-green-500/10 text-green-600 border-green-500/20',
  marketing_specialist: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

async function uploadFile(projectId: number, file: File, taskId?: number) {
  const token = localStorage.getItem('af_token');
  const form = new FormData();
  form.append('file', file);
  const params = new URLSearchParams({ projectId: String(projectId) });
  if (taskId) params.append('taskId', String(taskId));
  const res = await fetch(`/api/uploads?${params}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export default function ProjectDetail({ id }: { id: string }) {
  const projectId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modals state
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: clients } = useListClients();
  const { data: members } = useListProjectMembers(projectId, { query: { enabled: !!projectId, queryKey: getListProjectMembersQueryKey(projectId) } });
  const { data: tasks } = useListTasks({ projectId }, { query: { enabled: !!projectId, queryKey: getListTasksQueryKey({ projectId }) } });
  const { data: uploads } = useListUploads({ projectId }, { query: { enabled: !!projectId, queryKey: getListUploadsQueryKey({ projectId }) } });
  const { data: activities } = useListActivity({ projectId }, { query: { enabled: !!projectId, queryKey: getListActivityQueryKey({ projectId }) } });

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

  const memberForm = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: '',
      email: '',
      role: MemberRole.project_manager,
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

  const addMemberMutation = useAddProjectMember({
    mutation: {
      onSuccess: () => {
        toast.success('Team member added');
        setMemberDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
      }
    }
  });

  const removeMemberMutation = useRemoveProjectMember({
    mutation: {
      onSuccess: () => {
        toast.success('Team member removed');
        queryClient.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
      }
    }
  });

  const updateTaskStatusMutation = useUpdateTaskStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
      }
    }
  });

  const deleteUploadMutation = useDeleteUpload({
    mutation: {
      onSuccess: () => {
        toast.success('File deleted');
        queryClient.invalidateQueries({ queryKey: getListUploadsQueryKey({ projectId }) });
      }
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

  const onMemberSubmit = (data: MemberFormValues) => {
    addMemberMutation.mutate({ id: projectId, data });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadFile(projectId, file);
      toast.success('File uploaded');
      queryClient.invalidateQueries({ queryKey: getListUploadsQueryKey({ projectId }) });
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
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

  // Kanban Handlers
  const onDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('taskId', String(id));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData('taskId'));
    if (taskId) {
      const task = tasks?.find(t => t.id === taskId);
      if (task && task.status !== status) {
        updateTaskStatusMutation.mutate({ id: taskId, data: { status } });
      }
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
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

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-5 bg-muted/50 border border-border/50">
          <TabsTrigger value="overview" className="gap-2"><Briefcase className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2"><CheckSquare className="h-4 w-4" /> Tasks</TabsTrigger>
          <TabsTrigger value="files" className="gap-2"><Files className="h-4 w-4" /> Files</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" /> Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 focus-visible:outline-none">
          <div className="grid md:grid-cols-2 gap-6">
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
        </TabsContent>

        <TabsContent value="team" className="mt-6 focus-visible:outline-none">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold tracking-tight">Project Team</h3>
            <Button onClick={() => { memberForm.reset(); setMemberDialogOpen(true); }} className="gap-2">
              <UserPlus className="h-4 w-4" /> Add Member
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {members?.map((member) => (
              <Card key={member.id} className="border-border/50 shadow-sm relative overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-lg shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-base leading-none">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <div className="pt-2">
                          <Badge variant="outline" className={cn("text-xs rounded-full border", ROLE_COLORS[member.role])}>
                            {member.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                    onClick={() => removeMemberMutation.mutate({ id: projectId, memberId: member.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {!members?.length && (
              <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl">
                No team members added yet.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6 focus-visible:outline-none">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold tracking-tight">Project Board</h3>
            <Button asChild className="gap-2">
              <Link href="/tasks">
                <Plus className="h-4 w-4" /> Add Task
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {[TaskStatus.todo, TaskStatus.in_progress, TaskStatus.review, TaskStatus.done].map(status => {
              const columnTasks = tasks?.filter(t => t.status === status) || [];
              return (
                <div 
                  key={status} 
                  className="flex flex-col gap-3 min-h-[400px] bg-muted/30 rounded-xl p-3 border border-border/50"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, status)}
                >
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        status === TaskStatus.todo && "bg-slate-400",
                        status === TaskStatus.in_progress && "bg-blue-500",
                        status === TaskStatus.review && "bg-amber-500",
                        status === TaskStatus.done && "bg-green-500",
                      )} />
                      {TASK_STATUS_LABELS[status]}
                    </h3>
                    <span className="bg-background text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full border border-border/50 shadow-sm">
                      {columnTasks.length}
                    </span>
                  </div>
                  
                  {columnTasks.map(task => (
                    <Card 
                      key={task.id} 
                      draggable 
                      onDragStart={(e) => onDragStart(e, task.id)}
                      className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm bg-card"
                    >
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm font-medium leading-tight">{task.title}</p>
                        <div className="flex items-center justify-between pt-2">
                          {task.assignedMemberName ? (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[100px]">
                              {task.assignedMemberName}
                            </span>
                          ) : <span />}
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider",
                            task.priority === TaskPriority.low ? "bg-slate-500/10 text-slate-500 border-slate-500/20" :
                            task.priority === TaskPriority.medium ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                            task.priority === TaskPriority.high ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                            "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {task.priority}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-6 focus-visible:outline-none">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold tracking-tight">Project Files</h3>
            <div className="relative">
              <Input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button disabled={isUploading} className="gap-2 pointer-events-none">
                <UploadCloud className="h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uploads?.map((file) => (
              <Card key={file.id} className="border-border/50 shadow-sm flex items-center p-3 gap-3 group">
                <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {file.mimeType.startsWith('image/') ? <ImageIcon className="h-5 w-5" /> :
                   file.mimeType.includes('pdf') ? <FileText className="h-5 w-5" /> : 
                   <FileIcon className="h-5 w-5" />}
                </div>
                <div className="flex-1 overflow-hidden">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary hover:underline truncate block">
                    {file.originalName}
                  </a>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • {format(new Date(file.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteUploadMutation.mutate({ id: file.id })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            ))}
            {!uploads?.length && (
              <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/20">
                <UploadCloud className="h-10 w-10 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium text-foreground">No files uploaded yet</p>
                <p className="text-sm mt-1">Drag and drop or click upload to add files</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6 focus-visible:outline-none">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Project Activity</CardTitle>
              <CardDescription>Recent changes and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border/10 before:via-border/50 before:to-transparent">
                {activities?.map((activity) => (
                  <div key={activity.id} className="relative flex gap-4">
                    <div className="w-10 h-10 rounded-full border-4 border-background bg-muted flex items-center justify-center shrink-0 z-10 text-muted-foreground">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col pt-2.5">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <time className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </time>
                    </div>
                  </div>
                ))}
                {!activities?.length && (
                  <div className="text-center py-8 text-muted-foreground">No activity recorded yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <Form {...memberForm}>
            <form onSubmit={memberForm.handleSubmit(onMemberSubmit)} className="space-y-4 pt-4">
              <FormField
                control={memberForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={memberForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={memberForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(MemberRole).map(([k, v]) => (
                          <SelectItem key={k} value={v}>
                            {k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={addMemberMutation.isPending}>
                  Add Member
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}