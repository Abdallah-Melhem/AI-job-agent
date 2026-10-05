# Production Deployment Guide — AI Job Agent

## 1. Target Production Architecture

The AI Job Agent follows an isolated multi-tier production architecture. All internal services (Ollama LLM, Background Worker, MongoDB) are sealed from public ingress. Only the React Frontend and Express API are exposed to the public Internet through a reverse proxy with TLS/SSL encryption.

```
                         Internet (HTTPS / Port 443)
                                      ↓
                         Reverse Proxy (Nginx / Caddy / Cloudflare)
                                      ↓
                   ┌──────────────────┴──────────────────┐
                   ↓                                     ↓
        React Frontend (Static / SPA)           Express API (:5000)
        Served via Nginx / Node                    (Public Entrypoint)
                                                         │
                        ┌────────────────────────────────┴────────────────┐
                        ↓                                                 ↓
               MongoDB Database                                Task Queue (MongoDB / WorkerTask)
          (Atlas / Private VPC)                                           │
                                                                          ↓
                                                               Dedicated Background Worker
                                                               (Isolated Process / Container)
                                                                          │
                                                                          ↓
                                                                  Ollama LLM Service
                                                             (Internal Network / Port 11434)
                                                             * NEVER EXPOSED TO INTERNET *
```

---

## 2. Deployment Options

### Option A: Docker Compose (Recommended for VPS / Dedicated Server / AWS EC2)

The repository provides a complete production-grade `docker-compose.yml` orchestrating all containers.

#### Steps:
1. **Clone the repository on the target server:**
   ```bash
   git clone <repository_url>
   cd "Final Project"
   ```

2. **Prepare production environment file:**
   ```bash
   cp .env.example .env
   chmod 600 .env
   nano .env
   ```
   Set strong production values:
   - `MONGODB_URI`: Production MongoDB Atlas connection string.
   - `JWT_SECRET`: High-entropy random string (`openssl rand -hex 64`).
   - `FRONTEND_URL`: Your production domain (e.g., `https://jobagent.yourdomain.com`).
   - `NODE_ENV=production`

3. **Launch the stack:**
   ```bash
   docker compose up -d --build
   ```

4. **Verify container health:**
   ```bash
   docker compose ps
   docker compose logs -f server
   ```

5. **Pull the required Ollama model inside the container:**
   ```bash
   docker exec -it aijobagent-ollama ollama pull llama3.2
   ```

6. **Configure Public Reverse Proxy (Nginx on Host with SSL):**
   ```nginx
   server {
       listen 80;
       server_name jobagent.yourdomain.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name jobagent.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/jobagent.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/jobagent.yourdomain.com/privkey.pem;

       # Frontend
       location / {
           proxy_pass http://127.0.0.1:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Backend API & Uploads
       location ~ ^/(api|uploads)/ {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           client_max_body_size 10M;
       }
   }
   ```

---

### Option B: Unified PaaS Deployment (Render / Railway / Fly.io / Heroku)

The Express backend includes native fallback routing that automatically builds and serves the Vite React frontend from `client/dist` when run in production.

#### Build Command:
```bash
npm run build && cd server && npm install --omit=dev
```

#### Start Command:
```bash
npm start
```

#### Dedicated Worker Service (Optional separate PaaS worker):
```bash
npm run worker
```

---

## 3. Production Environment Variables Reference

| Variable | Description | Example / Default | Required |
|---|---|---|---|
| `NODE_ENV` | Runtime environment | `production` | Yes |
| `PORT` | API listener port | `5000` | Yes |
| `MONGODB_URI` | MongoDB connection URI | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` | Yes |
| `JWT_SECRET` | 256-bit encryption key for authentication tokens | `openssl rand -hex 64` | Yes |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated for multiple) | `https://jobagent.yourdomain.com` | Yes |
| `OLLAMA_BASE_URL` | Internal LLM service address | `http://ollama:11434` (Docker) or `http://localhost:11434` | Yes |
| `OLLAMA_MODEL` | Target language model | `llama3.2` | Yes |
| `DISABLE_IN_PROCESS_WORKER` | Disable server-embedded worker when running standalone worker | `true` or `false` | No |
| `VITE_API_URL` | API base path for client bundle build | `/api` or `https://api.yourdomain.com/api` | No |
| `VITE_FILE_URL` | Static files base path | `/` or `https://api.yourdomain.com` | No |

---

## 4. Production Security Checklist

- [x] **No hardcoded secrets**: All API keys, database credentials, and JWT secrets are sourced exclusively from environment variables.
- [x] **Rate Limiting**: Configured in `server/app.js` with general (200 req/15m) and strict tiers (30 req/15m on auth, AI, and agent).
- [x] **NoSQL Injection Defense**: Sanitization middleware (`express-mongo-sanitize`) active globally.
- [x] **SSRF Protection**: `isSafeUrl()` validates and blocks internal network targets (`127.0.0.1`, `localhost`, `10.x.x.x`, `192.168.x.x`) on external fetchers.
- [x] **Non-Root Container Execution**: Server container runs under unprivileged `appuser:appgroup`.
- [x] **Private LLM Network**: Ollama service is bound to Docker internal bridge network and not published to host ports.
- [x] **File Upload Restrictions**: Multer enforces 5MB limit, MIME-type validation, and UUID-based randomized storage paths.
- [x] **Deterministic AI Fallback**: If LLM service is offline or under load, all critical candidate matching and resume tailoring flows fallback gracefully without crashing.

---

## 5. Health Check & Monitoring

The Express server exposes a health check endpoint:
```http
GET /api/health
```
Response:
```json
{
  "success": true,
  "message": "AI Job Agent API is running"
}
```
Use this endpoint for container orchestrator readiness and liveness probes (`curl -f http://localhost:5000/api/health || exit 1`).
