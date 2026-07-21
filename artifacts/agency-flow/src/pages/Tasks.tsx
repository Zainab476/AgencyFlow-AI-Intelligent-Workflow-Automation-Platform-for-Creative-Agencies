import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  differenceInDays
} from 'date-fns';
import { 
  CheckSquare, 
  Calendar as CalendarIcon, 
  LayoutList, 
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { 
  useListTasks, 
  useCreateTask, 
  useUpdateTask, 
  useUpdateTaskStatus,
  useListProjects,
  useListProjectMembers,
  getListTasksQueryKey,
  TaskStatus,
  TaskPriority,
  Task
} from '@workspace/api-client-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const taskSchema = z.object({
  projectId: z.coerce.number().min(1, 'Project is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignedMemberId: z.coerce.number().optional(),
  dueDate: z.string().optional(),
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('kanban');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: tasks, isLoading: tasksLoading } = useListTasks();
  const { data: projects } = useListProjects();

  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        toast.success('Task created');
        setDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    }
  });

  const updateTaskMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        toast.success('Task updated');
        setDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    }
  });

  const updateStatusMutation = useUpdateTaskStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    }
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      projectId: 0,
      title: '',
      description: '',
      priority: TaskPriority.medium,
      status: TaskStatus.todo,
      dueDate: '',
    },
  });

  const selectedProjectId = form.watch('projectId');
  const { data: members } = useListProjectMembers(selectedProjectId, {
    query: { enabled: !!selectedProjectId }
  });

  const openNewTaskDialog = () => {
    setEditingTask(null);
    form.reset({
      projectId: 0,
      title: '',
      description: '',
      priority: TaskPriority.medium,
      status: TaskStatus.todo,
      dueDate: '',
    });
    setDialogOpen(true);
  };

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task);
    form.reset({
      projectId: task.projectId,
      title: task.title,
      description: task.description || '',
      assignedMemberId: task.assignedMemberId || undefined,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || '',
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: TaskFormValues) => {
    if (editingTask) {
      updateTaskMutation.mutate({ 
        id: editingTask.id, 
        data: {
          ...data,
          assignedMemberId: data.assignedMemberId ? Number(data.assignedMemberId) : undefined
        } 
      });
    } else {
      createTaskMutation.mutate({ 
        data: {
          ...data,
          assignedMemberId: data.assignedMemberId ? Number(data.assignedMemberId) : undefined
        } 
      });
    }
  };

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
        // Optimistic UI update could go here, but for now just mutate
        updateStatusMutation.mutate({ id: taskId, data: { status } });
      }
    }
  };

  // Views rendering
  const renderKanban = () => {
    if (tasksLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-8 rounded-full" />
              </div>
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ))}
        </div>
      );
    }

    const columns: TaskStatus[] = [
      TaskStatus.todo,
      TaskStatus.in_progress,
      TaskStatus.review,
      TaskStatus.done
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {columns.map(status => {
          const columnTasks = tasks?.filter(t => t.status === status) || [];
          
          return (
            <div 
              key={status} 
              className="flex flex-col gap-3 min-h-[300px] bg-muted/30 rounded-xl p-3 border border-border/50"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, status)}
            >
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    status === TaskStatus.todo && "bg-slate-400",
                    status === TaskStatus.in_progress && "bg-blue-500",
                    status === TaskStatus.review && "bg-amber-500",
                    status === TaskStatus.done && "bg-green-500",
                  )} />
                  {STATUS_LABELS[status]}
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
                  onClick={() => openEditTaskDialog(task)}
                  className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm group"
                >
                  <CardContent className="p-3 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      <GripVertical className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                    </div>
                    
                    {task.projectName && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {task.projectName}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        {task.assignedMemberName && (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20" title={task.assignedMemberName}>
                            <span className="text-[10px] font-bold text-primary">
                              {task.assignedMemberName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", PRIORITY_COLORS[task.priority])}>
                          {task.priority}
                        </Badge>
                      </div>
                      
                      {task.dueDate && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium bg-muted/50 px-1.5 py-0.5 rounded-sm">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    return (
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
          <h2 className="text-lg font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-border/50 bg-muted/10">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0 border-border/50">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr bg-muted/5">
          {days.map((day, idx) => {
            const dayTasks = tasks?.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day)) || [];
            
            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "min-h-[120px] p-2 border-b border-r border-border/50 last:border-r-0",
                  !isSameMonth(day, monthStart) ? "bg-muted/30 text-muted-foreground/50" : "bg-background",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <div className="flex justify-end mb-2">
                  <span className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : ""
                  )}>
                    {format(day, dateFormat)}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayTasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => openEditTaskDialog(task)}
                      className={cn(
                        "text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity border",
                        task.status === TaskStatus.done ? "bg-green-500/10 text-green-700 border-green-500/20" :
                        task.status === TaskStatus.in_progress ? "bg-blue-500/10 text-blue-700 border-blue-500/20" :
                        "bg-slate-500/10 text-slate-700 border-slate-500/20"
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderTimeline = () => {
    if (!projects || !tasks) return null;

    // Group tasks by project
    const projectsWithTasks = projects.map(project => ({
      ...project,
      tasks: tasks.filter(t => t.projectId === project.id)
    })).filter(p => p.tasks.length > 0);

    // Find min and max dates across projects to define the timeline range
    let minDate = new Date();
    let maxDate = addMonths(new Date(), 3);

    projectsWithTasks.forEach(p => {
      if (p.startDate) {
        const d = new Date(p.startDate);
        if (d < minDate) minDate = d;
      }
      if (p.endDate) {
        const d = new Date(p.endDate);
        if (d > maxDate) maxDate = d;
      }
      p.tasks.forEach(t => {
        if (t.dueDate) {
          const d = new Date(t.dueDate);
          if (d < minDate) minDate = d;
          if (d > maxDate) maxDate = d;
        }
      });
    });

    const totalDays = Math.max(1, differenceInDays(maxDate, minDate));

    return (
      <Card className="border-border/50 shadow-sm overflow-x-auto">
        <div className="min-w-[800px] p-6 space-y-8">
          {projectsWithTasks.map(project => {
            // Calculate project bar position
            const pStart = project.startDate ? new Date(project.startDate) : minDate;
            const pEnd = project.endDate ? new Date(project.endDate) : maxDate;
            
            const pLeft = Math.max(0, (differenceInDays(pStart, minDate) / totalDays) * 100);
            const pWidth = Math.max(2, (differenceInDays(pEnd, pStart) / totalDays) * 100);

            return (
              <div key={project.id} className="relative pt-6 pb-2 border-b border-border/30 last:border-0">
                <div className="absolute left-0 top-0 text-sm font-bold text-foreground">
                  {project.campaignName}
                </div>
                
                {/* Project Bar */}
                <div className="relative h-6 bg-muted rounded-full w-full mt-4">
                  <div 
                    className="absolute h-full bg-primary/20 border border-primary/30 rounded-full"
                    style={{ left: `${pLeft}%`, width: `${pWidth}%` }}
                  />
                  
                  {/* Task points */}
                  {project.tasks.map(task => {
                    if (!task.dueDate) return null;
                    const tDate = new Date(task.dueDate);
                    const tLeft = Math.max(0, Math.min(100, (differenceInDays(tDate, minDate) / totalDays) * 100));
                    
                    return (
                      <div 
                        key={task.id}
                        onClick={() => openEditTaskDialog(task)}
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-background bg-primary cursor-pointer hover:scale-125 transition-transform shadow-sm group"
                        style={{ left: `calc(${tLeft}% - 8px)` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                          {task.title} ({format(tDate, 'MMM d')})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div className="p-8 mx-auto max-w-7xl space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage deliverables across all active projects.</p>
        </div>
        <Button onClick={openNewTaskDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <Tabs defaultValue="kanban" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="kanban" className="gap-2"><LayoutList className="h-4 w-4" /> Kanban</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2"><CalendarIcon className="h-4 w-4" /> Calendar</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2"><CheckSquare className="h-4 w-4" /> Timeline</TabsTrigger>
        </TabsList>
        
        <TabsContent value="kanban" className="mt-6 focus-visible:outline-none">
          {renderKanban()}
        </TabsContent>
        <TabsContent value="calendar" className="mt-6 focus-visible:outline-none">
          {renderCalendar()}
        </TabsContent>
        <TabsContent value="timeline" className="mt-6 focus-visible:outline-none">
          {renderTimeline()}
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Design homepage hero" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Task details..." className="resize-none h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select 
                        onValueChange={(v) => { field.onChange(v); form.setValue('assignedMemberId', 0); }} 
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.campaignName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedMemberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value ? String(field.value) : undefined}
                        disabled={!selectedProjectId || !members?.length}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members?.map(m => (
                            <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.role.replace('_', ' ')})</SelectItem>
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
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TaskPriority.low}>Low</SelectItem>
                          <SelectItem value={TaskPriority.medium}>Medium</SelectItem>
                          <SelectItem value={TaskPriority.high}>High</SelectItem>
                          <SelectItem value={TaskPriority.urgent}>Urgent</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TaskStatus.todo}>To Do</SelectItem>
                          <SelectItem value={TaskStatus.in_progress}>In Progress</SelectItem>
                          <SelectItem value={TaskStatus.review}>Review</SelectItem>
                          <SelectItem value={TaskStatus.done}>Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}