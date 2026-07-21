import { useState } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Key,
  Globe,
  Activity,
  BookOpen,
  Eye,
  EyeOff,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useListWebhookConfigs,
  useCreateWebhookConfig,
  useUpdateWebhookConfig,
  useDeleteWebhookConfig,
  useListInboundTokens,
  useCreateInboundToken,
  useRevokeInboundToken,
  useRotateInboundToken,
  useListExecutionLogs,
  getListWebhookConfigsQueryKey,
  getListInboundTokensQueryKey,
  getListExecutionLogsQueryKey,
  type WebhookConfig,
  type InboundToken,
  type ExecutionLog,
} from '@workspace/api-client-react';
import { cn } from '@/lib/utils';

const ALL_EVENTS = [
  'project.created',
  'project.updated',
  'task.created',
  'task.status_changed',
  'document.generated',
];

export default function Workflows() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<WebhookConfig | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const { data: configs = [], isLoading: configsLoading } = useListWebhookConfigs({
    query: { queryKey: getListWebhookConfigsQueryKey() },
  });
  const { data: tokens = [], isLoading: tokensLoading } = useListInboundTokens({
    query: { queryKey: getListInboundTokensQueryKey() },
  });
  const { data: logs = [], isLoading: logsLoading } = useListExecutionLogs(
    undefined,
    { query: { queryKey: getListExecutionLogsQueryKey() } }
  );

  const deleteMutation = useDeleteWebhookConfig({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListWebhookConfigsQueryKey() });
        toast.success('Webhook configuration deleted');
      },
      onError: () => toast.error('Failed to delete webhook'),
    },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Connect AgencyFlow to n8n with outbound webhooks and inbound action endpoints.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {/* Webhook Configurations */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Outbound Webhooks
        </h2>
        {configsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : configs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Webhook className="h-10 w-10 text-muted-foreground/40 mb-4" />
              <p className="font-medium">No webhook configurations</p>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                Register an n8n endpoint to receive signed events when things happen in AgencyFlow.
              </p>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Webhook
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <WebhookConfigCard
                key={config.id}
                config={config}
                onEdit={() => setEditConfig(config)}
                onDelete={() => deleteMutation.mutate({ id: config.id })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Inbound Tokens */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Inbound Action Tokens
        </h2>
        <p className="text-sm text-muted-foreground -mt-2">
          Use these tokens in n8n's HTTP Request nodes to call AgencyFlow actions (analyze, generate-document, notify, send-email).
        </p>
        <InboundTokensSection tokens={tokens} isLoading={tokensLoading} configs={configs} />
      </section>

      {/* Execution Logs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Execution Log
        </h2>
        <ExecutionLogTable logs={logs} isLoading={logsLoading} />
      </section>

      {/* How to connect n8n guide */}
      <section>
        <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2 w-full justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                How to connect n8n
              </span>
              {guideOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-3 border-border/50">
              <CardContent className="pt-6 space-y-6 text-sm">
                <div>
                  <h3 className="font-semibold text-base mb-2">1. Set up n8n Webhook trigger</h3>
                  <p className="text-muted-foreground">In n8n, add a <strong>Webhook</strong> node as your trigger. Copy its URL and register it here as an Outbound Webhook with the event types you want to receive (e.g., <code className="bg-muted px-1 rounded">project.created</code>).</p>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-2">2. Verify the HMAC signature (optional but recommended)</h3>
                  <p className="text-muted-foreground">Each request includes an <code className="bg-muted px-1 rounded">X-AgencyFlow-Signature</code> header (<code className="bg-muted px-1 rounded">sha256=&lt;hex&gt;</code>). In n8n use a <strong>Function</strong> node to compute <code className="bg-muted px-1 rounded">HMAC-SHA256(body, secret)</code> and compare it against the header to ensure authenticity.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-2">3. Chain inbound action endpoints</h3>
                  <p className="text-muted-foreground mb-2">After your trigger, add <strong>HTTP Request</strong> nodes to call back into AgencyFlow:</p>
                  <div className="space-y-2">
                    {[
                      { action: 'analyze', body: '{ "projectId": 123 }', desc: 'Run AI analysis on a project' },
                      { action: 'generate-document', body: '{ "projectId": 123, "type": "proposal" }', desc: 'Generate a document (proposal/contract/presentation/invoice)' },
                      { action: 'notify', body: '{ "message": "Pipeline complete", "title": "Workflow Done" }', desc: 'Create an in-app notification' },
                      { action: 'send-email', body: '{ "to": "client@example.com", "subject": "Your Proposal", "message": "..." }', desc: 'Send a transactional email via Resend' },
                    ].map(({ action, body, desc }) => (
                      <div key={action} className="bg-muted/50 rounded-lg p-3">
                        <p className="font-mono text-xs font-semibold">POST /api/webhooks/action/{'<token>'}/<span className="text-primary">{action}</span></p>
                        <p className="text-muted-foreground text-xs mt-1">{desc}</p>
                        <p className="font-mono text-xs text-muted-foreground mt-1">Body: {body}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-2">4. Authenticate inbound requests</h3>
                  <p className="text-muted-foreground">Create an <strong>Inbound Token</strong> above and paste it as the <code className="bg-muted px-1 rounded">token</code> path parameter. Treat it like a password — keep it in n8n's credential store.</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <p className="font-semibold mb-2">Example orchestration</p>
                  <p className="text-muted-foreground">Project Created → AI Analyze → Generate Proposal → Generate Contract → Generate Presentation → Notify user → Send email</p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </section>

      {/* Create / Edit dialogs */}
      <WebhookConfigDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: getListWebhookConfigsQueryKey() });
          setCreateOpen(false);
        }}
      />
      {editConfig && (
        <WebhookConfigDialog
          open={!!editConfig}
          onOpenChange={(o) => { if (!o) setEditConfig(null); }}
          existing={editConfig}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: getListWebhookConfigsQueryKey() });
            setEditConfig(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Webhook Config Card ──────────────────────────────────────────────────────

function WebhookConfigCard({
  config,
  onEdit,
  onDelete,
}: {
  config: WebhookConfig;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySecret = () => {
    navigator.clipboard.writeText(config.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{config.name}</span>
              <Badge variant={config.active ? 'default' : 'secondary'} className="text-xs">
                {config.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono truncate">{config.url}</p>
            <div className="flex flex-wrap gap-1">
              {(config.eventTypes as string[]).map((e) => (
                <Badge key={e} variant="outline" className="text-xs font-mono">{e}</Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Secret:</span>
              <span className="font-mono text-muted-foreground">
                {showSecret ? config.secret : '••••••••••••••••'}
              </span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowSecret(!showSecret)}>
                {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={copySecret}>
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Webhook Config Dialog ────────────────────────────────────────────────────

function WebhookConfigDialog({
  open,
  onOpenChange,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing?: WebhookConfig;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [secret, setSecret] = useState(existing?.secret ?? '');
  const [eventTypes, setEventTypes] = useState<string[]>((existing?.eventTypes as string[]) ?? []);
  const [active, setActive] = useState(existing?.active ?? true);

  const createMutation = useCreateWebhookConfig({
    mutation: {
      onSuccess: () => { toast.success('Webhook created'); onSaved(); },
      onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create webhook'),
    },
  });

  const updateMutation = useUpdateWebhookConfig({
    mutation: {
      onSuccess: () => { toast.success('Webhook updated'); onSaved(); },
      onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update webhook'),
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (!name.trim() || !url.trim() || eventTypes.length === 0) {
      toast.error('Name, URL, and at least one event type are required');
      return;
    }
    const payload = { name: name.trim(), url: url.trim(), secret: secret.trim() || undefined, eventTypes, active };
    if (existing) {
      updateMutation.mutate({ id: existing.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const toggleEvent = (ev: string) => {
    setEventTypes((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Webhook' : 'Add Webhook'}</DialogTitle>
          <DialogDescription>
            AgencyFlow will POST signed events to this URL when the selected events occur.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input placeholder="My n8n Workflow" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Webhook URL (n8n endpoint)</Label>
            <Input placeholder="https://your-n8n.cloud/webhook/..." value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Secret (leave blank to auto-generate)</Label>
            <Input placeholder="••••••••••••••••" value={secret} onChange={(e) => setSecret(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Event Types</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map((ev) => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => toggleEvent(ev)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-mono border transition-colors',
                    eventTypes.includes(ev)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existing ? 'Save Changes' : 'Create Webhook'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inbound Tokens Section ───────────────────────────────────────────────────

function InboundTokensSection({
  tokens,
  isLoading,
  configs,
}: {
  tokens: InboundToken[];
  isLoading: boolean;
  configs: WebhookConfig[];
}) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenDesc, setTokenDesc] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const createMutation = useCreateInboundToken({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListInboundTokensQueryKey() });
        toast.success('Token created');
        setCreateOpen(false);
        setTokenName('');
        setTokenDesc('');
      },
      onError: () => toast.error('Failed to create token'),
    },
  });

  const revokeMutation = useRevokeInboundToken({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListInboundTokensQueryKey() });
        toast.success('Token revoked');
      },
      onError: () => toast.error('Failed to revoke token'),
    },
  });

  const rotateMutation = useRotateInboundToken({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListInboundTokensQueryKey() });
        toast.success('Token rotated — copy the new token');
      },
      onError: () => toast.error('Failed to rotate token'),
    },
  });

  const copyToken = (id: number, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeTokens = tokens.filter((t) => !t.revokedAt);

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : activeTokens.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Key className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-sm">No active tokens</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Create a token to authenticate n8n's inbound requests.</p>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-3.5 w-3.5" /> Create Token
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeTokens.map((token) => (
            <Card key={token.id} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{token.name}</span>
                      {token.description && (
                        <span className="text-xs text-muted-foreground">— {token.description}</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground truncate">{token.token}</p>
                    <p className="text-xs text-muted-foreground">Created {format(new Date(token.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => copyToken(token.id, token.token)}
                    >
                      {copiedId === token.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      {copiedId === token.id ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => rotateMutation.mutate({ id: token.id })}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Rotate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => revokeMutation.mutate({ id: token.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> New Token
          </Button>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Inbound Token</DialogTitle>
            <DialogDescription>
              This token authenticates n8n's HTTP Request nodes when calling AgencyFlow action endpoints.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Token Name</Label>
              <Input placeholder="n8n Production Token" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="Used in the main proposal pipeline" value={tokenDesc} onChange={(e) => setTokenDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ data: { name: tokenName.trim(), description: tokenDesc.trim() || undefined } })}
              disabled={!tokenName.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Execution Log Table ──────────────────────────────────────────────────────

function ExecutionLogTable({ logs, isLoading }: { logs: ExecutionLog[]; isLoading: boolean }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-sm">No executions yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Outbound webhook fires and inbound action calls will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
          >
            {/* Direction */}
            <Badge
              variant="outline"
              className={cn(
                'text-xs shrink-0',
                log.direction === 'outbound' ? 'border-blue-300 text-blue-600' : 'border-purple-300 text-purple-600'
              )}
            >
              {log.direction}
            </Badge>

            {/* Event */}
            <span className="font-mono text-xs font-medium flex-1 truncate">{log.eventOrAction}</span>

            {/* Status */}
            <Badge
              variant={log.status === 'success' ? 'default' : 'destructive'}
              className="text-xs shrink-0"
            >
              {log.status}
            </Badge>

            {/* Duration */}
            {log.durationMs !== null && log.durationMs !== undefined && (
              <span className="text-xs text-muted-foreground shrink-0">{log.durationMs}ms</span>
            )}

            {/* Time */}
            <span className="text-xs text-muted-foreground shrink-0">
              {format(new Date(log.createdAt), 'MMM d, h:mm:ss a')}
            </span>

            {/* Expand chevron */}
            <ChevronDown
              className={cn('h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform', expanded === log.id && 'rotate-180')}
            />
          </button>

          {expanded === log.id && (
            <div className="border-t border-border/30 px-4 py-3 space-y-3 bg-muted/5">
              {log.error && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">Error</p>
                  <p className="text-xs text-muted-foreground font-mono">{log.error}</p>
                </div>
              )}
              {log.requestBody && (
                <div>
                  <p className="text-xs font-medium mb-1">Request Body</p>
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">{JSON.stringify(log.requestBody, null, 2)}</pre>
                </div>
              )}
              {log.responseBody && (
                <div>
                  <p className="text-xs font-medium mb-1">Response Body</p>
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">{JSON.stringify(log.responseBody, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
