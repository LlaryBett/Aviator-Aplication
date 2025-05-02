const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Game = require('../models/Game');

// Basic routes
router.get('/games/history', async (req, res) => {
  try {
    const history = await Game.find()
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/leaderboard', async (req, res) => {
  try {
    const { users } = req.body;
    const createdUsers = await Promise.all(
      users.map(userData => User.create(userData))
    );
    res.json({ success: true, users: createdUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const topPlayers = await User.find()
      .select('username avatar stats')
      .sort({ 'stats.totalWinnings': -1 })
      .limit(10);

    res.json({
      leaderboard: topPlayers.map(player => ({
        _id: player._id,
        username: player.username,
        avatar: player.avatar,
        stats: {
          totalWinnings: player.stats?.totalWinnings || 0,
          biggestWin: player.stats?.biggestWin || 0,
          gamesPlayed: player.stats?.gamesPlayed || 0
        }
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/live-players', async (req, res) => {
  try {
    const currentGame = await Game.findOne({ status: 'running' })
      .populate('players.userId', 'username avatar');
    res.json(currentGame?.players || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:id/balance', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json({ balance: user?.balance || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
