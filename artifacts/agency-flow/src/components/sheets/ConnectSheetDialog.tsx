import { useState } from 'react';
import { Loader2, ChevronRight, ChevronLeft, Link2, Table2, Eye, Check } from 'lucide-react';
import {
  useCreateSheetConnection,
  useGetSheetHeaders,
  usePreviewSheetRows,
  useUpdateSheetConnection,
} from '@workspace/api-client-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const TARGET_FIELD_LABELS: Record<string, string> = {
  campaignName: 'Campaign Name',
  budget: 'Budget',
  startDate: 'Start Date',
  endDate: 'End Date',
  status: 'Status',
  clientCompanyName: 'Client Company',
  clientContactPerson: 'Contact Person',
  clientEmail: 'Email',
  clientPhone: 'Phone',
};

const NONE_VALUE = '__none__';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

type Step = 'url' | 'mapping' | 'preview';

export default function ConnectSheetDialog({ open, onOpenChange, onConnected }: Props) {
  const [step, setStep] = useState<Step>('url');
  const [urlOrId, setUrlOrId] = useState('');
  const [tabName, setTabName] = useState('Sheet1');
  const [connId, setConnId] = useState<number | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [urlError, setUrlError] = useState('');

  const createMutation = useCreateSheetConnection();
  const updateMutation = useUpdateSheetConnection();

  const headersQuery = useGetSheetHeaders(connId ?? 0, {
    // queryKey is overridden internally by the generated hook; provided here only to satisfy the strict UseQueryOptions type
    query: { queryKey: ['getSheetHeaders', connId], enabled: !!connId && step === 'mapping' },
  });
  const previewQuery = usePreviewSheetRows(connId ?? 0, {
    query: { queryKey: ['previewSheetRows', connId], enabled: !!connId && step === 'preview' },
  });

  const reset = () => {
    setStep('url');
    setUrlOrId('');
    setTabName('Sheet1');
    setConnId(null);
    setColumnMapping({});
    setUrlError('');
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleConnect = async () => {
    setUrlError('');
    try {
      const conn = await createMutation.mutateAsync({
        data: { urlOrId, tabName },
      });
      setConnId(conn.id);
      setStep('mapping');
    } catch (err: any) {
      setUrlError(err?.response?.data?.error ?? 'Could not connect. Check the URL and try again.');
    }
  };

  const handleSaveMapping = async () => {
    if (!connId) return;
    await updateMutation.mutateAsync({ id: connId, data: { columnMapping } });
    setStep('preview');
  };

  const handleFinish = () => {
    reset();
    onConnected();
  };

  const headers: string[] = (headersQuery.data as any)?.headers ?? [];
  const preview = previewQuery.data as any;

  const stepIndex = { url: 0, mapping: 1, preview: 2 }[step];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect a Spreadsheet</DialogTitle>
          <DialogDescription>
            Import and sync project data from Google Sheets.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {(['url', 'mapping', 'preview'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                stepIndex > i ? 'bg-primary border-primary text-primary-foreground'
                : stepIndex === i ? 'border-primary text-primary'
                : 'border-muted text-muted-foreground'
              }`}>
                {stepIndex > i ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${stepIndex === i ? 'font-medium' : 'text-muted-foreground'}`}>
                {s === 'url' ? 'Connect' : s === 'mapping' ? 'Map Columns' : 'Preview'}
              </span>
              {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step: URL */}
        {step === 'url' && (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="sheet-url">Spreadsheet URL or ID</Label>
              <div className="flex gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground self-center shrink-0" />
                <Input
                  id="sheet-url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={urlOrId}
                  onChange={(e) => setUrlOrId(e.target.value)}
                  className="flex-1"
                />
              </div>
              {urlError && <p className="text-sm text-destructive">{urlError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tab-name">Sheet Tab Name</Label>
              <Input
                id="tab-name"
                placeholder="Sheet1"
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The exact name of the tab in your spreadsheet.</p>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              Make sure your Google Sheet is shared with your Google account that's connected to Replit.
            </p>
            <div className="flex justify-end">
              <Button
                onClick={handleConnect}
                disabled={!urlOrId.trim() || createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect & Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step: Column Mapping */}
        {step === 'mapping' && (
          <div className="space-y-5 py-2">
            {headersQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Fetching column headers…
              </div>
            ) : headers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No headers found. Make sure row 1 of your sheet has column names.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Map each spreadsheet column to an AgencyFlow field. Unmapped columns will be ignored.
                </p>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {headers.map((header) => (
                    <div key={header} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="font-mono text-xs truncate max-w-full">
                          {header}
                        </Badge>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Select
                          value={columnMapping[header] ?? NONE_VALUE}
                          onValueChange={(val) => {
                            if (val === NONE_VALUE) {
                              const next = { ...columnMapping };
                              delete next[header];
                              setColumnMapping(next);
                            } else {
                              setColumnMapping((prev) => ({ ...prev, [header]: val }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Skip column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>
                              <span className="text-muted-foreground">Skip column</span>
                            </SelectItem>
                            {Object.entries(TARGET_FIELD_LABELS).map(([field, label]) => (
                              <SelectItem key={field} value={field}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('url')} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSaveMapping}
                disabled={Object.keys(columnMapping).length === 0 || updateMutation.isPending}
                className="gap-2"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Preview Data <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              First 10 rows from your spreadsheet
            </div>
            {previewQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {(preview?.headers ?? []).map((h: string, i: number) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                          {h}
                          {preview?.columnMapping?.[h] && (
                            <span className="ml-1 text-primary/70">→ {TARGET_FIELD_LABELS[preview.columnMapping[h]] ?? preview.columnMapping[h]}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(preview?.rows ?? []).slice(0, 5).map((row: string[], ri: number) => (
                      <tr key={ri} className="border-t border-border/30 hover:bg-muted/20">
                        {(preview?.headers ?? []).map((_: string, ci: number) => (
                          <td key={ci} className="px-3 py-2 whitespace-nowrap text-muted-foreground max-w-32 truncate">
                            {row[ci] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Click "Finish" to save the connection. Use the Sync button on the Sheets page to import data.
            </p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('mapping')} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleFinish} className="gap-2">
                <Check className="h-4 w-4" /> Finish
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
