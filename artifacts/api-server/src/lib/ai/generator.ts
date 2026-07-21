import { ai, FLASH_MODEL } from "./client";
import {
  buildProposalPrompt,
  buildContractPrompt,
  buildPresentationPrompt,
  buildInvoicePrompt,
} from "./prompts/documents";

export type DocumentType = "proposal" | "contract" | "presentation" | "invoice";

export interface ProjectContext {
  campaignName: string;
  clientName: string;
  status: string;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  agencyName: string;
}

function getDocumentTitle(type: DocumentType, campaignName: string): string {
  const today = new Date().toISOString().split("T")[0];
  switch (type) {
    case "proposal":
      return `Campaign Proposal — ${campaignName}`;
    case "contract":
      return `Service Agreement — ${campaignName}`;
    case "presentation":
      return `Campaign Presentation — ${campaignName}`;
    case "invoice":
      return `Invoice — ${campaignName} — ${today}`;
  }
}

function buildPrompt(type: DocumentType, ctx: ProjectContext): string {
  switch (type) {
    case "proposal":
      return buildProposalPrompt(ctx);
    case "contract":
      return buildContractPrompt(ctx);
    case "presentation":
      return buildPresentationPrompt(ctx);
    case "invoice":
      return buildInvoicePrompt(ctx);
  }
}

export async function generateDocumentContent(
  type: DocumentType,
  ctx: ProjectContext
): Promise<{ title: string; content: Record<string, unknown> }> {
  const prompt = buildPrompt(type, ctx);

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  const text = response.text ?? "{}";
  const content = JSON.parse(text) as Record<string, unknown>;
  const title = getDocumentTitle(type, ctx.campaignName);

  return { title, content };
}
