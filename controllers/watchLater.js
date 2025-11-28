// controllers/simpleWatchLater.js
const { WatchLater, Favorites, User } = require('../models');

module.exports = {
  // Add movie to watch later - saves complete movie details
  addToWatchLater: async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId || req.user.user_id;
      const movieData = req.body;

      console.log('Adding to watch later - userId:', userId);
      console.log('Movie data:', movieData);

      // Create watch later entry with all movie details
      const watchLaterMovie = await WatchLater.create({
        userId: userId,
        movieId: movieData.id || movieData.movieId || Date.now().toString(),
        title: movieData.title,
        posterUrl: movieData.posterUrl,
        backdropUrl: movieData.backdropUrl,
        genre: movieData.genre,
        rating: movieData.rating,
        releaseDate: movieData.releaseDate,
        description: movieData.description,
        emotionMatch: movieData.emotionMatch,
        recommendationReason: movieData.recommendationReason,
        movieLink: movieData.movieLink,
        confidence: movieData.confidence,
      });

      res.status(201).json({
        message: 'Movie added to Watch Later',
        success: true,
        data: watchLaterMovie,
      });
    } catch (error) {
      console.error('Error adding to watch later:', error);
      res.status(500).json({
        message: 'Error adding to Watch Later',
        success: false,
        error: error.message,
      });
    }
  },

  // Remove from watch later
  removeFromWatchLater: async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId || req.user.user_id;
      const { movieId } = req.params;

      const deleted = await WatchLater.destroy({
        where: {
          userId: userId,
          movieId: movieId,
        },
      });

      if (deleted) {
        res.json({ message: 'Removed from Watch Later', success: true });
      } else {
        res.status(404).json({ message: 'Movie not found', success: false });
      }
    } catch (error) {
      console.error('Error removing from watch later:', error);
      res.status(500).json({
        message: 'Error removing from Watch Later',
        success: false,
      });
    }
  },

  // Get all watch later movies
  getWatchLaterMovies: async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId || req.user.user_id;

      const movies = await WatchLater.findAll({
        where: { userId: userId },
        order: [['createdAt', 'DESC']],
      });

      res.json({
        message: 'Watch Later movies retrieved',
        success: true,
        data: movies,
      });
    } catch (error) {
      console.error('Error getting watch later movies:', error);
      res.status(500).json({
        message: 'Error getting Watch Later movies',
        success: false,
      });
    }
  },

  // Add movie to favorites - saves complete movie details
  addToFavorites: async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId || req.user.user_id;
      const movieData = req.body;

      console.log('Adding to favorites - userId:', userId);
      console.log('Movie data:', movieData);

      // Create favorite entry with all movie details
      const favoriteMovie = await Favorites.create({
        userId: userId,
        movieId: movieData.id || movieData.movieId || Date.now().toString(),
        title: movieData.title,
        posterUrl: movieData.posterUrl,
        backdropUrl: movieData.backdropUrl,
        genre: movieData.genre,
        rating: movieData.rating,
        releaseDate: movieData.releaseDate,
        description: movieData.description,
        emotionMatch: movieData.emotionMatch,
        recommendationReason: movieData.recommendationReason,
        movieLink: movieData.movieLink,
        confidence: movieData.confidence,
      });

      res.status(201).json({
        message: 'Movie added to Favorites',
        success: true,
        data: favoriteMovie,
      });
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({
        message: 'Error adding to Favorites',
        success: false,
        error: error.message,
      });
    }
  },

  // Remove from favorites
  removeFromFavorites: async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId || req.user.user_id;
      const { movieId } = req.params;

      const deleted = await Favorites.destroy({
        where: {
          userId: userId,
          movieId: movieId,
        },
      });

      if (deleted) {
        res.json({ message: 'Removed from Favorites', success: true });
      } else {
        res.status(404).json({ message: 'Movie not found', success: false });
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({
        message: 'Error removing from Favorites',
        success: false,
      });
    }
  },

  // Get all favorite movies
  getFavoriteMovies: async (req, res) => {
    try {
      const userId = req.user.id || req.user.userId || req.user.user_id;

      const movies = await Favorites.findAll({
        where: { userId: userId },
        order: [['createdAt', 'DESC']],
      });

      res.json({
        message: 'Favorite movies retrieved',
        success: true,
        data: movies,
      });
    } catch (error) {
      console.error('Error getting favorite movies:', error);
      res.status(500).json({
        message: 'Error getting Favorite movies',
        success: false,
      });
    }
  },
};
