import { useState } from 'react';
import { useAnalyzeProject } from '@workspace/api-client-react';
import type { ProjectAnalysis } from '@workspace/api-client-react';
import {
  Sparkles, AlertTriangle, Info, CheckCircle2, Target, Users,
  Package, Lightbulb, ShieldAlert, Loader2, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProjectAnalysisCardProps {
  projectId: number;
}

const IMPORTANCE_STYLES = {
  critical: { color: 'border-destructive/30 bg-destructive/10 text-destructive', icon: AlertTriangle },
  recommended: { color: 'border-amber-500/30 bg-amber-500/10 text-amber-600', icon: Info },
  optional: { color: 'border-blue-500/30 bg-blue-500/10 text-blue-600', icon: Info },
};

function Section({ icon: Icon, title, children, defaultOpen = true }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 font-medium text-sm">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 py-3 text-sm text-foreground/80">{children}</div>}
    </div>
  );
}

export default function ProjectAnalysisCard({ projectId }: ProjectAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);

  const { mutateAsync, isPending, error } = useAnalyzeProject();

  const handleAnalyze = async () => {
    try {
      const result = await mutateAsync({ projectId });
      setAnalysis(result);
    } catch {
      // error shown below
    }
  };

  if (!analysis && !isPending) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">AI Project Analysis</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Let Gemini AI analyze your project — detect missing fields, generate insights, identify risks, and suggest improvements.
          </p>
          {error && (
            <p className="text-destructive text-xs mb-3">Failed to analyze. Please try again.</p>
          )}
          <Button onClick={handleAnalyze} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Analyze with AI
          </Button>
          <p className="text-[11px] text-muted-foreground mt-3">
            Powered by Gemini 2.5 Flash · Analysis only, no data is modified
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="font-medium">Analyzing project with Gemini AI…</p>
          <p className="text-muted-foreground text-sm mt-1">This usually takes 5–10 seconds</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const criticalMissing = analysis.missingFields.filter((f) => f.importance === 'critical');
  const recommendedMissing = analysis.missingFields.filter((f) => f.importance === 'recommended');
  const optionalMissing = analysis.missingFields.filter((f) => f.importance === 'optional');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Analysis Results</h3>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
            Gemini 2.5 Flash
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleAnalyze} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Re-analyze
        </Button>
      </div>

      {/* Missing fields */}
      {analysis.missingFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Missing Fields</p>
          <div className="flex flex-col gap-2">
            {analysis.missingFields.map((field) => {
              const style = IMPORTANCE_STYLES[field.importance];
              const Icon = style.icon;
              return (
                <div
                  key={field.field}
                  className={cn('flex items-start gap-3 rounded-lg border px-3 py-2.5', style.color)}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{field.label}</span>
                      <Badge variant="outline" className={cn('text-[10px] border-current', style.color)}>
                        {field.importance}
                      </Badge>
                    </div>
                    {field.suggestion && (
                      <p className="text-xs opacity-80 mt-0.5">{field.suggestion}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analysis.missingFields.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All key project fields are filled in. Great job!
        </div>
      )}

      {/* Analysis sections */}
      <div className="space-y-3">
        <Section icon={Sparkles} title="Executive Summary">
          <p className="leading-relaxed">{analysis.executiveSummary}</p>
        </Section>

        <Section icon={Target} title={`Campaign Goals (${analysis.campaignGoals.length})`}>
          <ul className="space-y-1.5">
            {analysis.campaignGoals.map((goal, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
                  {i + 1}
                </span>
                {goal}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Users} title="Target Audience">
          <p className="leading-relaxed">{analysis.targetAudience}</p>
        </Section>

        <Section icon={Package} title={`Deliverables (${analysis.deliverables.length})`} defaultOpen={false}>
          <ul className="space-y-1">
            {analysis.deliverables.map((d, i) => (
              <li key={i} className="flex gap-2 items-start">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                {d}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Lightbulb} title={`Recommendations (${analysis.recommendations.length})`} defaultOpen={false}>
          <ul className="space-y-1.5">
            {analysis.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 items-start">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={ShieldAlert} title={`Risk Factors (${analysis.riskFactors.length})`} defaultOpen={false}>
          <ul className="space-y-1.5">
            {analysis.riskFactors.map((r, i) => (
              <li key={i} className="flex gap-2 items-start text-amber-700">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
