# 🤖 AI Job Agent

> **An autonomous, enterprise-grade job search, candidate matching, ATS resume tailoring, and application tracking platform powered by hybrid AI and strict anti-fabrication controls.**

[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-blue.svg)](https://react.dev/)
[![Node Express](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%205-darkgreen.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%209%20%7C%20Mongoose-green.svg)](https://www.mongodb.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-220%2F220%20Passing-brightgreen.svg)](file:///server/tests)
[![Theme System](https://img.shields.io/badge/UI%20Themes-Light%20%7C%20Dark%20%7C%20Purple-purple.svg)](#-theme-system)

---

## 📌 Table of Contents
1. [Project Purpose & Overview](#-project-purpose--overview)
2. [End-to-End User Experience](#-end-to-end-user-experience)
3. [System Architecture](#-system-architecture)
4. [Live Job Source Adapters](#-live-job-source-adapters)
5. [CV Parsing & Document Processing](#-cv-parsing--document-processing)
6. [Hybrid AI Matching Engine](#-hybrid-ai-matching-engine)
7. [Truthful ATS Resume Tailoring](#-truthful-ats-resume-tailoring)
8. [Autonomous AI Agent & Tool Guardrails](#-autonomous-ai-agent--tool-guardrails)
9. [9-Stage Application Tracking Workflow](#-9-stage-application-tracking-workflow)
10. [Theme System (Light, Dark, Purple)](#-theme-system)
11. [Security Decisions & Hardening](#-security-decisions--hardening)
12. [Testing & Verification](#-testing--verification)
13. [Local Setup & Getting Started](#-local-setup--getting-started)
14. [Limitations & Future Roadmap](#-limitations--future-roadmap)

---

## 🚀 Project Purpose & Overview

The **AI Job Agent** solves the labor-intensive, repetitive aspects of modern job searching by pairing real-time job aggregation with deterministic candidate matching and autonomous AI assistance.

Crucially, this system operates under a strict **Anti-Fabrication and User-in-the-Loop** philosophy:
- **No Hallucinated Claims**: Resumes and match results are strictly grounded in candidate source documents. The AI is prevented from inventing unearned skills, non-existent employers, or fabricated credentials.
- **Data, Not Instructions**: External job descriptions are treated strictly as untrusted data payloads, neutralizing prompt injection attempts.
- **Explicit User Confirmation**: Autonomous agents can find, match, and prepare application drafts, but **external application submission always requires human sign-off**.
- **Zero-Downtime Deterministic Fallbacks**: Every AI matching and tailoring subsystem maintains an algorithmic fallback so the platform functions seamlessly even if local or remote LLM services are temporarily offline.

---

## 🌟 End-to-End User Experience

A user can effortlessly navigate through the full job lifecycle:

1. **Create an Account**: Register securely via JWT-authenticated session with bcrypt hashing.
2. **Upload & Parse CV**: Upload PDF, DOCX, TXT, or RTF documents. The parsing engine extracts structured candidate profiles (skills, experience, education, links) with an interactive review and verification form.
3. **Live Job Aggregation**: Query verified opportunities across multiple adapters (`Jobicy`, `RemoteOK`, `Arbeitnow`) categorized across 25 career taxonomies (engineering, design, product, finance, healthcare, legal, etc.).
4. **Advanced Discovery**: Filter by keyword, category, subcategory, seniority level, work mode (`remote`, `hybrid`, `onsite`), country, and salary bounds.
5. **Hybrid AI Match Analysis**: Inspect multi-dimensional compatibility scores (skills, experience, work mode, salary, job type) with clear strength highlights and detected gap lists.
6. **Generate Tailored ATS Resumes**: Produce verified ATS-compliant single-column resumes with reverse-chronological ordering, downloadable directly as **PDF** and **Word DOCX**.
7. **Autonomous Agent Assistance**: Instruct the AI agent using natural language goals (e.g., *"Find remote React internships and tailor my resume for the top match"*). The agent executes multi-step plans using 19 sandboxed tools.
8. **Controlled 9-Stage Application Tracker**: Track application progress through defined states: `discovered` → `saved` → `preparing` → `ready_for_review` → `applied` → `interview` → `offer` / `rejected` → `withdrawn`.
9. **Persistent Theme Selection**: Toggle between **Light**, **Dark**, and **Purple** themes with zero layout breakage across desktop and mobile browsers.

---

## 🏛️ System Architecture

```
                    Internet / Browser (Desktop & Mobile)
                                  ↓
                       Vite + React 19 Frontend
                 (SPA Routing, ThemeProvider, Axios)
                                  ↓
                     Express 5 REST API (:5000)
            (Helmet, MongoSanitize, RateLimiters, AuthGuards)
                                  │
         ┌────────────────────────┼────────────────────────┐
         ↓                        ↓                        ↓
  MongoDB Atlas          AI Service Layer          Adapter Pipeline
 (Users, Jobs, CVs,     (Gemini, Ollama, Mock,     (RemoteOK, Arbeitnow,
  Applications, Tasks)   Ajv Schema Validation)     Jobicy, Deduplicator)
                                  │
                                  ↓
                        Autonomous AI Agent
                     (Planner, Guardrails, Tools)
```

---

## 📡 Live Job Source Adapters

The ingestion subsystem implements an extensible **Adapter Registry Pattern** (`server/adapters/`):
- **Active Real Adapters**:
  - `RemoteOkAdapter`: Remote technology listings.
  - `ArbeitnowAdapter`: European and global developer positions.
  - `JobicyAdapter`: Broad remote opportunities across tech and non-tech disciplines.
  - `MockAdapter`: Safe, isolated testing adapter available only when `ENABLE_MOCK_JOBS=true`.
- **Deduplication Engine (`jobDeduplicator.js`)**: Prevents duplicate listings by indexing compound `{ source, externalId }` tuples.
- **Category Normalizer (`categoryNormalizer.js`)**: Maps titles and tags to 25 canonical categories covering engineering, product, sales, marketing, finance, HR, legal, customer support, healthcare, and education.

---

## 📄 CV Parsing & Document Processing

The parsing engine (`server/services/cvParser.js`) ingests four standard formats:
- **PDF**: Uses `pdf-parse@2` with scanned document detection (flags images with low text density).
- **DOCX**: Extracts structured paragraphs using `mammoth`.
- **TXT / RTF**: Parses plaintext and RTF format streams.
- **Section Extraction**: Automatically identifies personal info, summary, contact links (LinkedIn, GitHub, Portfolio), skills, education, work experience, projects, and certifications.
- **Human Verification**: Presents extracted data in an interactive review modal before persisting to the candidate's canonical database profile.

---

## 🎯 Hybrid AI Matching Engine

Compatibility analysis (`server/services/matchingService.js`) uses a two-tier hybrid model:

1. **Deterministic Structured Scoring (Baseline)**:
   - **Skills Compatibility (40%)**: Ratio of matched skills vs. total required job skills.
   - **Experience Tier (25%)**: Aligns seniority (`entry-level` through `executive`).
   - **Work Mode (10%)**: Remote, hybrid, or onsite alignment.
   - **Job Type (10%)**: Full-time, contract, part-time, internship.
   - **Salary Range (10%)**: Target minimum vs. advertised compensation.
   - **Extras (5%)**: Certifications and verified projects.

2. **AI Semantic Enrichment Layer**:
   - Optional bounded adjustment (±15 points) providing qualitative depth insights, candidate strengths, and explanation summaries.
   - **Anti-Fabrication**: Output validated against profile data; AI cannot award credit for skills not present in the candidate profile.

---

## 📝 Truthful ATS Resume Tailoring

The tailoring subsystem (`server/services/tailoringService.js`) produces professional resumes:
- **Strict Source Grounding**: Only highlights genuine experiences and verified candidate competencies.
- **Reverse Chronological Enforcement**: Re-orders all experience and education entries newest-to-oldest regardless of AI generation quirks.
- **Resume Validator (`resumeValidator.js`)**: Audits generated resumes for unverified claims, flagging any discrepancies for candidate review.
- **Dual Exporter Formats**:
  - **PDF Exporter (`templates/pdfTemplate.js`)**: Clean single-column layout using `pdfkit`.
  - **DOCX Exporter (`templates/docxTemplate.js`)**: Clean XML document using `docx`.

---

## 🤖 Autonomous AI Agent & Tool Guardrails

The autonomous agent (`server/agent/agent.js`) allows candidates to instruct the system via natural language goals:
- **Planner (`agent/planner.js`)**: Deconstructs goals into verified sequential tool executions.
- **19 Sandboxed Tools (`agent/tools/`)**: Includes tools for searching jobs, fetching profiles, calculating match scores, tailoring resumes, and tracking applications.
- **Security Guardrails (`agent/guardrails.js`)**:
  - **Max Step Limiter**: Caps agent loops at 12 steps to prevent infinite runaways.
  - **Prompt Injection Filter**: Blocks jailbreak patterns (`"ignore previous instructions"`, `"DAN"`, `"reveal system prompt"`).
  - **Parameter Validation**: Prevents prototype pollution and malicious payload injections.
  - **No Automated Final Submission**: External submissions require explicit human user approval.

---

## 📋 9-Stage Application Tracking Workflow

The application workflow (`server/models/Application.js` & `client/src/pages/Applications.jsx`) implements a state machine:

```
[Discovered] ──> [Saved] ──> [Preparing] ──> [Ready for Review]
                                                     │
                                                     ↓
  [Withdrawn] <── [Offer] <── [Interview] <── [Applied]
        ↑            │              │
        └────────────┴──────────────┴───────> [Rejected]
```

- **Safety Rule**: Applications transitioning to `applied` require manual user confirmation.
- **Audit Logs**: Every state change records timestamps, previous status, new status, and optional user notes.

---

## 🎨 Theme System

Built with unified CSS design tokens (`client/src/index.css`) and persistent context state (`client/src/context/ThemeContext.jsx`):
- **☀️ Light Theme**: Crisp background (`#f8fafc`), clean white cards, royal blue accents.
- **🌙 Dark Theme**: Deep midnight canvas (`#0f172a`), slate cards (`#1e293b`), electric blue accents.
- **💜 Purple Theme**: Plum background (`#180d2b`), rich violet card surfaces (`#261642`), vibrant purple accents.
- **Persistence**: Remembers candidate selection in `localStorage` across logins and reloads.

---

## 🛡️ Security Decisions & Hardening

1. **Path Traversal Protection (`utils/security.js`)**: `sanitizeFilePath` strictly constrains file operations within the canonical upload folder, blocking `..`, root jumps, and null bytes (`\0`).
2. **Untrusted Data Sanitization**: `sanitizeExternalData` strips script tags and flags prompt override phrases within third-party job descriptions.
3. **SSRF Defense**: `isSafeUrl` restricts outgoing requests from adapters, blocking private IP ranges (`10.x.x.x`, `192.168.x.x`, `127.0.0.1`, `localhost`, `.local`).
4. **NoSQL Injection Defense**: `express-mongo-sanitize` strips reserved MongoDB operator symbols from payloads.
5. **Auditing & Privacy**: `logger.js` automatically redacts passwords, tokens, API keys, and raw CV document text from log files.
6. **Multi-Tier Rate Limiting**: Protects general API routes (200 req/15m) and applies strict throttles to auth and AI endpoints (30 req/15m).

---

## 🧪 Testing & Verification

The platform maintains an automated test suite using **Jest** and **Supertest**:

```bash
cd server
npm test
```

**Status**:
```
Test Suites: 18 passed, 1 skipped, 18 of 19 total
Tests:       220 passed, 11 skipped, 231 total
Snapshots:   0 total
```

Unit test suites cover:
- Adapters, normalization, and deduplication (`adapterRegistry.test.js`, `jobNormalizer.test.js`, `jobDeduplicator.test.js`)
- CV text extraction and format detection (`cvParser.test.js`)
- Hybrid matching engine (`matchingService.test.js`)
- AI service, repair, and retry mechanisms (`aiService.test.js`)
- Resume tailoring, reverse-chronological order, and truthfulness (`resumeTailoring.test.js`)
- Agent planner, tools, and guardrails (`agentControlledTools.test.js`, `guardrails.test.js`)
- Application state machine transitions (`applicationWorkflow.test.js`)
- Security utilities and SSRF defenses (`security.test.js`)
- Theme system tokens and fallback resolution (`themeSystem.test.js`)

---

## ⚙️ Local Setup & Getting Started

### Prerequisites
- **Node.js** (v20 or higher)
- **MongoDB** (Local instance or MongoDB Atlas cluster)
- Optional: Local [Ollama](https://ollama.ai/) instance or Google Gemini API key (deterministic fallbacks operate automatically if neither is provided).

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd "Final Project"
   ```

2. **Install dependencies:**
   ```bash
   cd server && npm install
   cd ../client && npm install
   cd ..
   ```

3. **Configure Environment (`server/.env`):**
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/ai-job-agent
   JWT_SECRET=your_super_secret_jwt_key_here
   FRONTEND_URL=http://localhost:5173
   ENABLE_MOCK_JOBS=false
   ```

4. **Run Development Services:**
   - **Backend API**:
     ```bash
     cd server && npm run dev
     ```
   - **Frontend Client**:
     ```bash
     cd client && npm run dev
     ```

5. **Access Application**: Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚠️ Limitations & Future Roadmap

### Current Limitations
- **External Web Portals**: Because target job application portals (e.g., Workday, Greenhouse) require proprietary CAPTCHAs and SSO logins, browser form completion is assisted and prepared locally rather than submitted silently without candidate interaction.
- **OCR on Image-Only Scans**: Non-searchable scanned images (pure raster PDF/images) are flagged as scanned documents rather than OCR-processed locally to avoid heavy Tesseract native binaries.

### Future Roadmap
- Direct OAuth integrations with LinkedIn and Greenhouse Candidate APIs.
- Real-time WebSocket notifications for background agent tasks and job alert pushes.
- Fine-tuned local domain models for sector-specific resume formatting.

---

## 📄 License
Educational and portfolio demonstration project. Developed by Abdallah Melhem.
