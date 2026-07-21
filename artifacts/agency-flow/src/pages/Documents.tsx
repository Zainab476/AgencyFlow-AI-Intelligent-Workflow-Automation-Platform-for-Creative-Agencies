import { useState } from 'react';
import { format } from 'date-fns';
import {
  FileText, FileSpreadsheet, Presentation, Receipt,
  Download, Trash2, Plus, Search, Loader2, FolderOpen
} from 'lucide-react';
import {
  useListDocuments,
  useDeleteDocument,
  useListProjects,
  getListDocumentsQueryKey,
  type GeneratedDocument,
  type DocumentType,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const DOC_TYPE_META: Record<DocumentType, { label: string; icon: React.ElementType; color: string }> = {
  proposal: { label: 'Proposal', icon: FileText, color: 'border-violet-500/30 bg-violet-500/10 text-violet-700' },
  contract: { label: 'Contract', icon: FileSpreadsheet, color: 'border-blue-500/30 bg-blue-500/10 text-blue-700' },
  presentation: { label: 'Presentation', icon: Presentation, color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' },
  invoice: { label: 'Invoice', icon: Receipt, color: 'border-amber-500/30 bg-amber-500/10 text-amber-700' },
};

const EXPORT_FORMATS: { format: 'pdf' | 'docx' | 'pptx'; label: string; color: string }[] = [
  { format: 'pdf', label: 'PDF', color: 'text-red-600 hover:bg-red-50' },
  { format: 'docx', label: 'DOCX', color: 'text-blue-600 hover:bg-blue-50' },
  { format: 'pptx', label: 'PPTX', color: 'text-orange-600 hover:bg-orange-50' },
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

export default function Documents() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useListDocuments();
  const { data: projects } = useListProjects();
  const { mutateAsync: deleteDoc, isPending: isDeleting } = useDeleteDocument();

  const filtered = (documents ?? []).filter((doc) => {
    const matchesSearch =
      !search ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      (doc.projectName ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectFilter === 'all' || String(doc.projectId) === projectFilter;
    return matchesSearch && matchesProject;
  });

  const handleDownload = async (doc: GeneratedDocument, format: 'pdf' | 'docx' | 'pptx') => {
    const key = `${doc.id}-${format}`;
    setDownloading(key);
    try {
      await downloadDocument(doc.id, format, doc.title);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      toast.success('Document deleted');
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">
            AI-generated proposals, contracts, presentations, and invoices
          </p>
        </div>
        <Button onClick={() => setLocation('/projects')} className="gap-2">
          <Plus className="h-4 w-4" />
          Generate Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {(projects ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.campaignName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      {!isLoading && (documents ?? []).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(Object.entries(DOC_TYPE_META) as [DocumentType, typeof DOC_TYPE_META[DocumentType]][]).map(([type, meta]) => {
            const count = (documents ?? []).filter((d) => d.type === type).length;
            const Icon = meta.icon;
            return (
              <div key={type} className={cn('rounded-lg border px-4 py-3 flex items-center gap-3', meta.color)}>
                <Icon className="h-5 w-5 opacity-70" />
                <div>
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs opacity-70">{meta.label}s</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">
              {search || projectFilter !== 'all' ? 'No documents match your filters' : 'No documents yet'}
            </p>
            {!search && projectFilter === 'all' && (
              <p className="text-sm text-muted-foreground mt-1">
                Open a project and go to the AI tab to generate your first document.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const meta = DOC_TYPE_META[doc.type as DocumentType] ?? DOC_TYPE_META.proposal;
            const Icon = meta.icon;

            return (
              <Card key={doc.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', meta.color)}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm truncate">{doc.title}</h3>
                        <Badge variant="outline" className={cn('text-[10px] capitalize shrink-0', meta.color)}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {doc.projectName && (
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" />
                            {doc.projectName}
                          </span>
                        )}
                        <span>{format(new Date(doc.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {EXPORT_FORMATS.map(({ format: fmt, label, color }) => (
                        <Button
                          key={fmt}
                          variant="ghost"
                          size="sm"
                          className={cn('h-8 px-2 text-xs gap-1', color)}
                          onClick={() => handleDownload(doc, fmt)}
                          disabled={!!downloading}
                        >
                          {downloading === `${doc.id}-${fmt}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          {label}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteId(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
