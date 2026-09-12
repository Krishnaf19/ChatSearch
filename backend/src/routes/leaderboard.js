const express = require('express');
const router = express.Router();
const { getTopicsLeaderboard } = require('../services/leaderboardService');


router.get('/', (req, res) => {
  try {
    const data = getTopicsLeaderboard();
    return res.json({
      success: true,
      ...data
    });
  } catch (err) {
    console.error('[Leaderboard Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch topics leaderboard', details: err.message });
  }
});

module.exports = router;
