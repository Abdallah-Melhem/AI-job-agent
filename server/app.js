const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');

const app = express();

// HTTP request logging (piped through winston)
app.use(morgan(':method :url :status :res[content-length]b :response-time ms', {
  stream: { write: (msg) => logger.api(msg.trim(), '', '', '') },
  skip: (req) => req.url === '/api/health' // skip health-check noise
}));

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // allows loading uploads like pdf
}));

// CORS Configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:80'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true
}));

// Request size limit & JSON parser
app.use(express.json({ limit: '50kb' }));

// NoSQL Injection Prevention (Express 5 compatible)
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    mongoSanitize.sanitize(req.body);
  }
  next();
});

// General Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// Strict Rate Limiting for Auth & AI
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 30, // 30 requests per 15 minutes
  message: 'Too many requests, please try again later'
});
app.use('/api/auth', strictLimiter);
app.use('/api/ai', strictLimiter);
app.use('/api/agent', strictLimiter);

// Static files: Only serve tailored generated outputs, NOT raw user uploaded CVs
app.use('/uploads/tailored', express.static(path.join(__dirname, '..', 'uploads', 'tailored')));

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: "AI Job Agent API is running"
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/cv', require('./routes/cvRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/tools', require('./routes/toolRoutes'));
app.use('/api/agent', require('./routes/agentRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/integrations', require('./routes/integrationRoutes'));
app.use('/api/worker', require('./routes/workerRoutes'));

// Serve static client assets in production if client/dist exists (unified PaaS deployment)
const fs = require('fs');
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(`[EXPRESS_ERROR] ${req.method} ${req.originalUrl} - ${err.message}`, {
    stack: err.stack,
    ip: req.ip
  });

  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An internal server error occurred'
      : err.message
  });
});

module.exports = app;
