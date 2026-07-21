import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { 
  Activity as ActivityIcon, 
  FolderPlus, 
  FileEdit, 
  CheckSquare, 
  CheckCircle2, 
  Edit3, 
  UserPlus, 
  UserMinus, 
  Upload,
  ArrowUpRight
} from 'lucide-react';
import { 
  useListActivity, 
  useListProjects,
  getListActivityQueryKey,
  ActivityAction
} from '@workspace/api-client-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ActivityLog() {
  const [projectId, setProjectId] = useState<string>('all');

  const { data: projects } = useListProjects();
  
  const { data: activities, isLoading } = useListActivity(
    { 
      projectId: projectId !== 'all' ? parseInt(projectId) : undefined,
      limit: 100
    },
    { 
      query: { 
        queryKey: getListActivityQueryKey({ 
          projectId: projectId !== 'all' ? parseInt(projectId) : undefined,
          limit: 100
        }) 
      } 
    }
  );

  const getActionDetails = (action: ActivityAction) => {
    switch (action) {
      case 'project_created': return { icon: FolderPlus, color: 'text-primary bg-primary/10', label: 'Project Created' };
      case 'project_updated': return { icon: FileEdit, color: 'text-blue-500 bg-blue-500/10', label: 'Project Updated' };
      case 'task_created': return { icon: CheckSquare, color: 'text-amber-500 bg-amber-500/10', label: 'Task Created' };
      case 'task_completed': return { icon: CheckCircle2, color: 'text-green-500 bg-green-500/10', label: 'Task Completed' };
      case 'task_updated': return { icon: Edit3, color: 'text-blue-500 bg-blue-500/10', label: 'Task Updated' };
      case 'member_added': return { icon: UserPlus, color: 'text-indigo-500 bg-indigo-500/10', label: 'Member Added' };
      case 'member_removed': return { icon: UserMinus, color: 'text-destructive bg-destructive/10', label: 'Member Removed' };
      case 'file_uploaded': return { icon: Upload, color: 'text-teal-500 bg-teal-500/10', label: 'File Uploaded' };
      default: return { icon: ActivityIcon, color: 'text-muted-foreground bg-muted', label: 'Activity' };
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground mt-1">Audit trail of all agency actions.</p>
        </div>
        <div className="w-full md:w-64">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.campaignName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <Skeleton className="w-5 h-5 rounded-full" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/50 bg-card shadow-sm">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !activities || activities.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border/50">
          <ActivityIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No activity found</h3>
          <p className="text-muted-foreground text-sm">
            {projectId !== 'all' ? "No actions recorded for this project yet." : "There is no recent activity."}
          </p>
        </div>
      ) : (
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border/10 before:via-border/50 before:to-transparent pt-4">
          {activities.map((activity, index) => {
            const { icon: Icon, color, label } = getActionDetails(activity.action);
            return (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10",
                  color
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </time>
                    </div>
                    
                    <p className="text-sm font-medium text-foreground">
                      {activity.description}
                    </p>
                    
                    {activity.projectId && (
                      <Link href={`/projects/${activity.projectId}`}>
                        <span className="inline-flex items-center mt-2 text-xs font-medium text-primary hover:underline cursor-pointer">
                          {activity.projectName || 'View Project'}
                          <ArrowUpRight className="h-3 w-3 ml-0.5" />
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}