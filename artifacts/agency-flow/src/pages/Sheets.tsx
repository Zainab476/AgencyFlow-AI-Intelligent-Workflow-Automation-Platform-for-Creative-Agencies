import { useState } from 'react';
import { Link2, RefreshCw, Trash2, Plus, Clock, CheckCircle2, AlertCircle, Loader2, Table2 } from 'lucide-react';
import {
  useListSheetConnections,
  useDeleteSheetConnection,
  useSyncSheet,
  useListSyncHistory,
  getListSheetConnectionsQueryKey,
  getListSyncHistoryQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ConnectSheetDialog from '@/components/sheets/ConnectSheetDialog';
import SyncConflictDialog from '@/components/sheets/SyncConflictDialog';
import type { SyncResult, SyncHistoryItem } from '@workspace/api-client-react';

export default function Sheets() {
  const qc = useQueryClient();
  const [connectOpen, setConnectOpen] = useState(false);
  const [conflictResult, setConflictResult] = useState<SyncResult | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const { data: connections = [], isLoading } = useListSheetConnections({
    query: { queryKey: getListSheetConnectionsQueryKey() },
  });
  const { data: history = [] } = useListSyncHistory({
    query: { queryKey: getListSyncHistoryQueryKey() },
  });

  const deleteMutation = useDeleteSheetConnection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSheetConnectionsQueryKey() });
        toast.success('Spreadsheet disconnected');
      },
    },
  });

  const syncMutation = useSyncSheet({
    mutation: {
      onSuccess: (result, variables) => {
        setSyncingId(null);
        if (result.conflicts && result.conflicts.length > 0) {
          setConflictResult(result);
        } else {
          const s = result.summary;
          toast.success(`Sync complete — ${s.created} created, ${s.updated} updated`);
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

  const handleSync = (id: number) => {
    setSyncingId(id);
    syncMutation.mutate({ id });
  };

  const handleConflictResolved = () => {
    setConflictResult(null);
    qc.invalidateQueries({ queryKey: getListSyncHistoryQueryKey() });
    toast.success('Conflicts resolved — sync complete');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Google Sheets</h1>
          <p className="text-muted-foreground mt-1">Import and sync project & client data from spreadsheets.</p>
        </div>
        <Button onClick={() => setConnectOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Connect Spreadsheet
        </Button>
      </div>

      {/* Connections */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Connected Spreadsheets</h2>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : connections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Table2 className="h-10 w-10 text-muted-foreground/40 mb-4" />
              <p className="font-medium">No spreadsheets connected</p>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                Connect a Google Sheet to import projects and clients.
              </p>
              <Button onClick={() => setConnectOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Connect Spreadsheet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <Card key={conn.id} className="border-border/50 shadow-sm">
                <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link2 className="h-4 w-4 text-green-500 shrink-0" />
                      <p className="font-semibold truncate">{conn.spreadsheetName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tab: <span className="font-mono">{conn.tabName}</span>
                      {conn.lastSyncAt && (
                        <> &nbsp;·&nbsp; Last synced {format(new Date(conn.lastSyncAt), 'MMM d, h:mm a')}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={syncingId === conn.id}
                      onClick={() => handleSync(conn.id)}
                    >
                      {syncingId === conn.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Sync
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate({ id: conn.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Sync History */}
      {history.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Sync History</h2>
          <div className="space-y-2">
            {history.slice(0, 20).map((h: SyncHistoryItem) => (
              <SyncHistoryRow key={h.id} item={h} />
            ))}
          </div>
        </section>
      )}

      <ConnectSheetDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnected={() => {
          qc.invalidateQueries({ queryKey: getListSheetConnectionsQueryKey() });
          toast.success('Spreadsheet connected');
          setConnectOpen(false);
        }}
      />

      {conflictResult && (
        <SyncConflictDialog
          open={!!conflictResult}
          onOpenChange={(open) => { if (!open) setConflictResult(null); }}
          result={conflictResult}
          onResolved={handleConflictResolved}
        />
      )}
    </div>
  );
}

function SyncHistoryRow({ item }: { item: SyncHistoryItem }) {
  const s = item.summary as any;
  const isConflict = item.status === 'pending_confirmation';
  const isSuccess = item.status === 'success';
  const isFailed = item.status === 'failed';

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
      <div className="shrink-0">
        {isSuccess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {isConflict && <AlertCircle className="h-4 w-4 text-amber-500" />}
        {isFailed && <AlertCircle className="h-4 w-4 text-destructive" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{item.spreadsheetName ?? 'Spreadsheet'}</span>
          <Badge
            variant={isSuccess ? 'default' : isConflict ? 'outline' : 'destructive'}
            className={`text-xs ${isConflict ? 'text-amber-600 border-amber-300' : ''}`}
          >
            {isConflict ? 'Needs review' : item.status}
          </Badge>
        </div>
        {s && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {s.created} created · {s.updated} updated · {s.skipped} skipped
            {s.conflictsFound > 0 && ` · ${s.conflictsFound} conflicts`}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {format(new Date(item.createdAt), 'MMM d, h:mm a')}
      </span>
    </div>
  );
}
