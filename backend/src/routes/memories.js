const express = require('express');
const router = express.Router();
const { getMemories } = require('../services/memoriesService');

/**
 * GET /api/memories
 * Query params: ?date=YYYY-MM-DD
 * Returns On This Day memories, curated milestones/highlights, and active calendar dates.
 */
router.get('/', (req, res) => {
  try {
    const { date } = req.query;
    const memoriesData = getMemories(date);
    return res.json({
      success: true,
      ...memoriesData
    });
  } catch (err) {
    console.error('[Memories Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch memories', details: err.message });
  }
});

module.exports = router;
