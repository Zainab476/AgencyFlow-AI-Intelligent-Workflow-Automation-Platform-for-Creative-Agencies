import { ai, FLASH_MODEL } from "./client";
import { buildAnalysisPrompt } from "./prompts/analysis";

export interface MissingField {
  field: string;
  label: string;
  importance: "critical" | "recommended" | "optional";
  suggestion?: string;
}

export interface ProjectAnalysisResult {
  missingFields: MissingField[];
  executiveSummary: string;
  campaignGoals: string[];
  targetAudience: string;
  deliverables: string[];
  recommendations: string[];
  riskFactors: string[];
}

export async function analyzeProject(project: {
  campaignName: string;
  status: string;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  clientName: string | null;
  taskCount: number;
  memberCount: number;
}): Promise<ProjectAnalysisResult> {
  const prompt = buildAnalysisPrompt(project);

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  const text = response.text ?? "{}";
  const parsed = JSON.parse(text) as ProjectAnalysisResult;

  return {
    missingFields: parsed.missingFields ?? [],
    executiveSummary: parsed.executiveSummary ?? "",
    campaignGoals: parsed.campaignGoals ?? [],
    targetAudience: parsed.targetAudience ?? "",
    deliverables: parsed.deliverables ?? [],
    recommendations: parsed.recommendations ?? [],
    riskFactors: parsed.riskFactors ?? [],
  };
}
