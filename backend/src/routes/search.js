const express = require('express');
const router = express.Router();
const { searchChat } = require('../services/searchEngine');

/**
 * POST /api/search
 * Body: { query: string }
 * Runs Two-Tier search and returns matches with context windows.
 */
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchResponse = await searchChat(query.trim());
    return res.json(searchResponse);
  } catch (err) {
    console.error('[Search Error]:', err);
    return res.status(500).json({ error: 'Search execution failed', details: err.message });
  }
});

module.exports = router;
