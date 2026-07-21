interface ProjectContext {
  campaignName: string;
  clientName: string;
  status: string;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  agencyName: string;
}

export function buildProposalPrompt(ctx: ProjectContext): string {
  return `You are a senior creative agency strategist writing a professional campaign proposal. Generate a complete, compelling proposal as JSON.

Project Context:
- Campaign: ${ctx.campaignName}
- Client: ${ctx.clientName}
- Budget: ${ctx.budget != null ? `$${ctx.budget.toLocaleString()}` : "TBD"}
- Start Date: ${ctx.startDate ?? "TBD"}
- End Date: ${ctx.endDate ?? "TBD"}
- Agency: ${ctx.agencyName}

Return ONLY this JSON structure (no markdown, no extra text):
{
  "clientName": "${ctx.clientName}",
  "projectName": "${ctx.campaignName}",
  "preparedBy": "${ctx.agencyName}",
  "date": "2025-01-01",
  "executiveSummary": "Compelling 3-4 sentence executive summary positioning the agency and campaign vision",
  "campaignGoals": ["Goal 1", "Goal 2", "Goal 3", "Goal 4"],
  "targetAudience": {
    "primary": "Detailed primary audience description",
    "secondary": "Secondary audience description",
    "demographics": "Age, location, income, interests",
    "psychographics": "Values, behaviors, motivations"
  },
  "scope": ["Scope item 1", "Scope item 2", "Scope item 3", "Scope item 4", "Scope item 5"],
  "deliverables": [
    { "item": "Deliverable name", "description": "What it includes", "timeline": "Week 1-2" }
  ],
  "timeline": [
    { "phase": "Phase name", "duration": "2 weeks", "activities": ["Activity 1", "Activity 2"] }
  ],
  "budget": {
    "total": ${ctx.budget ?? 0},
    "breakdown": [
      { "category": "Category name", "amount": 0, "description": "What this covers" }
    ]
  },
  "whyUs": ["Differentiator 1", "Differentiator 2", "Differentiator 3"],
  "terms": "Standard proposal validity is 30 days from the date of issue. Acceptance requires a signed contract and 50% deposit."
}`;
}

export function buildContractPrompt(ctx: ProjectContext): string {
  return `You are a creative agency legal expert drafting a professional service agreement. Generate a complete contract as JSON.

Project Context:
- Campaign: ${ctx.campaignName}
- Client: ${ctx.clientName}
- Budget: ${ctx.budget != null ? `$${ctx.budget.toLocaleString()}` : "TBD"}
- Start Date: ${ctx.startDate ?? "TBD"}
- End Date: ${ctx.endDate ?? "TBD"}
- Agency: ${ctx.agencyName}

Return ONLY this JSON structure:
{
  "agencyName": "${ctx.agencyName}",
  "clientName": "${ctx.clientName}",
  "projectName": "${ctx.campaignName}",
  "effectiveDate": "${ctx.startDate ?? "TBD"}",
  "projectDescription": "Clear professional description of the campaign project and its objectives",
  "scope": ["Included scope item 1", "Included scope item 2"],
  "outOfScope": ["Excluded item 1", "Excluded item 2"],
  "deliverables": [
    { "item": "Deliverable", "description": "Detailed description", "dueDate": "Date or milestone" }
  ],
  "timeline": {
    "startDate": "${ctx.startDate ?? "TBD"}",
    "endDate": "${ctx.endDate ?? "TBD"}",
    "milestones": [
      { "name": "Milestone name", "date": "Date", "deliverable": "What is due" }
    ]
  },
  "payment": {
    "total": ${ctx.budget ?? 0},
    "currency": "USD",
    "schedule": [
      { "milestone": "Project kickoff", "percentage": 50, "amount": ${ctx.budget ? ctx.budget * 0.5 : 0}, "dueDate": "Upon contract signing" },
      { "milestone": "Project completion", "percentage": 50, "amount": ${ctx.budget ? ctx.budget * 0.5 : 0}, "dueDate": "Upon final delivery" }
    ],
    "lateFee": "1.5% per month on outstanding balances after 30 days"
  },
  "revisions": "Client is entitled to 3 rounds of revisions per deliverable. Additional revisions billed at $150/hour.",
  "intellectualProperty": "Upon receipt of final payment, all deliverables and associated intellectual property rights transfer to the Client.",
  "confidentiality": "Both parties agree to maintain the confidentiality of proprietary information shared during this engagement.",
  "termination": "Either party may terminate this agreement with 14 days written notice. Client is responsible for payment for all work completed prior to termination.",
  "disputeResolution": "Any disputes shall first be addressed through good-faith negotiation, then mediation, and if unresolved, binding arbitration.",
  "governingLaw": "This agreement shall be governed by applicable local laws.",
  "limitationOfLiability": "Agency liability is limited to the total fees paid under this agreement."
}`;
}

export function buildPresentationPrompt(ctx: ProjectContext): string {
  return `You are a creative agency strategist creating a compelling client presentation. Generate a slide deck as JSON.

Project Context:
- Campaign: ${ctx.campaignName}
- Client: ${ctx.clientName}
- Budget: ${ctx.budget != null ? `$${ctx.budget.toLocaleString()}` : "TBD"}
- Start Date: ${ctx.startDate ?? "TBD"}
- End Date: ${ctx.endDate ?? "TBD"}
- Agency: ${ctx.agencyName}

Return ONLY this JSON structure:
{
  "title": "${ctx.campaignName}",
  "subtitle": "Campaign Proposal & Strategy",
  "client": "${ctx.clientName}",
  "agency": "${ctx.agencyName}",
  "date": "${ctx.startDate ?? new Date().toISOString().split('T')[0]}",
  "slides": [
    {
      "type": "title",
      "title": "${ctx.campaignName}",
      "subtitle": "A Strategic Campaign by ${ctx.agencyName}",
      "presenter": "${ctx.agencyName} Team"
    },
    {
      "type": "agenda",
      "title": "Today's Agenda",
      "points": ["Campaign Overview", "Strategic Goals", "Target Audience", "Creative Approach", "Timeline & Deliverables", "Investment", "Next Steps"]
    },
    {
      "type": "overview",
      "title": "Campaign Overview",
      "body": "Compelling paragraph describing the campaign vision and strategic direction",
      "points": ["Key insight 1", "Key insight 2", "Key insight 3"]
    },
    {
      "type": "goals",
      "title": "Strategic Goals",
      "points": ["SMART goal 1", "SMART goal 2", "SMART goal 3", "SMART goal 4"]
    },
    {
      "type": "audience",
      "title": "Target Audience",
      "primary": "Primary audience description",
      "secondary": "Secondary audience description",
      "insights": ["Audience insight 1", "Audience insight 2", "Audience insight 3"]
    },
    {
      "type": "approach",
      "title": "Creative Approach",
      "body": "Description of the creative strategy and methodology",
      "pillars": ["Creative pillar 1", "Creative pillar 2", "Creative pillar 3"]
    },
    {
      "type": "deliverables",
      "title": "Deliverables",
      "items": [
        { "name": "Deliverable 1", "description": "What it includes" },
        { "name": "Deliverable 2", "description": "What it includes" }
      ]
    },
    {
      "type": "timeline",
      "title": "Project Timeline",
      "phases": [
        { "name": "Phase 1: Discovery", "duration": "Week 1-2", "tasks": ["Task 1", "Task 2"] },
        { "name": "Phase 2: Strategy", "duration": "Week 3-4", "tasks": ["Task 1", "Task 2"] },
        { "name": "Phase 3: Execution", "duration": "Week 5-8", "tasks": ["Task 1", "Task 2"] }
      ]
    },
    {
      "type": "investment",
      "title": "Investment",
      "total": ${ctx.budget ?? 0},
      "currency": "USD",
      "breakdown": [
        { "item": "Strategy & Planning", "amount": ${ctx.budget ? Math.round(ctx.budget * 0.2) : 0} },
        { "item": "Creative Development", "amount": ${ctx.budget ? Math.round(ctx.budget * 0.4) : 0} },
        { "item": "Production & Execution", "amount": ${ctx.budget ? Math.round(ctx.budget * 0.3) : 0} },
        { "item": "Management & Reporting", "amount": ${ctx.budget ? Math.round(ctx.budget * 0.1) : 0} }
      ],
      "note": "Investment includes all phases. Payment split 50% upfront, 50% on completion."
    },
    {
      "type": "cta",
      "title": "Let's Get Started",
      "body": "We are excited to bring this campaign to life for ${ctx.clientName}. The next step is reviewing this proposal and scheduling a kickoff meeting.",
      "nextSteps": ["Review and approve proposal", "Sign service agreement", "Schedule kickoff meeting", "Campaign begins"]
    }
  ]
}`;
}

export function buildInvoicePrompt(ctx: ProjectContext): string {
  const invoiceNum = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return `You are a creative agency accountant generating a professional invoice. Generate an invoice as JSON.

Project Context:
- Campaign: ${ctx.campaignName}
- Client: ${ctx.clientName}
- Total Budget: ${ctx.budget != null ? `$${ctx.budget.toLocaleString()}` : "TBD"}
- Start Date: ${ctx.startDate ?? "TBD"}
- End Date: ${ctx.endDate ?? "TBD"}
- Agency: ${ctx.agencyName}

Return ONLY this JSON structure:
{
  "invoiceNumber": "${invoiceNum}",
  "issueDate": "${today}",
  "dueDate": "${dueDate}",
  "status": "unpaid",
  "agencyName": "${ctx.agencyName}",
  "agencyAddress": "123 Creative Studio, Suite 100\\nNew York, NY 10001",
  "agencyEmail": "billing@${ctx.agencyName.toLowerCase().replace(/\s/g, '')}.com",
  "clientName": "${ctx.clientName}",
  "clientAddress": "Client Company Address\\nCity, State ZIP",
  "projectName": "${ctx.campaignName}",
  "items": [
    { "description": "Strategy & Campaign Planning", "quantity": 1, "rate": ${ctx.budget ? Math.round(ctx.budget * 0.2) : 0}, "amount": ${ctx.budget ? Math.round(ctx.budget * 0.2) : 0} },
    { "description": "Creative Development & Design", "quantity": 1, "rate": ${ctx.budget ? Math.round(ctx.budget * 0.4) : 0}, "amount": ${ctx.budget ? Math.round(ctx.budget * 0.4) : 0} },
    { "description": "Production & Campaign Execution", "quantity": 1, "rate": ${ctx.budget ? Math.round(ctx.budget * 0.3) : 0}, "amount": ${ctx.budget ? Math.round(ctx.budget * 0.3) : 0} },
    { "description": "Project Management & Reporting", "quantity": 1, "rate": ${ctx.budget ? Math.round(ctx.budget * 0.1) : 0}, "amount": ${ctx.budget ? Math.round(ctx.budget * 0.1) : 0} }
  ],
  "subtotal": ${ctx.budget ?? 0},
  "taxRate": 0,
  "tax": 0,
  "total": ${ctx.budget ?? 0},
  "currency": "USD",
  "notes": "Thank you for your business. Payment is due within 30 days of invoice date.",
  "paymentTerms": "Net 30",
  "paymentInstructions": "Please make payment via bank transfer or check payable to ${ctx.agencyName}."
}`;
}
