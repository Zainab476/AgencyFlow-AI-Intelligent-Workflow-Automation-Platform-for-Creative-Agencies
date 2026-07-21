export function buildAnalysisPrompt(project: {
  campaignName: string;
  status: string;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  clientName: string | null;
  taskCount: number;
  memberCount: number;
}): string {
  return `You are a senior creative agency strategist analyzing a project for completeness and strategic quality.

Project Details:
- Campaign Name: ${project.campaignName}
- Client: ${project.clientName ?? "Not specified"}
- Status: ${project.status}
- Budget: ${project.budget != null ? `$${project.budget.toLocaleString()}` : "NOT SET"}
- Start Date: ${project.startDate ?? "NOT SET"}
- End Date: ${project.endDate ?? "NOT SET"}
- Team Members Assigned: ${project.memberCount}
- Tasks Created: ${project.taskCount}

Analyze this project and return a JSON object with exactly this structure:
{
  "missingFields": [
    {
      "field": "budget",
      "label": "Project Budget",
      "importance": "critical",
      "suggestion": "Define the total budget to enable resource planning and client invoicing"
    }
  ],
  "executiveSummary": "A 2-3 sentence professional summary of this campaign project and its current state",
  "campaignGoals": [
    "Specific, measurable goal 1",
    "Specific, measurable goal 2"
  ],
  "targetAudience": "Detailed description of the ideal target audience for this campaign based on the campaign name and context",
  "deliverables": [
    "Deliverable 1 appropriate for this type of campaign",
    "Deliverable 2"
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ],
  "riskFactors": [
    "Risk 1 with mitigation suggestion",
    "Risk 2 with mitigation suggestion"
  ]
}

Rules:
- Only flag fields as missing if they are actually missing from the project data above
- importance must be one of: critical, recommended, optional
- Generate 4-6 campaign goals that are SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Generate 4-8 relevant deliverables based on the campaign type
- Generate 3-5 actionable recommendations
- Generate 2-4 risk factors with mitigation
- Return ONLY valid JSON, no markdown, no explanation`;
}
