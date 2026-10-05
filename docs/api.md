# API Reference — AI Job Agent

The AI Job Agent API is a RESTful service operating on port `5000` (or `PORT` environment variable). Protected endpoints require a Bearer token in the `Authorization` HTTP header:
```http
Authorization: Bearer <jwt_token>
```

---

## 1. Health & System

### `GET /api/health`
Check if the API server is online.
- **Access**: Public
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "AI Job Agent API is running"
}
```

---

## 2. Authentication

### `POST /api/auth/register`
Create a new user account.
- **Access**: Public
- **Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```
- **Response** (`201 Created`):
```json
{
  "_id": "651a2b...",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "token": "eyJhbGciOi..."
}
```

### `POST /api/auth/login`
Authenticate existing user and obtain JWT token.
- **Access**: Public
- **Body**:
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```
- **Response** (`200 OK`):
```json
{
  "_id": "651a2b...",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "token": "eyJhbGciOi..."
}
```

### `GET /api/auth/profile`
Retrieve authenticated user profile.
- **Access**: Private (Bearer Token)

---

## 3. Candidate Profile

### `GET /api/profile`
Get candidate technical background, preferences, and experience.
- **Access**: Private (Bearer Token)

### `POST /api/profile`
Create or update candidate profile.
- **Access**: Private (Bearer Token)
- **Body**:
```json
{
  "title": "Senior Full Stack Engineer",
  "skills": ["JavaScript", "TypeScript", "Node.js", "React", "MongoDB", "Docker"],
  "experience": [
    {
      "company": "Acme Tech",
      "position": "Backend Lead",
      "startDate": "2022-01-01",
      "endDate": null,
      "description": "Architected microservices and REST APIs."
    }
  ],
  "education": [
    {
      "institution": "University of Tech",
      "degree": "B.S. Computer Science",
      "year": 2021
    }
  ],
  "preferences": {
    "remote": true,
    "jobTypes": ["full-time"],
    "targetRoles": ["Backend Engineer", "Full Stack Developer"]
  }
}
```

---

## 4. CV Processing

### `POST /api/cv/upload`
Upload a CV file (`multipart/form-data`, max 5MB, `.pdf` or `.docx`).
- **Access**: Private (Bearer Token)
- **Form Field**: `cv` (file)
- **Response** (`201 Created`):
```json
{
  "message": "CV uploaded successfully",
  "cv": {
    "_id": "651b...",
    "originalName": "resume.pdf",
    "path": "/uploads/cvs/uuid.pdf",
    "mimetype": "application/pdf",
    "size": 120450
  }
}
```

### `GET /api/cv`
List all uploaded CVs for the authenticated user.
- **Access**: Private (Bearer Token)

### `POST /api/cv/:id/parse`
Extract structured candidate text, skills, and sections from uploaded CV.
- **Access**: Private (Bearer Token)
- **Response** (`200 OK`):
```json
{
  "success": true,
  "parsed": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "skills": ["JavaScript", "Node.js", "Express", "Docker"],
    "experience": [...],
    "education": [...]
  }
}
```

### `DELETE /api/cv/:id`
Delete an uploaded CV file and record.
- **Access**: Private (Bearer Token)

---

## 5. Job Discovery & Ingestion

### `GET /api/jobs`
Search and list jobs with optional query filtering.
- **Access**: Private (Bearer Token)
- **Query Parameters**:
  - `keyword`: string (search title, company, description)
  - `type`: `full-time` | `part-time` | `contract` | `internship`
  - `remote`: `true` | `false`
  - `source`: `mock` | `remoteok` | `arbeitnow` | `all`

### `GET /api/jobs/sources`
List all supported job board adapters.
- **Access**: Private (Bearer Token)

### `POST /api/jobs/import`
Fetch and ingest jobs from external adapters with deduplication.
- **Access**: Private (Bearer Token)
- **Body**:
```json
{
  "source": "remoteok",
  "query": { "keyword": "Node" }
}
```

### `GET /api/jobs/:id`
Get full details of a specific job.
- **Access**: Private (Bearer Token)

---

## 6. AI Matching & Resume Tailoring

### `POST /api/jobs/:id/match`
Evaluate fit between candidate profile and a specific job.
- **Access**: Private (Bearer Token)
- **Response** (`200 OK`):
```json
{
  "score": 88,
  "matchingSkills": ["Node.js", "Express", "Docker"],
  "missingSkills": ["Kubernetes"],
  "relevantExperience": "Lead architect on Node.js backend systems.",
  "concerns": ["Candidate lacks explicit Kubernetes production experience."],
  "explanation": "Strong candidate match for backend engineering requirements."
}
```

### `POST /api/jobs/:id/tailor`
Generate an ATS-optimized resume tailored to the job requirements.
- **Access**: Private (Bearer Token)
- **Response** (`200 OK`):
```json
{
  "success": true,
  "tailoredResume": {
    "_id": "651c...",
    "job": "651b...",
    "pdfPath": "/uploads/tailored/resume-uuid.pdf",
    "docxPath": "/uploads/tailored/resume-uuid.docx",
    "generatedAt": "2026-10-05T14:00:00.000Z"
  }
}
```

### `GET /api/jobs/:id/tailor`
Retrieve existing tailored resume for a specific job.
- **Access**: Private (Bearer Token)

---

## 7. Autonomous AI Agent

### `POST /api/agent/run`
Launch the autonomous agent to accomplish a multi-step job goal.
- **Access**: Private (Bearer Token)
- **Body**:
```json
{
  "goal": "Find high-match remote Node.js roles and tailor my resume for the top opportunity"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "task": {
    "_id": "651d...",
    "status": "completed",
    "goal": "Find high-match remote Node.js roles...",
    "plan": [
      { "step": 1, "tool": "getCandidateProfile", "status": "completed" },
      { "step": 2, "tool": "searchJobs", "status": "completed" },
      { "step": 3, "tool": "matchCandidateJob", "status": "completed" },
      { "step": 4, "tool": "tailorResume", "status": "completed" }
    ],
    "results": {
      "summary": "Agent discovered 12 jobs and matched top opportunity...",
      "matchedJobs": [...]
    }
  }
}
```

### `GET /api/agent/tasks`
List all agent runs for the current user.
- **Access**: Private (Bearer Token)

### `GET /api/agent/tasks/:id`
Get full execution log and status of an agent run.
- **Access**: Private (Bearer Token)

---

## 8. Agent Tools

### `GET /api/tools`
List all registered sandboxed tools and parameter schemas.
- **Access**: Private (Bearer Token)

### `POST /api/tools/execute`
Directly execute a registered tool in user context.
- **Access**: Private (Bearer Token)
- **Body**:
```json
{
  "toolName": "searchJobs",
  "params": { "keyword": "TypeScript", "remote": true }
}
```

### `GET /api/tools/logs`
View recent tool execution history and latencies.
- **Access**: Private (Bearer Token)

---

## 9. Application Management & Submission

### `GET /api/applications`
List all applications and statuses (`draft`, `prepared`, `ready_to_submit`, `submitted`).
- **Access**: Private (Bearer Token)

### `POST /api/applications/prepare`
Prepare application package for a job using the matching adapter.
- **Access**: Private (Bearer Token)
- **Body**: `{ "jobId": "651b..." }`

### `POST /api/applications/fill`
Auto-fill application fields with candidate profile and tailored resume.
- **Access**: Private (Bearer Token)
- **Body**: `{ "jobId": "651b..." }`

### `POST /api/applications/submit`
Explicit user authorization to submit the prepared application.
- **Access**: Private (Bearer Token)
- **Body**: `{ "jobId": "651b..." }`

### `GET /api/applications/:id/status`
Check external submission status via adapter.
- **Access**: Private (Bearer Token)

---

## 10. Background Worker

### `POST /api/worker/tasks`
Enqueue a background asynchronous task.
- **Access**: Private (Bearer Token)
- **Body**:
```json
{
  "type": "job_sync",
  "payload": { "source": "remoteok" }
}
```

### `GET /api/worker/tasks/:id`
Check status of an asynchronous background job (`queued`, `running`, `completed`, `failed`).
- **Access**: Private (Bearer Token)
