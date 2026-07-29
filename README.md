# AgencyFlow AI: An Intelligent Workflow Automation Platform for Creative Agencies

[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20Node.js%20%7C%20PostgreSQL-blue)](#tech-stack)
[![AI Powered](https://img.shields.io/badge/AI-Google%20Gemini-orange)](#key-features)
[![Automation](https://img.shields.io/badge/Automation-n8n-red)](#key-features)

AgencyFlow AI is a web-based workflow automation platform designed to solve administrative overhead for marketing and creative agencies. By acting as a centralized source of truth, it utilizes AI and workflow orchestration to transform raw project data into business-ready proposals, contracts, client presentations, and task timelines automatically.

---

## 📌 Problem Statement

Creative advertising and marketing agencies heavily rely on spreadsheets (like Google Sheets) to manage project parameters, campaign timelines, budgets, and deliverables. 

However, translating spreadsheet data into professional client-facing assets (proposals, contracts, slides, and invoices) remains a manual, error-prone, and repetitive process[cite: 1, 2]. Small to medium-sized agencies waste hundreds of billable hours on administrative documentation rather than creative execution[cite: 1, 2].

## 💡 Solution & Core Value

**AgencyFlow AI** centralizes agency client and project data into a single operational hub[cite: 1, 2]. By pairing structured project data with **Google Gemini AI** and **n8n automation**, the platform[cite: 1, 2]:
* Detects missing or inconsistent project details automatically[cite: 1, 2].
* Generates tailored proposals, executive summaries, and contracts[cite: 1, 2].
* Syncs smoothly with existing Google Sheets spreadsheets[cite: 1, 2].
* Reduces manual document preparation time and streamlines operations.

---

## ✨ Key Features

### 🏢 1. Agency & Project Management
* **Client & Project Hub**: Full CRUD operations for clients, active campaigns, budgets, and timelines[cite: 1, 2].
* **Team & Role-Based Access (RBAC)**: Manage Project Managers, Designers, Copywriters, and Marketing Specialists with JWT authentication and secure roles[cite: 1, 2].
* **Task & Calendar Views**: Organize deliverables using interactive Kanban boards, interactive calendars, and timeline views[cite: 1].

### 🤖 2. Intelligent AI Assistant (Gemini API)
* **Completeness Auditing**: Scans projects to detect missing budgets, end dates, or target audience details[cite: 1, 2].
* **Content Generation**: Generates executive summaries, campaign objectives, risk assessments, and strategic recommendations[cite: 1, 2].
* **AI Chat Assistant**: Embedded side-panel enabling agency teams to query project parameters and request instant document drafts[cite: 1].

### 📄 3. Automated Document Generator
* Automatically populates project parameters into customizable templates[cite: 1, 2].
* Export business assets to multiple formats: **PDF**, **DOCX**, and **PPTX**[cite: 1, 2].
* Instant document previews and PostgreSQL metadata tracking[cite: 1].

### 🔄 4. Google Sheets & n8n Workflow Automation
* **Google Sheets Sync**: Two-way data synchronization to import rows, update campaign metrics, and prevent duplicate records[cite: 1].
* **n8n Webhook Orchestration**: Automated end-to-end pipelines triggered upon project creation (Project Created ➔ AI Analysis ➔ Proposal Generation ➔ Contract Drafting ➔ Email Notification)[cite: 1, 2].

---

## 🛠️ Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Programming Languages** | TypeScript, JavaScript, SQL |
| **Frontend Framework** | React, TypeScript, Tailwind CSS, shadcn/ui[cite: 1, 2] |
| **Backend & API** | Node.js, Express.js, RESTful Architecture[cite: 1, 2] |
| **Database** | PostgreSQL[cite: 1, 2] |
| **AI Integration** | Google Gemini API[cite: 1, 2] |
| **Workflow Automation** | n8n, Webhook Endpoints[cite: 1, 2] |
| **Integrations** | Google Sheets API[cite: 1, 2] |
| **Document Export** | PDF, DOCX, PPTX generation libraries[cite: 1, 2] |
| **Auth & Security** | JWT Authentication, Role-Based Access Control (RBAC)[cite: 1, 2] |
| **Dev Environment** | Replit, Git, GitHub |

---

## 🏗️ Project Architecture & Roadmap

```text
                  ┌──────────────────────────────┐
                  │    React + Tailwind UI       │
                  └──────────────┬───────────────┘
                                 │ REST API
                                 ▼
                  ┌──────────────────────────────┐
                  │    Node.js / Express Server  │
                  └──────┬───────┬───────┬───────┘
                         │       │       │
       ┌─────────────────┘       │       └─────────────────┐
       ▼                         ▼                         ▼
┌──────────────┐        ┌────────────────┐        ┌────────────────┐
│  PostgreSQL  │        │ Google Gemini  │        │  n8n Webhook   │
│   Database   │        │   AI Service   │        │ Engine / Sync  │
└──────────────┘        └────────────────┘        └────────────────┘
```

### Development Phases (MVP Roadmap)
- [x] **Phase 1: Project Foundation** — JWT Auth, PostgreSQL integration, Core CRUD for Clients & Projects[cite: 1].
- [x] **Phase 2: Agency Management** — Kanban boards, Team assignments, Task tracking, and Activity logs[cite: 1].
- [x] **Phase 3: AI Assistant** — Gemini API service integration, data audit engines, and AI chat panel[cite: 1].
- [x] **Phase 4: Document Engine** — PDF/DOCX/PPTX export pipelines and file management[cite: 1].
- [x] **Phase 5: Google Sheets Sync** — Automated sheet importing, duplicate handling, and dashboard sync[cite: 1].
- [x] **Phase 6: n8n Workflow Automation** — Secure webhook pipelines and background automation logging[cite: 1].
- [x] **Phase 7: Analytics Dashboard** — Visual metric charts for project velocity, completion rates, and budgets[cite: 1].
- [ ] **Phase 8: Production Polish & Multi-Agent Expansion** *(Planned Future Work)*[cite: 1, 2]


### Development Phases (MVP Roadmap)
- [x] **Phase 1: Project Foundation** — JWT Auth, PostgreSQL integration, Core CRUD for Clients & Projects[cite: 1].
- [x] **Phase 2: Agency Management** — Kanban boards, Team assignments, Task tracking, and Activity logs[cite: 1].
- [x] **Phase 3: AI Assistant** — Gemini API service integration, data audit engines, and AI chat panel[cite: 1].
- [x] **Phase 4: Document Engine** — PDF/DOCX/PPTX export pipelines and file management[cite: 1].
- [x] **Phase 5: Google Sheets Sync** — Automated sheet importing, duplicate handling, and dashboard sync[cite: 1].
- [x] **Phase 6: n8n Workflow Automation** — Secure webhook pipelines and background automation logging[cite: 1].
- [x] **Phase 7: Analytics Dashboard** — Visual metric charts for project velocity, completion rates, and budgets[cite: 1].
- [ ] **Phase 8: Production Polish & Multi-Agent Expansion** *(Planned Future Work)*[cite: 1, 2]

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* PostgreSQL database instance
* Google Gemini API Key

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/Zainab476/AgencyFlow-AI-Intelligent-Workflow-Automation-Platform-for-Creative-Agencies.git](https://github.com/Zainab476/AgencyFlow-AI-Intelligent-Workflow-Automation-Platform-for-Creative-Agencies.git)
   cd AgencyFlow-AI-Intelligent-Workflow-Automation-Platform-for-Creative-Agencies
