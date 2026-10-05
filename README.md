# 🤖 AI Job Agent

> **An autonomous, full-stack AI system for intelligent job discovery, semantic candidate matching, dynamic ATS resume tailoring, and controlled application workflows.**

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-green.svg)](https://www.mongodb.com/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-blue.svg)](https://react.dev/)
[![Node Express](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%205-darkgreen.svg)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Container-Docker%20%7C%20Compose-2496ED.svg)](https://www.docker.com/)
[![Local LLM](https://img.shields.io/badge/AI-Ollama%20%7C%20Llama%203.2-orange.svg)](https://ollama.ai/)
[![Tests Passing](https://img.shields.io/badge/Tests-54%2F54%20Passing-brightgreen.svg)](file:///server/tests)

---

## 📌 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [System Architecture](#-system-architecture)
4. [Tech Stack](#-tech-stack)
5. [Autonomous AI Agent](#-autonomous-ai-agent)
6. [User Interface & Walkthrough](#-user-interface--walkthrough)
7. [Getting Started & Local Setup](#-getting-started--local-setup)
8. [Environment Variables](#-environment-variables)
9. [API Overview](#-api-overview)
10. [Security & Guardrails](#-security--guardrails)
11. [Testing Suite](#-testing-suite)
12. [Monitoring & Logging](#-monitoring--logging)
13. [Deployment Options](#-deployment-options)
14. [Repository Structure](#-repository-structure)

---

## 🚀 Project Overview

The **AI Job Agent** automates the labor-intensive stages of technical job hunting while keeping the candidate firmly in control:

1. **Aggregates & Ingests Opportunities**: Automatically imports and deduplicates jobs across multiple remote and engineering job feeds (RemoteOK, Arbeitnow, Mock feeds).
2. **Evaluates Candidate Fit**: Leverages private, locally-hosted LLMs (Ollama / Llama 3.2) to evaluate candidate skills, experience, and potential gaps without hallucinating qualifications.
3. **Generates Tailored ATS Resumes**: Rewrites and re-aligns resume bullet points to highlight relevant job requirements, exporting instant downloads in both **PDF** and **DOCX** formats.
4. **Executes Autonomous Agent Plans**: Given high-level goals like *"Find remote Node.js roles and tailor my resume for the top match"*, a multi-step autonomous agent formulates, executes, and audits an execution plan using sandboxed tools.
5. **Prepares Controlled Applications**: Fills application packages and verifies candidate data, enforcing a strict security rule where external application submissions **always require explicit user authorization**.

---

## 🌟 Key Features

- **Private & Local AI**: Utilizes locally hosted Ollama (`llama3.2`), protecting sensitive candidate CV data from third-party cloud LLM retention.
- **Deterministic Zero-Downtime Fallback**: All AI matching and resume generation features gracefully fall back to heuristic rule-based engines if the local LLM is offline or overloaded.
- **Multi-Source Job Ingestion**: Extensible adapter registry with compound unique indexing for idempotency and instant full-text search.
- **Multi-Format ATS Exporters**: Produces professional PDF (`pdfkit`) and DOCX (`docx`) documents tailored specifically to job descriptions.
- **Asynchronous Task Queue**: Background worker polling loop decouples compute-intensive parsing and sync workflows from Express HTTP requests.
- **Enterprise-Grade Security**: Rate limiting, NoSQL injection sanitization, SSRF protection on adapters, and strict prompt injection guardrails.

---

## 🏛️ System Architecture

```
                    Internet (HTTPS / Port 443)
                                 ↓
                     Reverse Proxy (Nginx / SSL)
                                 ↓
           ┌─────────────────────┴─────────────────────┐
           ↓                                           ↓
  React Frontend (Vite / SPA)                 Express REST API (:5000)
 (Bootstrap 5, Responsive UI)                (Controllers, Guardrails)
                                                       │
                 ┌─────────────────────────────────────┴──────────────────┐
                 ↓                                                        ↓
        MongoDB Database                                       WorkerTask Queue (MongoDB)
  (Users, Jobs, CVs, Tasks)                                               │
                                                                          ↓
                                                             Dedicated Background Worker
                                                                          │
                                                                          ↓
                                                                  Ollama LLM Engine
                                                              (:11434, Internal Network)
```

For complete architectural specifications, see [docs/architecture.md](docs/architecture.md).

---

## 💻 Tech Stack

### Frontend
- **React 19** with **Vite**: Ultra-fast build and reactive state management.
- **React Router 7**: Client-side SPA routing with protected auth guards.
- **Bootstrap 5**: Modern, responsive dashboard and candidate controls.
- **Axios**: HTTP client with automatic JWT token injection and centralized base URLs.

### Backend
- **Node.js & Express 5**: Modern async middleware and routing pipeline.
- **MongoDB & Mongoose**: Flexible document storage with unique compound indexes.
- **Ollama**: Local LLM runner with structured JSON schema enforcement (`ajv@8`).
- **PDFKit & DOCX**: Programmatic document generation for ATS-compatible resumes.
- **pdf-parse & mammoth**: Text extraction pipelines for uploaded CVs.
- **Winston & Morgan**: Centralized logging with automatic sensitive data redaction.

### DevOps & Containerization
- **Docker & Docker Compose**: Multi-stage production and development containerization.
- **Nginx**: Static asset serving with gzip compression, security headers, and caching.

---

## 🧠 Autonomous AI Agent

The system features an autonomous agent orchestrator (`server/agent/agent.js`) driven by four pillars:

1. **Input Sanitization**: Rejects prompt injection attempts (`"ignore previous instructions"`, `"DAN"`, `"reveal system prompt"`, etc.).
2. **Planner**: Transforms natural language goals into a structured sequence of discrete execution steps.
3. **Sandboxed Tool Registry**:
   - `getCandidateProfile`: Retrieves candidate skills and history.
   - `searchJobs`: Queries database for opportunities matching target criteria.
   - `matchCandidateJob`: Conducts AI-driven gap analysis.
   - `tailorResume`: Synthesizes job-aligned PDF/DOCX resumes.
   - `prepareApplication`: Packages candidate artifacts for target employers.
   - `fillApplication`: Pre-fills application forms with candidate metadata.
4. **Execution Safety**: Enforces maximum step limits (10 steps) to prevent recursive runaway execution loops and forbids automated final submission without human sign-off.

---

## 🖥️ User Interface & Walkthrough

The web application provides six dedicated modules:

- **🔐 Auth & Registration**: Secure registration, JWT token storage, and persistent login sessions.
- **👤 Candidate Profile**: Manage skills, target titles, work experiences, education, and remote preferences.
- **📄 CV Manager**: Drag-and-drop PDF/DOCX upload, automated parsing, and an interactive review & correction form.
- **💼 Job Search & Match**: Live search with source filters (`RemoteOK`, `Arbeitnow`, `Mock`), instant AI Match score analysis, and side-by-side gap explanations.
- **⚡ Resume Tailor**: One-click ATS resume generation with immediate download buttons for tailored PDF and Word DOCX documents.
- **🚀 Autonomous Dashboard**: Goal input box with pre-configured templates, live execution timeline, and step-by-step progress tracking.

---

## ⚙️ Getting Started & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or free MongoDB Atlas cluster)
- [Ollama](https://ollama.ai/) with `llama3.2` model (`ollama pull llama3.2`) *(optional — deterministic fallbacks active if offline)*

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd "Final Project"
   ```

2. **Install root, client, and server dependencies:**
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   cd ..
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your MongoDB URI and a random `JWT_SECRET`.

4. **Run Development Servers:**
   ```bash
   npm run dev
   ```
   - Client: `http://localhost:5173` (or `5174`)
   - Backend API: `http://localhost:5000`
   - Health check: `http://localhost:5000/api/health`

---

## 🔑 Environment Variables

The project requires the following environment variables (configured in `.env` at root):

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | API server listener port | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | 256-bit token signing key | `openssl rand -hex 64` |
| `FRONTEND_URL` | Allowed CORS origins | `http://localhost:5173,http://localhost:5174` |
| `OLLAMA_BASE_URL` | Ollama service endpoint | `http://localhost:11434` |
| `OLLAMA_MODEL` | Target language model | `llama3.2` |
| `OLLAMA_TIMEOUT` | Network timeout for AI calls | `10000` (10 seconds) |

See [.env.example](.env.example) for a ready-to-copy template.

---

## 📡 API Overview

A complete list of endpoints is documented in [docs/api.md](docs/api.md):

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint | Public |
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT | Public |
| `GET` | `/api/profile` | Retrieve candidate profile | Private |
| `POST` | `/api/profile` | Create or update candidate profile | Private |
| `POST` | `/api/cv/upload` | Upload PDF/DOCX CV file | Private |
| `POST` | `/api/cv/:id/parse` | Parse uploaded CV text into sections | Private |
| `GET` | `/api/jobs` | Search opportunities with filters | Private |
| `POST` | `/api/jobs/:id/match` | Run AI candidate-to-job matching | Private |
| `POST` | `/api/jobs/:id/tailor` | Generate tailored ATS PDF & DOCX resumes | Private |
| `POST` | `/api/agent/run` | Execute autonomous multi-step agent | Private |
| `POST` | `/api/applications/submit`| Explicit user confirmation of submission | Private |

---

## 🛡️ Security & Guardrails

- **Prompt Injection Defense**: Guardrail module checks user prompts against known adversarial jailbreaks (`DAN`, `"ignore previous instructions"`, `"reveal system prompt"`, etc.).
- **Prototype Pollution Prevention**: Rejects malicious parameter payloads attempting to exploit object prototype pollution.
- **SSRF Defense**: `isSafeUrl()` validates and blocks private subnets (`127.0.0.1`, `localhost`, `10.x.x.x`, `192.168.x.x`, `.local`) before any external job board fetch.
- **NoSQL Injection Defense**: `express-mongo-sanitize` strips `$` and `.` operators from client request payloads.
- **Multi-Tier Rate Limiting**: General API limit (200 req/15m) and strict limit (30 req/15m) on AI, auth, and agent endpoints.
- **Non-Root Containers**: Docker builds execute under unprivileged `appuser:appgroup`.

---

## 🧪 Testing Suite

The project includes an automated Jest and Supertest suite covering unit, security, and integration layers:

```bash
cd server
npm run test:unit         # Run all unit and security tests
npm run test:integration  # Run integration API tests
npm test                  # Run entire test suite
```

### Coverage Highlights:
- **54 passing unit tests** across 6 test suites.
- SSRF filtering verification (`security.test.js`).
- Prompt injection and step limiter verification (`guardrails.test.js`).
- Job normalization and adapter searching (`mockAdapter.test.js`).
- Non-fabricating AI matching and score ordering (`matchingService.test.js`).
- Tool registry integrity and schema validation (`toolRegistry.test.js`).
- Logging redaction and domain logger coverage (`logger.test.js`).

---

## 📊 Monitoring & Logging

Structured logging is managed by **Winston** with **Morgan** HTTP request streaming:
- **Automatic Redaction**: All log metadata is scanned recursively to strip sensitive keys (`password`, `token`, `apiKey`, `cvContent`, etc.).
- **Domain Channels**: Dedicated log streams for `auth`, `api`, `job`, `agent`, `tool`, `application`, and `worker`.
- **Environment Modes**: Colorized console output in development; automatic file rotation (`error.log` and `combined.log`) in production.

---

## 🚢 Deployment Options

Complete deployment instructions are detailed in [docs/deployment.md](docs/deployment.md):

### Option 1: Multi-Container Docker Compose
```bash
docker compose up -d --build
```
Orchestrates isolated `server`, `worker`, `client` (Nginx), and internal `ollama` containers on a private bridge network.

### Option 2: Unified PaaS Deployment (Render / Railway / Heroku)
The Express server automatically detects and serves built client assets from `client/dist` when deployed as a single web service:
```bash
npm run build
npm start
```

---

## 📂 Repository Structure

```
Final Project/
├── client/                     # Vite + React 19 Frontend
│   ├── src/
│   │   ├── components/         # Navbar, Layout components
│   │   ├── context/            # AuthContext & Session management
│   │   ├── pages/              # Landing, Jobs, Profile, CVManager, Dashboard
│   │   └── services/           # Axios instance & dynamic base URLs
│   ├── Dockerfile              # Multi-stage production Nginx container
│   └── nginx.conf              # SPA routing, gzip, and security headers
├── server/                     # Node.js + Express 5 Backend
│   ├── adapters/               # Job & Application adapters (RemoteOK, Arbeitnow, Mock)
│   ├── agent/                  # Planner, Guardrails, StateManager, ToolRegistry
│   ├── config/                 # Database connection
│   ├── controllers/            # Route controllers (Auth, Jobs, Agent, Profile)
│   ├── models/                 # Mongoose schemas (User, Job, CV, Application, Task)
│   ├── routes/                 # Express REST routes
│   ├── services/               # AI Service, Tailoring, Matching, Background Worker
│   ├── templates/              # PDFKit & DOCX ATS resume generators
│   ├── tests/                  # Unit and integration test suites
│   ├── utils/                  # Logger (Winston) and Security (SSRF validator)
│   ├── Dockerfile              # Multi-stage production container (appuser)
│   ├── server.js               # Express application entrypoint
│   └── worker.js               # Dedicated queue processor entrypoint
├── docs/                       # Project Documentation
│   ├── api.md                  # Complete REST API reference
│   ├── architecture.md         # Multi-tier system architecture
│   └── deployment.md           # Production deployment & Docker guide
├── docker-compose.yml          # Production multi-container composition
├── docker-compose.dev.yml      # Local dev override with hot-reload
├── .env.example                # Clean configuration template
├── .gitignore                  # Git exclusion rules
└── README.md                   # Comprehensive project portfolio documentation
```

---

## 📄 License
This project is developed for educational and portfolio demonstration purposes. All rights reserved.
