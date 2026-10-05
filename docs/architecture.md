# Architecture Documentation — AI Job Agent

## 1. System Overview

The **AI Job Agent** is a full-stack, autonomous job discovery, matching, resume tailoring, and application management system. It pairs a React Single Page Application (SPA) with a Node.js/Express REST API, MongoDB document store, dedicated asynchronous task queue worker, and local/isolated Large Language Model (Ollama).

---

## 2. Production Multi-Tier Architecture

```
                    Internet (HTTPS)
                           ↓
               Reverse Proxy (Nginx / CDN)
                           ↓
             ┌─────────────┴─────────────┐
             ↓                           ↓
      React Client (Vite)         Express API (:5000)
    (SPA UI & Dashboard)          (Controllers & Middleware)
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ↓                                               ↓
        MongoDB Database                              WorkerTask Queue (MongoDB)
   (Users, Jobs, CVs, Tasks)                                     │
                                                                 ↓
                                                    Dedicated Background Worker
                                                                 │
                                                                 ↓
                                                         Ollama LLM Engine
                                                    (:11434, Internal Network)
```

---

## 3. Core Modules & Subsystems

### 3.1 Authentication & Profile
- **JWT Authentication**: Encrypted tokens with bcrypt password hashing and token expiry.
- **Role & Profile Store**: Candidates manage technical skills, experiences, projects, education, and target job preferences.

### 3.2 CV Processing Pipeline
- **Upload Security**: 5MB size ceiling, MIME validation (PDF, DOCX), UUID disk isolation.
- **Parsing Engine**: `pdf-parse` and `mammoth` extract raw candidate text into structured sections with interactive correction UI.

### 3.3 Job Ingestion & Adapter System
- **Adapter Registry Pattern**: Extensible plugin interface for job boards (`MockAdapter`, `RemoteOkAdapter`, `ArbeitnowAdapter`).
- **Deduplication Engine**: MongoDB compound unique indexes on `{ source, externalId }` with upsert idempotency.
- **Full-Text Search**: Indexed search across job titles, descriptions, and required skills.

### 3.4 AI Matching & ATS Resume Tailoring
- **Structured LLM Inference**: Prompt-engineered evaluation validated by AJV schemas.
- **Deterministic Fallbacks**: Heuristic matching and templating algorithms guarantee zero downtime if the local LLM is offline or overloaded.
- **Multi-Format ATS Exporters**: Produces professional PDF (`pdfkit`) and DOCX (`docx`) documents tailored specifically to match job requirements.

### 3.5 Autonomous Agent System
- **Agent Orchestrator**: Multi-step planner (`planner.js`) with bounded step limits (`guardrails.js`).
- **Tool Registry**: 8 sandboxed tools (`getCandidateProfile`, `getResume`, `searchJobs`, `getJob`, `matchCandidateJob`, `tailorResume`, `prepareApplication`, `fillApplication`).
- **Strict User Control**: The agent automates preparation and form autofill, but external submission requires explicit user approval.

### 3.6 Background Worker Subsystem
- **Asynchronous Task Queue**: Polling worker loop decoupled from the Express request-response cycle.
- **Job Discovery & Sync**: Background polling and bulk ingestion without blocking user HTTP requests.

### 3.7 Integrations & Connectors
- **Integration Registry**: Abstract integration layer allowing external connector services (e.g., Composio) to be plugged in without tight coupling.

---

## 4. Security Hardening

- **API Layer**: `helmet` security headers, strict IP rate limiting on sensitive routes (auth, AI, agent).
- **Data Protection**: `express-mongo-sanitize` against NoSQL injection.
- **Network Boundaries**: `isSafeUrl()` SSRF defense restricting adapter fetches from accessing internal networks or private IPs.
- **Container Isolation**: Multi-stage Docker containers running under non-root users (`appuser`).
