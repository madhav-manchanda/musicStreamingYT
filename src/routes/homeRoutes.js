const express = require('express');
const router = express.Router();
const musicService = require('../services/musicService');

const TRENDING_QUERIES = [
  'Arijit Singh',
  'trending hindi songs',
  'latest bollywood',
  'top hits 2025',
  'romantic songs',
];

router.get('/trending', async (req, res, next) => {
  try {
    const trendingPromises = TRENDING_QUERIES.map(async (query) => {
      try {
        const songs = await musicService.searchSongs(query, 5);
        return {
          category: query,
          songs: songs.slice(0, 5),
        };
      } catch {
        return { category: query, songs: [] };
      }
    });

    const trending = await Promise.all(trendingPromises);

    res.json({
      success: true,
      data: trending.filter((t) => t.songs.length > 0),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
