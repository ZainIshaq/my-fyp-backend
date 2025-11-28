// routes/user.js (Updated with watch later and favorites routes)
const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyOtp,
  forgotPassword,
  verifyOtpAndResetPassword,
  loginUser,
} = require('../controllers/user');
const { Videostodisplay } = require('../controllers/user_inner');
const {
  getMovieRecommendations,
  getMovieRecommendationsWithMix,
  getMoviesByEmotion,
  getTrendingMovies,
  getSupportedEmotions,
} = require('../controllers/movieRecommendation');
const {
  handleChatMessage,
  resetConversation,
} = require('../controllers/chatbot');
const {
  addToWatchLater,
  removeFromWatchLater,
  getWatchLaterMovies,
  addToFavorites,
  removeFromFavorites,
  getFavoriteMovies,
} = require('../controllers/watchLater');
const authenticateToken = require('../middleware/auth');

// User authentication routes
router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/forget-password-otp-send', forgotPassword);
router.post('/forget-otp-verified-savepassword', verifyOtpAndResetPassword);
router.post('/User-Login', loginUser);

// Video routes
router.get('/mainVideos', authenticateToken, Videostodisplay);

// Movie recommendation routes
router.post('/recommend-movies', authenticateToken, getMovieRecommendations);
router.post(
  '/recommend-movies-mixed',
  authenticateToken,
  getMovieRecommendationsWithMix
);
router.get(
  '/movies/emotion/:emotion/:limit?',
  authenticateToken,
  getMoviesByEmotion
);
router.get('/movies/trending', authenticateToken, getTrendingMovies);
router.get('/emotions/supported', authenticateToken, getSupportedEmotions);

// Watch Later routes
router.post('/watch-later', authenticateToken, addToWatchLater);
router.delete('/watch-later/:movieId', authenticateToken, removeFromWatchLater);
router.get('/watch-later', authenticateToken, getWatchLaterMovies);

// Favorites routes
router.post('/favorites', authenticateToken, addToFavorites);
router.delete('/favorites/:movieId', authenticateToken, removeFromFavorites);
router.get('/favorites', authenticateToken, getFavoriteMovies);


// Chatbot routes
router.post('/chat/message', authenticateToken, handleChatMessage);
router.post('/chat/reset', authenticateToken, resetConversation);

module.exports = router;
