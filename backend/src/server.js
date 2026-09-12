require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const ingestRoute = require('./routes/ingest');
const searchRoute = require('./routes/search');
const statusRoute = require('./routes/status');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allows frontend on any local port (5173, 3000, etc.)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/ingest', ingestRoute);
app.use('/api/search', searchRoute);
app.use('/api', statusRoute);

// Root healthcheck
app.get('/', (req, res) => {
  res.json({
    name: 'searchChat API',
    description: 'Two-tier search system for group chats',
    version: '1.0.0',
    endpoints: {
      ingest: 'POST /api/ingest',
      search: 'POST /api/search',
      status: 'GET /api/status',
      messages: 'GET /api/messages'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 searchChat Backend listening on http://localhost:${PORT}`);
  console.log(`   Embedding Provider: ${process.env.EMBEDDING_PROVIDER || 'local-semantic'}`);
  console.log(`===============================================`);
});
