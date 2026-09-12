const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const PROCESSED_PATH = path.join(__dirname, '../../data/processed/messages.json');
const EMBEDDINGS_PATH = path.join(__dirname, '../../data/embeddings/message_embeddings.json');
const RAW_PATH = path.join(__dirname, '../../data/raw/chat_export.json');

/**
 * GET /api/status
 * Returns system state, counts, and available senders
 */
router.get('/status', (req, res) => {
  const isRawAvailable = fs.existsSync(RAW_PATH);
  const isProcessedAvailable = fs.existsSync(PROCESSED_PATH);
  const isEmbeddingsAvailable = fs.existsSync(EMBEDDINGS_PATH);

  let messageCount = 0;
  let senders = [];
  let emotions = [];
  let topics = [];

  if (isProcessedAvailable) {
    try {
      const messages = JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf-8'));
      messageCount = messages.length;
      senders = Array.from(new Set(messages.map((m) => m.sender)));
      emotions = Array.from(new Set(messages.map((m) => m.emotion).filter(Boolean)));
      topics = Array.from(new Set(messages.map((m) => m.topic).filter(Boolean)));
    } catch (e) {
      console.error('Error reading processed data:', e);
    }
  }

  res.json({
    isIngested: isProcessedAvailable && messageCount > 0,
    isRawAvailable,
    isEmbeddingsAvailable,
    messageCount,
    senders,
    emotions,
    topics,
    provider: process.env.EMBEDDING_PROVIDER || 'local-semantic'
  });
});

/**
 * GET /api/messages
 * Returns all processed messages
 */
router.get('/messages', (req, res) => {
  if (!fs.existsSync(PROCESSED_PATH)) {
    return res.status(404).json({ error: 'No processed messages found' });
  }

  try {
    const messages = JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf-8'));
    res.json({ count: messages.length, messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read messages', details: err.message });
  }
});

module.exports = router;
