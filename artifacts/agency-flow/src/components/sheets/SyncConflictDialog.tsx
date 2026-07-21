import { useState } from 'react';
import { AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { useConfirmSyncResolutions } from '@workspace/api-client-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { SyncResult } from '@workspace/api-client-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: SyncResult;
  onResolved: () => void;
}

type Decision = 'accept' | 'keep';

export default function SyncConflictDialog({ open, onOpenChange, result, onResolved }: Props) {
  // decisions keyed as `${projectId}-${field}` → 'accept' | 'keep'
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => {
    const init: Record<string, Decision> = {};
    for (const c of result.conflicts ?? []) {
      for (const f of c.fields ?? []) {
        init[`${c.projectId}-${f.field}`] = 'keep';
      }
    }
    return init;
  });

  const confirmMutation = useConfirmSyncResolutions();

  const setDecision = (projectId: number, field: string, decision: Decision) => {
    setDecisions((prev) => ({ ...prev, [`${projectId}-${field}`]: decision }));
  };

  const handleConfirm = async () => {
    const resolutions: Array<{ projectId: number; clientId?: number; field: string; accept: boolean }> = [];
    for (const c of result.conflicts ?? []) {
      for (const f of c.fields ?? []) {
        const key = `${c.projectId}-${f.field}`;
        resolutions.push({
          projectId: c.projectId,
          clientId: c.clientId ?? undefined,
          field: f.field,
          accept: decisions[key] === 'accept',
        });
      }
    }
    await confirmMutation.mutateAsync({
      historyId: result.historyId,
      data: { resolutions },
    });
    onResolved();
  };

  const conflicts = result.conflicts ?? [];
  const totalFields = conflicts.reduce((sum, c) => sum + (c.fields?.length ?? 0), 0);
  const accepted = Object.values(decisions).filter((d) => d === 'accept').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Sync Conflicts Detected</DialogTitle>
          </div>
          <DialogDescription>
            {conflicts.length} project{conflicts.length !== 1 ? 's' : ''} have fields that were manually
            edited in AgencyFlow. Choose which value to keep for each field.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-2">
            {conflicts.map((conflict) => (
              <div key={conflict.projectId} className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{conflict.campaignName}</p>
                  {conflict.isFirstSync && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      First sync
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {(conflict.fields ?? []).map((f) => {
                    const key = `${conflict.projectId}-${f.field}`;
                    const dec = decisions[key] ?? 'keep';
                    return (
                      <div key={f.field} className="rounded-lg border border-border/50 overflow-hidden">
                        <div className="px-3 py-2 bg-muted/30 flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {f.label}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {f.entity}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-border/40">
                          <button
                            onClick={() => setDecision(conflict.projectId, f.field, 'keep')}
                            className={`px-3 py-2.5 text-left transition-colors ${
                              dec === 'keep'
                                ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                                : 'hover:bg-muted/40'
                            }`}
                          >
                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide">
                              Keep (AgencyFlow)
                            </p>
                            <p className="text-sm font-medium truncate">
                              {f.currentValue ?? <span className="text-muted-foreground italic">empty</span>}
                            </p>
                          </button>
                          <button
                            onClick={() => setDecision(conflict.projectId, f.field, 'accept')}
                            className={`px-3 py-2.5 text-left transition-colors ${
                              dec === 'accept'
                                ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                                : 'hover:bg-muted/40'
                            }`}
                          >
                            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" /> Use Sheet Value
                            </p>
                            <p className="text-sm font-medium truncate">{f.sheetValue}</p>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Separator />
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-3 pt-2">
          <div className="flex-1 text-xs text-muted-foreground hidden sm:block">
            {accepted} field{accepted !== 1 ? 's' : ''} will be updated from sheet · {totalFields - accepted} kept
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            className="gap-2"
          >
            {confirmMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Apply Resolutions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
