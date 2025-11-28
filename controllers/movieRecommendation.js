// controllers/movieRecommendation.js
const axios = require('axios');

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY; // Add this to your .env file
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Emotion to genre mapping (excluding neutral)
const emotionToGenreMapping = {
  happy: [35, 10751, 10402, 16], // Comedy, Family, Music, Animation
  sad: [18, 10749, 36], // Drama, Romance, History
  angry: [28, 53, 80, 10752], // Action, Thriller, Crime, War
  surprised: [878, 14, 27, 12], // Science Fiction, Fantasy, Horror, Adventure
  fearful: [27, 53, 9648], // Horror, Thriller, Mystery
  disgusted: [80, 53, 27, 99], // Crime, Thriller, Horror, Documentary
};

// Get genre names for better understanding
const genreNames = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

// Helper function to get dominant emotion (excluding neutral)
const getDominantEmotion = (emotions) => {
  const nonNeutralEmotions = { ...emotions };
  delete nonNeutralEmotions.neutral; // Remove neutral from consideration

  const entries = Object.entries(nonNeutralEmotions);
  if (entries.length === 0) return 'happy'; // Default fallback

  return entries.reduce((max, current) =>
    current[1] > max[1] ? current : max
  )[0];
};

// Helper function to get top emotions (excluding neutral)
const getTopEmotions = (emotions, count = 3) => {
  const nonNeutralEmotions = { ...emotions };
  delete nonNeutralEmotions.neutral; // Remove neutral

  return Object.entries(nonNeutralEmotions)
    .filter(([emotion, value]) => value > 0.1) // Only significant emotions
    .sort(([, a], [, b]) => b - a)
    .slice(0, count);
};

// Helper function to fetch movies from TMDB
const fetchMoviesFromTMDB = async (
  genreIds,
  page = 1,
  sortBy = 'popularity.desc'
) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        with_genres: genreIds.join(','),
        sort_by: sortBy,
        page: page,
        'vote_average.gte': 6.0, // Only movies with rating >= 6.0
        'vote_count.gte': 100, // Minimum vote count for reliability
        adult: false,
      },
    });

    return response.data.results;
  } catch (error) {
    console.error('Error fetching from TMDB:', error.message);
    throw error;
  }
};

// Enhanced function to get mixed genre recommendations
const getMixedGenreRecommendations = (emotionMix) => {
  const allGenres = new Set();
  const emotionWeights = {};

  // Collect genres from top emotions (excluding neutral)
  Object.entries(emotionMix).forEach(([emotion, confidence]) => {
    if (emotion !== 'neutral' && confidence > 0.1) {
      const genres = emotionToGenreMapping[emotion] || [];
      genres.forEach((genre) => allGenres.add(genre));
      emotionWeights[emotion] = confidence;
    }
  });

  return {
    genres: Array.from(allGenres),
    weights: emotionWeights,
  };
};

// New enhanced recommendation controller for mixed emotions
const getMovieRecommendationsWithMix = async (req, res) => {
  try {
    const { emotionMix, dominantEmotions, confidence, limit = 9 } = req.body;

    // Validate input
    if (!emotionMix || typeof emotionMix !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid emotion mix data.',
      });
    }

    // Get mixed genre recommendations
    const { genres, weights } = getMixedGenreRecommendations(emotionMix);

    if (genres.length === 0) {
      // Fallback to trending if no valid emotions
      console.log('No valid emotions found, falling back to trending movies');
      return getTrendingMovies(req, res);
    }

    console.log(
      `Mixed emotion analysis: ${Object.entries(weights)
        .map(([e, w]) => `${e}: ${(w * 100).toFixed(1)}%`)
        .join(', ')}`
    );
    console.log(
      `Recommended genres: ${genres.map((g) => genreNames[g]).join(', ')}`
    );

    // Fetch movies with mixed genres
    const movies = await fetchMoviesFromTMDB(genres, 1, 'popularity.desc');

    // Get additional movies with different sorting for variety
    const recentMovies = await fetchMoviesFromTMDB(
      genres,
      1,
      'release_date.desc'
    );
    const ratedMovies = await fetchMoviesFromTMDB(
      genres,
      1,
      'vote_average.desc'
    );

    // Combine and deduplicate movies
    const allMovies = [...movies, ...recentMovies, ...ratedMovies];
    const uniqueMovies = allMovies.filter(
      (movie, index, self) => index === self.findIndex((m) => m.id === movie.id)
    );

    // Score movies based on emotion mix
    const scoredMovies = uniqueMovies.map((movie) => {
      let emotionScore = 0;
      let matchingEmotions = [];

      movie.genre_ids.forEach((genreId) => {
        Object.entries(emotionToGenreMapping).forEach(([emotion, genres]) => {
          if (genres.includes(genreId) && weights[emotion]) {
            emotionScore += weights[emotion];
            if (!matchingEmotions.includes(emotion)) {
              matchingEmotions.push(emotion);
            }
          }
        });
      });

      return {
        ...movie,
        emotionScore,
        matchingEmotions,
        diversityScore: matchingEmotions.length, // Bonus for matching multiple emotions
      };
    });

    // Sort by emotion score and diversity, then by popularity
    scoredMovies.sort((a, b) => {
      const scoreA =
        a.emotionScore + a.diversityScore * 0.1 + a.popularity * 0.001;
      const scoreB =
        b.emotionScore + b.diversityScore * 0.1 + b.popularity * 0.001;
      return scoreB - scoreA;
    });

    // Format movies for frontend
    const formattedMovies = scoredMovies.slice(0, limit).map((movie) => {
      const primaryEmotion =
        dominantEmotions && dominantEmotions[0]
          ? dominantEmotions[0][0]
          : 'mixed';
      const recommendationReason =
        movie.matchingEmotions.length > 1
          ? `Perfect for your ${movie.matchingEmotions
              .slice(0, 2)
              .join(' and ')} mood`
          : `Recommended for your ${primaryEmotion} mood`;

      return {
        id: movie.id,
        title: movie.title,
        genre: movie.genre_ids
          .map((id) => genreNames[id])
          .filter(Boolean)
          .join(', '),
        description: movie.overview,
        rating: movie.vote_average,
        releaseDate: movie.release_date,
        posterUrl: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,
        backdropUrl: movie.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
          : null,
        movieLink: `https://www.themoviedb.org/movie/${movie.id}`,
        story: movie.overview,
        recommendationReason,
        emotionMatch: movie.matchingEmotions.join(', '),
        emotionScore: movie.emotionScore.toFixed(2),
        confidence: confidence || 0.8,
      };
    });

    const topEmotionsText = dominantEmotions
      ? dominantEmotions
          .slice(0, 2)
          .map(([e]) => e)
          .join(' + ')
      : 'mixed emotions';

    console.log(
      `Recommended ${formattedMovies.length} movies for mixed emotions: ${topEmotionsText}`
    );

    res.status(200).json({
      success: true,
      dominantEmotion: topEmotionsText,
      confidence: confidence || 0.8,
      emotionMix: weights,
      recommendedGenres: genres.map((id) => genreNames[id]).filter(Boolean),
      movies: formattedMovies,
      totalMovies: formattedMovies.length,
      analysisType: 'mixed_emotions',
    });
  } catch (error) {
    console.error('Error generating mixed emotion recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate mixed emotion recommendations',
      error: error.message,
    });
  }
};

// Main recommendation controller (original, enhanced)
const getMovieRecommendations = async (req, res) => {
  try {
    const { emotions, limit = 10 } = req.body;

    // Validate emotions data
    if (!emotions || typeof emotions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid emotions data. Expected object with emotion values.',
      });
    }

    // Get dominant emotion (excluding neutral)
    const dominantEmotion = getDominantEmotion(emotions);
    console.log(
      `Dominant emotion detected: ${dominantEmotion} (${(
        emotions[dominantEmotion] * 100
      ).toFixed(1)}%)`
    );

    // Get corresponding genres
    const recommendedGenres =
      emotionToGenreMapping[dominantEmotion] || emotionToGenreMapping.happy;

    // Fetch movies from TMDB
    const movies = await fetchMoviesFromTMDB(recommendedGenres);

    // Format movies for frontend
    const formattedMovies = movies.slice(0, limit).map((movie) => ({
      id: movie.id,
      title: movie.title,
      genre: movie.genre_ids
        .map((id) => genreNames[id])
        .filter(Boolean)
        .join(', '),
      description: movie.overview,
      rating: movie.vote_average,
      releaseDate: movie.release_date,
      posterUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      backdropUrl: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
        : null,
      movieLink: `https://www.themoviedb.org/movie/${movie.id}`,
      story: movie.overview,
      recommendationReason: `Recommended because you're feeling ${dominantEmotion}`,
      emotionMatch: dominantEmotion,
      confidence: emotions[dominantEmotion],
    }));

    // Log recommendation details
    console.log(
      `Recommended ${formattedMovies.length} movies for emotion: ${dominantEmotion}`
    );

    res.status(200).json({
      success: true,
      dominantEmotion,
      confidence: emotions[dominantEmotion],
      recommendedGenres: recommendedGenres
        .map((id) => genreNames[id])
        .filter(Boolean),
      movies: formattedMovies,
      totalMovies: formattedMovies.length,
    });
  } catch (error) {
    console.error('Error generating movie recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate movie recommendations',
      error: error.message,
    });
  }
};

// Get movies by specific emotion
const getMoviesByEmotion = async (req, res) => {
  try {
    const { emotion, limit = 10 } = req.params;

    if (!emotionToGenreMapping[emotion]) {
      return res.status(400).json({
        success: false,
        message: `Invalid emotion. Supported emotions: ${Object.keys(
          emotionToGenreMapping
        ).join(', ')}`,
      });
    }

    const genres = emotionToGenreMapping[emotion];
    const movies = await fetchMoviesFromTMDB(genres);

    const formattedMovies = movies.slice(0, limit).map((movie) => ({
      id: movie.id,
      title: movie.title,
      genre: movie.genre_ids
        .map((id) => genreNames[id])
        .filter(Boolean)
        .join(', '),
      description: movie.overview,
      rating: movie.vote_average,
      releaseDate: movie.release_date,
      posterUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      backdropUrl: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
        : null,
      movieLink: `https://www.themoviedb.org/movie/${movie.id}`,
      story: movie.overview,
      recommendationReason: `Movies for ${emotion} mood`,
      emotionMatch: emotion,
    }));

    res.status(200).json({
      success: true,
      emotion,
      movies: formattedMovies,
      totalMovies: formattedMovies.length,
    });
  } catch (error) {
    console.error('Error fetching movies by emotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch movies',
      error: error.message,
    });
  }
};

// Get trending movies (fallback)
const getTrendingMovies = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/day`, {
      params: {
        api_key: TMDB_API_KEY,
      },
    });

    const movies = response.data.results.slice(0, limit).map((movie) => ({
      id: movie.id,
      title: movie.title,
      genre: movie.genre_ids
        .map((id) => genreNames[id])
        .filter(Boolean)
        .join(', '),
      description: movie.overview,
      rating: movie.vote_average,
      releaseDate: movie.release_date,
      posterUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      backdropUrl: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
        : null,
      movieLink: `https://www.themoviedb.org/movie/${movie.id}`,
      story: movie.overview,
      recommendationReason: 'Currently trending',
      emotionMatch: 'trending',
    }));

    res.status(200).json({
      success: true,
      movies,
      totalMovies: movies.length,
    });
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending movies',
      error: error.message,
    });
  }
};

// Get supported emotions info (utility endpoint)
const getSupportedEmotions = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      supportedEmotions: Object.keys(emotionToGenreMapping),
      excludedEmotions: ['neutral'],
      emotionToGenreMapping,
      genreNames,
      note: 'Neutral emotions are excluded from movie recommendations for better accuracy',
      features: {
        mixedEmotions: true,
        timeBasedTracking: true,
        confidenceThreshold: 0.15,
        trackingWindow: '15 seconds',
        neutralExclusion: true,
      },
    });
  } catch (error) {
    console.error('Error fetching supported emotions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supported emotions',
      error: error.message,
    });
  }
};

module.exports = {
  getMovieRecommendations,
  getMovieRecommendationsWithMix,
  getMoviesByEmotion,
  getTrendingMovies,
  getSupportedEmotions,
  emotionToGenreMapping,
  genreNames,
};
