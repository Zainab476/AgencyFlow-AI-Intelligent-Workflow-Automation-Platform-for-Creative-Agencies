import { useState } from 'react';
import { useGenerateDocument, getListDocumentsQueryKey } from '@workspace/api-client-react';
import type { GeneratedDocument, DocumentType } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText, FileSpreadsheet, Presentation, Receipt,
  Loader2, Download, CheckCircle2, ArrowLeft, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerateDocumentDialogProps {
  projectId: number;
  projectName: string;
  open: boolean;
  onClose: () => void;
}

const DOC_TYPES: { type: DocumentType; label: string; description: string; icon: React.ElementType; color: string }[] = [
  {
    type: 'proposal' as DocumentType,
    label: 'Campaign Proposal',
    description: 'Executive summary, goals, audience, scope, timeline, and budget breakdown.',
    icon: FileText,
    color: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10',
  },
  {
    type: 'contract' as DocumentType,
    label: 'Service Contract',
    description: 'Full service agreement with deliverables, payment schedule, and legal terms.',
    icon: FileSpreadsheet,
    color: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
  },
  {
    type: 'presentation' as DocumentType,
    label: 'Presentation Deck',
    description: 'Client-ready slide deck with strategy, timeline, and investment overview.',
    icon: Presentation,
    color: 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10',
  },
  {
    type: 'invoice' as DocumentType,
    label: 'Invoice',
    description: 'Itemized invoice with project line items, tax, and payment instructions.',
    icon: Receipt,
    color: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
  },
];

const EXPORT_FORMATS: { format: 'pdf' | 'docx' | 'pptx'; label: string; icon: string; color: string }[] = [
  { format: 'pdf', label: 'PDF', icon: '📄', color: 'bg-red-500 hover:bg-red-600' },
  { format: 'docx', label: 'Word', icon: '📝', color: 'bg-blue-500 hover:bg-blue-600' },
  { format: 'pptx', label: 'PowerPoint', icon: '📊', color: 'bg-orange-500 hover:bg-orange-600' },
];

async function downloadDocument(id: number, format: 'pdf' | 'docx' | 'pptx', title: string) {
  const token = localStorage.getItem('af_token');
  const res = await fetch(`/api/documents/${id}/export/${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DocumentPreview({ doc }: { doc: GeneratedDocument }) {
  const content = doc.content as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : String(v ?? ''));
  const arr = (v: unknown): string[] => Array.isArray(v) ? (v as unknown[]).map(str) : [];

  return (
    <ScrollArea className="h-[340px] pr-2">
      <div className="space-y-4 text-sm">
        {doc.type === 'proposal' && (
          <>
            <PreviewSection title="Executive Summary">
              <p className="text-muted-foreground leading-relaxed">{str(content.executiveSummary)}</p>
            </PreviewSection>
            <PreviewSection title="Campaign Goals">
              <BulletList items={arr(content.campaignGoals)} />
            </PreviewSection>
            {typeof content.targetAudience === 'object' && content.targetAudience && (
              <PreviewSection title="Target Audience">
                <p className="text-muted-foreground">{str((content.targetAudience as Record<string, unknown>).primary)}</p>
              </PreviewSection>
            )}
            <PreviewSection title="Scope of Work">
              <BulletList items={arr(content.scope)} />
            </PreviewSection>
            {Array.isArray(content.deliverables) && (
              <PreviewSection title="Deliverables">
                {(content.deliverables as Record<string, unknown>[]).map((d, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-medium text-foreground">{str(d.item)}</p>
                    <p className="text-muted-foreground text-xs">{str(d.description)}</p>
                  </div>
                ))}
              </PreviewSection>
            )}
          </>
        )}

        {doc.type === 'contract' && (
          <>
            <PreviewSection title="Parties">
              <p className="text-muted-foreground">Agency: <strong>{str(content.agencyName)}</strong></p>
              <p className="text-muted-foreground">Client: <strong>{str(content.clientName)}</strong></p>
              <p className="text-muted-foreground">Effective: <strong>{str(content.effectiveDate)}</strong></p>
            </PreviewSection>
            <PreviewSection title="Project Description">
              <p className="text-muted-foreground leading-relaxed">{str(content.projectDescription)}</p>
            </PreviewSection>
            <PreviewSection title="Scope of Work">
              <BulletList items={arr(content.scope)} />
            </PreviewSection>
            {typeof content.payment === 'object' && content.payment && (
              <PreviewSection title="Payment">
                <p className="font-semibold text-primary mb-2">
                  Total: ${Number((content.payment as Record<string, unknown>).total ?? 0).toLocaleString()}
                </p>
                {Array.isArray((content.payment as Record<string, unknown>).schedule) && (
                  (content.payment as Record<string, unknown>).schedule as Record<string, unknown>[]
                ).map((s, i) => (
                  <p key={i} className="text-muted-foreground text-xs">• {str(s.milestone)}: ${Number(s.amount).toLocaleString()}</p>
                ))}
              </PreviewSection>
            )}
          </>
        )}

        {doc.type === 'presentation' && (
          <>
            <PreviewSection title="Slide Deck Overview">
              <p className="text-muted-foreground mb-2">Client: <strong>{str(content.client)}</strong> · {str(content.date)}</p>
            </PreviewSection>
            {Array.isArray(content.slides) && (
              <PreviewSection title={`Slides (${(content.slides as unknown[]).length})`}>
                {(content.slides as Record<string, unknown>[]).map((slide, i) => (
                  <div key={i} className="flex gap-2 mb-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-foreground font-medium">{str(slide.title)}</span>
                  </div>
                ))}
              </PreviewSection>
            )}
          </>
        )}

        {doc.type === 'invoice' && (
          <>
            <PreviewSection title="Invoice Details">
              <p className="text-muted-foreground">Number: <strong>{str(content.invoiceNumber)}</strong></p>
              <p className="text-muted-foreground">Issued: <strong>{str(content.issueDate)}</strong></p>
              <p className="text-muted-foreground">Due: <strong>{str(content.dueDate)}</strong></p>
              <p className="text-muted-foreground">Client: <strong>{str(content.clientName)}</strong></p>
            </PreviewSection>
            {Array.isArray(content.items) && (
              <PreviewSection title="Line Items">
                <div className="space-y-1">
                  {(content.items as Record<string, unknown>[]).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{str(item.description)}</span>
                      <span className="font-medium">${Number(item.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-primary">
                  <span>Total</span>
                  <span>${Number(content.total ?? 0).toLocaleString()} {str(content.currency)}</span>
                </div>
              </PreviewSection>
            )}
            {content.notes && (
              <PreviewSection title="Notes">
                <p className="text-muted-foreground text-xs">{str(content.notes)}</p>
              </PreviewSection>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</p>
      {children}
      <Separator className="mt-3" />
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-1.5 text-muted-foreground">
          <span className="text-primary mt-0.5">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function GenerateDocumentDialog({ projectId, projectName, open, onClose }: GenerateDocumentDialogProps) {
  const [step, setStep] = useState<'select' | 'generating' | 'done'>('select');
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { mutateAsync: generate, isPending } = useGenerateDocument();

  const handleGenerate = async () => {
    if (!selectedType) return;
    setStep('generating');
    try {
      const doc = await generate({ data: { projectId, type: selectedType } });
      setGeneratedDoc(doc);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    } catch {
      toast.error('Failed to generate document. Please try again.');
      setStep('select');
    }
  };

  const handleDownload = async (format: 'pdf' | 'docx' | 'pptx') => {
    if (!generatedDoc) return;
    setDownloading(format);
    try {
      await downloadDocument(generatedDoc.id, format, generatedDoc.title);
      toast.success(`${format.toUpperCase()} downloaded successfully`);
    } catch {
      toast.error('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedType(null);
    setGeneratedDoc(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 'select' && 'Generate AI Document'}
            {step === 'generating' && 'Generating Document…'}
            {step === 'done' && generatedDoc?.title}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && `AI will generate a professional document for "${projectName}" using Gemini.`}
            {step === 'generating' && 'Please wait while Gemini creates your document. This takes 10–20 seconds.'}
            {step === 'done' && 'Your document is ready. Preview it below and export in your preferred format.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Select type */}
        {step === 'select' && (
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {DOC_TYPES.map(({ type, label, description, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  'w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                  color,
                  selectedType === type
                    ? 'ring-2 ring-primary ring-offset-2'
                    : 'border-border'
                )}
              >
                <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{description}</p>
                </div>
                {selectedType === type && (
                  <CheckCircle2 className="h-4 w-4 text-primary ml-auto mt-0.5 shrink-0" />
                )}
              </button>
            ))}
            <div className="flex justify-end pt-2">
              <Button onClick={handleGenerate} disabled={!selectedType} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </Button>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-primary opacity-30" />
            </div>
            <div className="text-center">
              <p className="font-medium">Gemini is writing your {selectedType}…</p>
              <p className="text-muted-foreground text-sm mt-1">Analyzing project data and generating content</p>
            </div>
          </div>
        )}

        {/* Step: Done — Preview + Export */}
        {step === 'done' && generatedDoc && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Type badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize border-primary/30 text-primary bg-primary/5">
                {generatedDoc.type}
              </Badge>
              <span className="text-xs text-muted-foreground">Generated just now</span>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-hidden border border-border rounded-lg p-4 bg-muted/20">
              <DocumentPreview doc={generatedDoc} />
            </div>

            {/* Export buttons */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Export As</p>
              <div className="flex gap-2">
                {EXPORT_FORMATS.map(({ format, label, icon, color }) => (
                  <Button
                    key={format}
                    onClick={() => handleDownload(format)}
                    disabled={!!downloading}
                    className={cn('flex-1 gap-1.5 text-white', color)}
                    size="sm"
                  >
                    {downloading === format ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {icon} {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={() => { setStep('select'); setGeneratedDoc(null); }} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Generate Another
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
