const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { tagMessage } = require('../services/tagger');
const { embedText } = require('../services/embeddings');

const RAW_PATH = path.join(__dirname, '../../data/raw/chat_export.json');
const PROCESSED_DIR = path.join(__dirname, '../../data/processed');
const EMBEDDINGS_DIR = path.join(__dirname, '../../data/embeddings');
const PROCESSED_PATH = path.join(PROCESSED_DIR, 'messages.json');
const EMBEDDINGS_PATH = path.join(EMBEDDINGS_DIR, 'message_embeddings.json');


function ensureDirectories() {
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  if (!fs.existsSync(EMBEDDINGS_DIR)) fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });
}


router.post('/', async (req, res) => {
  try {
    if (!fs.existsSync(RAW_PATH)) {
      return res.status(404).json({ error: 'Raw chat export not found at data/raw/chat_export.json' });
    }

    ensureDirectories();
    const rawData = JSON.parse(fs.readFileSync(RAW_PATH, 'utf-8'));
    console.log(`[Ingest] Processing ${rawData.length} messages...`);

    const processedMessages = [];
    const embeddingsMap = {};

    for (const item of rawData) {
    
      const tagResult = await tagMessage(item.text);
      
      const processedMsg = {
        id: item.id,
        sender: item.sender,
        text: item.text,
        timestamp: item.timestamp,
        emotion: tagResult.emotion,
        topic: tagResult.topic
      };
      processedMessages.push(processedMsg);

      const vector = await embedText(item.text);
      embeddingsMap[item.id] = vector;
    }

    fs.writeFileSync(PROCESSED_PATH, JSON.stringify(processedMessages, null, 2));
    fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(embeddingsMap, null, 2));

    console.log(`[Ingest] Successfully ingested ${processedMessages.length} messages.`);

    return res.json({
      success: true,
      message: `Successfully ingested and indexed ${processedMessages.length} messages.`,
      count: processedMessages.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Ingest Error]:', err);
    return res.status(500).json({ error: 'Failed to ingest messages', details: err.message });
  }
});

module.exports = router;
