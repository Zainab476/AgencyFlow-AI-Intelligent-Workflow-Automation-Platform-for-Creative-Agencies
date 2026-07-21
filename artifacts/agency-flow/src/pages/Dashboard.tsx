import { useState } from 'react';
import { Link } from 'wouter';
import { 
  Users, 
  FolderKanban, 
  Activity, 
  DollarSign,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Loader2,
  Table2
} from 'lucide-react';
import { 
  useGetDashboardStats, 
  useGetRecentProjects,
  useListSheetConnections,
  useSyncSheet,
  getGetDashboardStatsQueryKey,
  getGetRecentProjectsQueryKey,
  getListSheetConnectionsQueryKey,
  getListSyncHistoryQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectStatusBadge } from '@/components/ProjectStatusBadge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import SyncConflictDialog from '@/components/sheets/SyncConflictDialog';
import type { SyncResult } from '@workspace/api-client-react';

export default function Dashboard() {
  const qc = useQueryClient();
  const [conflictResult, setConflictResult] = useState<SyncResult | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  
  const { data: recentProjects, isLoading: isProjectsLoading } = useGetRecentProjects(
    { limit: 5 },
    { query: { queryKey: getGetRecentProjectsQueryKey({ limit: 5 }) } }
  );

  const { data: connections = [] } = useListSheetConnections({
    query: { queryKey: getListSheetConnectionsQueryKey() },
  });

  const syncMutation = useSyncSheet({
    mutation: {
      onSuccess: (result) => {
        setSyncingId(null);
        if (result.conflicts && result.conflicts.length > 0) {
          setConflictResult(result);
        } else {
          const s = result.summary;
          toast.success(`Sync complete — ${s.created} created, ${s.updated} updated`);
          qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetRecentProjectsQueryKey({ limit: 5 }) });
        }
        qc.invalidateQueries({ queryKey: getListSheetConnectionsQueryKey() });
        qc.invalidateQueries({ queryKey: getListSyncHistoryQueryKey() });
      },
      onError: (err: any) => {
        setSyncingId(null);
        toast.error(err?.response?.data?.error ?? 'Sync failed');
      },
    },
  });

  const handleQuickSync = () => {
    if (connections.length === 0) return;
    const first = connections[0];
    setSyncingId(first.id);
    syncMutation.mutate({ id: first.id });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isSyncing = syncingId !== null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1 text-lg">Here's what's happening across your agency today.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {connections.length > 0 ? (
            <Button
              variant="outline"
              className="shadow-sm gap-2"
              onClick={handleQuickSync}
              disabled={isSyncing}
            >
              {isSyncing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
              Sync Sheets
            </Button>
          ) : (
            <Button asChild variant="outline" className="shadow-sm gap-2">
              <Link href="/sheets"><Table2 className="h-4 w-4" />Connect Sheets</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="shadow-sm">
            <Link href="/clients">Manage Clients</Link>
          </Button>
          <Button asChild className="shadow-sm">
            <Link href="/projects">View All Projects</Link>
          </Button>
        </div>
      </div>

      {conflictResult && (
        <SyncConflictDialog
          open={!!conflictResult}
          onOpenChange={(open) => { if (!open) setConflictResult(null); }}
          result={conflictResult}
          onResolved={() => {
            setConflictResult(null);
            qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
            qc.invalidateQueries({ queryKey: getGetRecentProjectsQueryKey({ limit: 5 }) });
            toast.success('Conflicts resolved — sync complete');
          }}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats?.activeProjects || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats?.totalClients || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold">{formatCurrency(stats?.totalBudget || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
            <div className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center">
              <FolderKanban className="h-4 w-4 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats?.totalProjects || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7">
        <Card className="md:col-span-4 lg:col-span-5 border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>The latest active projects in your agency.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
              <Link href="/projects">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isProjectsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                    <Skeleton className="h-6 w-[80px] rounded-full" />
                  </div>
                ))}
              </div>
            ) : !recentProjects?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderKanban className="mx-auto h-8 w-8 mb-3 opacity-20" />
                <p>No projects found.</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/projects">Create your first project</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {recentProjects.map((project, index) => (
                  <div 
                    key={project.id} 
                    className="flex items-center justify-between group animate-in slide-in-from-bottom-2 fade-in"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground font-medium text-sm border border-border/50 shadow-sm">
                        {project.campaignName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/projects/${project.id}`}>
                          <p className="text-sm font-medium leading-none hover:text-primary transition-colors cursor-pointer mb-1">
                            {project.campaignName}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Link href={`/clients/${project.clientId}`}>
                            <span className="hover:text-foreground hover:underline cursor-pointer">
                              {project.clientName}
                            </span>
                          </Link>
                          {project.endDate && (
                            <>
                              <span>•</span>
                              <span>Due {format(new Date(project.endDate), 'MMM d, yyyy')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block text-sm font-medium text-right">
                        {project.budget ? formatCurrency(project.budget) : 'TBD'}
                      </div>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
            <CardDescription>Breakdown of all projects</CardDescription>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <div className="space-y-4 mt-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !stats?.projectsByStatus?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active projects to break down.
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {stats.projectsByStatus.map((stat, index) => (
                  <div 
                    key={stat.status} 
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ProjectStatusBadge status={stat.status} />
                    </div>
                    <span className="font-medium text-sm">{stat.count}</span>
                  </div>
                ))}
              </div>
            )}
            
            {!isStatsLoading && (
              <div className="mt-8 pt-6 border-t border-border flex items-center justify-center">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-primary font-medium mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Healthy Pipeline</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Keep operations running smoothly.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}