// controllers/chatbot.js
const axios = require('axios');
const {
  getMovieRecommendations,
  getMovieRecommendationsWithMix,
  getTrendingMovies,
  emotionToGenreMapping,
  genreNames,
} = require('./movieRecommendation');

// Chatbot conversation states
const CONVERSATION_STATES = {
  GREETING: 'greeting',
  GATHERING_PREFERENCES: 'gathering_preferences',
  EMOTION_ANALYSIS: 'emotion_analysis',
  MOVIE_RECOMMENDATION: 'movie_recommendation',
  FOLLOW_UP: 'follow_up',
};

// In-memory conversation storage (use Redis/DB in production)
const conversationStorage = new Map();

// Genre mapping for natural language
const genreMapping = {
  // Action & Adventure
  action: [28],
  adventure: [12],
  thriller: [53],
  superhero: [28, 878],
  spy: [28, 53],
  war: [10752],

  // Comedy & Light
  comedy: [35],
  funny: [35],
  humor: [35],
  laugh: [35],
  'romantic comedy': [35, 10749],
  family: [10751],

  // Drama & Emotional
  drama: [18],
  emotional: [18],
  sad: [18],
  'tear jerker': [18],
  romance: [10749],
  'love story': [10749],
  romantic: [10749],

  // Horror & Suspense
  horror: [27],
  scary: [27],
  supernatural: [27],
  mystery: [9648],
  suspense: [53],
  psychological: [53, 27],

  // Sci-Fi & Fantasy
  'sci-fi': [878],
  'science fiction': [878],
  fantasy: [14],
  magic: [14],
  space: [878],
  futuristic: [878],

  // Other
  crime: [80],
  documentary: [99],
  animation: [16],
  western: [37],
  music: [10402],
  history: [36],
};

// Mood to emotion mapping
const moodToEmotion = {
  happy: 'happy',
  joyful: 'happy',
  upbeat: 'happy',
  cheerful: 'happy',
  sad: 'sad',
  melancholy: 'sad',
  blue: 'sad',
  down: 'sad',
  angry: 'angry',
  frustrated: 'angry',
  mad: 'angry',
  furious: 'angry',
  excited: 'surprised',
  thrilled: 'surprised',
  pumped: 'surprised',
  scared: 'fearful',
  nervous: 'fearful',
  anxious: 'fearful',
  disgusted: 'disgusted',
  'grossed out': 'disgusted',
  neutral: 'neutral',
  normal: 'neutral',
  okay: 'neutral',
};

// Helper function to extract preferences from text
const extractPreferencesFromText = (text) => {
  const lowerText = text.toLowerCase();
  const preferences = {};

  // Extract genres
  const detectedGenres = [];
  Object.entries(genreMapping).forEach(([keyword, genreIds]) => {
    if (lowerText.includes(keyword)) {
      detectedGenres.push(...genreIds);
    }
  });
  if (detectedGenres.length > 0) {
    preferences.genres = [...new Set(detectedGenres)];
  }

  // Extract mood/emotions
  Object.entries(moodToEmotion).forEach(([mood, emotion]) => {
    if (lowerText.includes(mood)) {
      preferences.mood = emotion;
    }
  });

  // Extract year preferences
  const yearMatch = lowerText.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    preferences.year = parseInt(yearMatch[0]);
  }

  // Extract rating preferences
  if (lowerText.includes('high rated') || lowerText.includes('good rating')) {
    preferences.minRating = 7.0;
  }

  return preferences;
};

// Generate contextual questions based on conversation
const generateContextualQuestion = (
  conversationState,
  userPreferences,
  emotionData,
  askedQuestions = []
) => {
  const questions = {
    genres: [
      'What type of movies do you usually enjoy? (action, comedy, drama, horror, etc.)',
      'Are you in the mood for something specific like comedy, thriller, or romance?',
      'Do you prefer action-packed movies or something more relaxed?',
    ],
    mood: [
      'How are you feeling right now?',
      "What's your current mood like?",
      'Are you looking for something uplifting or more serious?',
    ],
    specifics: [
      'Any favorite actors or directors?',
      'Do you prefer newer movies or are you open to classics?',
      'Any particular rating preference? (family-friendly, mature themes, etc.)',
    ],
  };

  // Choose question based on what we don't know yet and what hasn't been asked
  if (!userPreferences.genres && !askedQuestions.includes('genres')) {
    return {
      question:
        questions.genres[Math.floor(Math.random() * questions.genres.length)],
      type: 'genres',
    };
  }
  if (
    !userPreferences.mood &&
    !emotionData &&
    !askedQuestions.includes('mood')
  ) {
    return {
      question:
        questions.mood[Math.floor(Math.random() * questions.mood.length)],
      type: 'mood',
    };
  }
  if (!askedQuestions.includes('specifics')) {
    return {
      question:
        questions.specifics[
          Math.floor(Math.random() * questions.specifics.length)
        ],
      type: 'specifics',
    };
  }

  // If all questions asked, move to recommendations
  return null;
};

// Enhanced recommendation logic combining preferences and emotions
const generateHybridRecommendations = async (
  userPreferences,
  emotionData,
  userId,
  forceNew = false,
  excludeIds = []
) => {
  try {
    let recommendations = [];

    // Add randomization for "different" requests
    const randomPage = forceNew ? Math.floor(Math.random() * 5) + 1 : 1;

    // Priority 1: Use emotion data if available and recent
    if (emotionData && emotionData.currentEmotions) {
      console.log('🎭 Using emotion-based recommendations');

      // Enhance emotions with user preferences
      const enhancedEmotions = { ...emotionData.currentEmotions };

      // Boost emotions that align with user mood preference
      if (userPreferences.mood && enhancedEmotions[userPreferences.mood]) {
        enhancedEmotions[userPreferences.mood] *= 1.3;
      }

      // Normalize enhanced emotions
      const total = Object.values(enhancedEmotions).reduce(
        (sum, val) => sum + val,
        0
      );
      Object.keys(enhancedEmotions).forEach((key) => {
        enhancedEmotions[key] = total > 0 ? enhancedEmotions[key] / total : 0;
      });

      const mockRequest = {
        body: {
          emotions: enhancedEmotions,
          limit: 6,
          userPreferences: userPreferences,
          page: randomPage,
        },
        user: { id: userId },
      };

      const mockResponse = {
        status: (code) => ({
          json: (data) => {
            if (data.success) recommendations = data.movies;
            return data;
          },
        }),
      };

      await getMovieRecommendations(mockRequest, mockResponse);
    }

    // Priority 2: Use preferences if no emotions or as fallback
    if (recommendations.length === 0 && userPreferences.genres) {
      console.log('🎯 Using preference-based recommendations');
      recommendations = await getPreferenceBasedMovies(
        userPreferences,
        randomPage
      );
    }

    // Priority 3: Trending movies as final fallback
    if (recommendations.length === 0) {
      console.log('📈 Using trending movies as fallback');
      const mockRequest = { query: { limit: 6 } };
      const mockResponse = {
        status: (code) => ({
          json: (data) => {
            if (data.success) recommendations = data.movies;
            return data;
          },
        }),
      };
      await getTrendingMovies(mockRequest, mockResponse);
    }

    // Filter out previously recommended movies
    if (excludeIds.length > 0) {
      recommendations = recommendations.filter(
        (movie) => !excludeIds.includes(movie.id)
      );

      // If we filtered out too many, get more from next page
      if (recommendations.length < 3 && forceNew) {
        const additionalMovies = await getPreferenceBasedMovies(
          userPreferences,
          randomPage + 1
        );
        recommendations = [
          ...recommendations,
          ...additionalMovies.filter((movie) => !excludeIds.includes(movie.id)),
        ];
      }
    }

    // Apply preference filters
    if (userPreferences.minRating) {
      recommendations = recommendations.filter(
        (movie) => movie.rating >= userPreferences.minRating
      );
    }

    if (userPreferences.year) {
      recommendations = recommendations.filter((movie) => {
        const movieYear = new Date(movie.releaseDate).getFullYear();
        return Math.abs(movieYear - userPreferences.year) <= 5;
      });
    }

    return recommendations.slice(0, 6);
  } catch (error) {
    console.error('Error generating hybrid recommendations:', error);
    return [];
  }
};

// Preference-based movie fetching
const getPreferenceBasedMovies = async (preferences, page = 1) => {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    // Add sorting variety for different requests
    const sortOptions = [
      'popularity.desc',
      'vote_average.desc',
      'release_date.desc',
      'revenue.desc',
    ];
    const sortBy = sortOptions[page % sortOptions.length] || 'popularity.desc';

    const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        with_genres: preferences.genres ? preferences.genres.join(',') : '',
        sort_by: sortBy,
        page: page,
        'vote_average.gte': preferences.minRating || 6.0,
        'vote_count.gte': 100,
        primary_release_year: preferences.year || '',
        adult: false,
      },
    });

    return response.data.results.slice(0, 6).map((movie) => ({
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
      recommendationReason: 'Based on your preferences',
      emotionMatch: preferences.mood || 'preference',
    }));
  } catch (error) {
    console.error('Error fetching preference-based movies:', error);
    return [];
  }
};

// Main chatbot message handler
const handleChatMessage = async (req, res) => {
  try {
    const { message, conversationId, emotionData, requestId, lastRequest } =
      req.body;
    const userId = req.user.id;

    // Get or create conversation context
    const contextKey = conversationId || `${userId}-${Date.now()}`;
    let conversation = conversationStorage.get(contextKey) || {
      state: CONVERSATION_STATES.GREETING,
      preferences: {},
      messageCount: 0,
      startTime: Date.now(),
      lastRecommendationIds: [], // Track recommended movie IDs
      requestHistory: [], // Track request history
      askedQuestions: [], // Track what questions have been asked
    };

    conversation.messageCount++;
    conversation.requestHistory.push({
      message,
      requestId,
      timestamp: Date.now(),
    });

    const userMessage = message.toLowerCase().trim();

    let botResponse = '';
    let recommendations = [];
    let shouldGetRecommendations = false;

    // Handle different conversation states
    switch (conversation.state) {
      case CONVERSATION_STATES.GREETING:
        // Don't send welcome message again, just process the user input
        const greetingPrefs = extractPreferencesFromText(userMessage);
        conversation.preferences = {
          ...conversation.preferences,
          ...greetingPrefs,
        };

        if (
          userMessage.includes('recommend') ||
          userMessage.includes('suggest') ||
          userMessage.includes('show me')
        ) {
          shouldGetRecommendations = true;
          conversation.state = CONVERSATION_STATES.MOVIE_RECOMMENDATION;
          botResponse = 'Perfect! Let me find some great movies for you.';
        } else {
          conversation.state = CONVERSATION_STATES.GATHERING_PREFERENCES;
          const prefCount = Object.keys(conversation.preferences).length;

          if (prefCount === 0) {
            const firstQuestion = generateContextualQuestion(
              conversation.state,
              conversation.preferences,
              emotionData,
              conversation.askedQuestions
            );
            if (firstQuestion) {
              conversation.askedQuestions.push(firstQuestion.type);
              botResponse = "I'd love to help! " + firstQuestion.question;
            }
          } else if (prefCount < 2) {
            const nextQuestion = generateContextualQuestion(
              conversation.state,
              conversation.preferences,
              emotionData,
              conversation.askedQuestions
            );
            if (nextQuestion) {
              conversation.askedQuestions.push(nextQuestion.type);
              botResponse = `Got it! I see you like ${Object.keys(
                conversation.preferences
              ).join(' and ')}. ${nextQuestion.question}`;
            } else {
              shouldGetRecommendations = true;
              conversation.state = CONVERSATION_STATES.MOVIE_RECOMMENDATION;
              botResponse =
                'Great! Let me find some movies based on your preferences.';
            }
          } else {
            shouldGetRecommendations = true;
            conversation.state = CONVERSATION_STATES.MOVIE_RECOMMENDATION;
            botResponse =
              'Great! Let me find some movies based on your preferences.';
          }
        }
        break;

      case CONVERSATION_STATES.GATHERING_PREFERENCES:
        // Extract preferences from user message
        const gatheringPrefs = extractPreferencesFromText(userMessage);
        conversation.preferences = {
          ...conversation.preferences,
          ...gatheringPrefs,
        };

        // Check if user wants immediate recommendations
        if (
          userMessage.includes('recommend') ||
          userMessage.includes('suggest') ||
          userMessage.includes('show me')
        ) {
          shouldGetRecommendations = true;
          conversation.state = CONVERSATION_STATES.MOVIE_RECOMMENDATION;
          botResponse = 'Perfect! Let me find some great movies for you.';
        } else {
          // Continue gathering preferences
          const prefCount = Object.keys(conversation.preferences).length;

          // Check if we have enough info to make recommendations (2+ preferences or specific request)
          if (prefCount >= 2) {
            shouldGetRecommendations = true;
            conversation.state = CONVERSATION_STATES.MOVIE_RECOMMENDATION;
            botResponse =
              'Great! I have enough information. Let me find some perfect movies for you.';
          } else {
            // Ask next question
            const nextQuestion = generateContextualQuestion(
              conversation.state,
              conversation.preferences,
              emotionData,
              conversation.askedQuestions
            );

            if (nextQuestion) {
              conversation.askedQuestions.push(nextQuestion.type);
              botResponse = `Got it! I see you like ${Object.keys(
                conversation.preferences
              ).join(' and ')}. ${nextQuestion.question}`;
            } else {
              // No more questions, move to recommendations
              shouldGetRecommendations = true;
              conversation.state = CONVERSATION_STATES.MOVIE_RECOMMENDATION;
              botResponse =
                'Perfect! I have enough information. Let me find some great movies for you.';
            }
          }
        }
        break;

      case CONVERSATION_STATES.MOVIE_RECOMMENDATION:
        if (
          userMessage.includes('more') ||
          userMessage.includes('different') ||
          userMessage.includes('other')
        ) {
          // Check if user wants different genre
          if (
            userMessage.includes('different genre') ||
            userMessage.includes('different type') ||
            userMessage.includes('change genre')
          ) {
            // Reset preferences to get different recommendations
            conversation.preferences = {};
            const newPrefs = extractPreferencesFromText(userMessage);
            conversation.preferences = { ...newPrefs };
            botResponse =
              'Sure! Let me find something completely different for you.';
            shouldGetRecommendations = true;
          } else {
            // User wants more of the same type
            shouldGetRecommendations = true;
            botResponse = 'Here are more great movies for you!';
          }
        } else if (
          userMessage.includes('like') ||
          userMessage.includes('love') ||
          userMessage.includes('great')
        ) {
          botResponse =
            "Awesome! I'm glad you like the recommendations! 🎉\n\nWould you like more movies similar to these, or shall we explore a different genre/mood?";
          conversation.state = CONVERSATION_STATES.FOLLOW_UP;
        } else {
          // Treat as new preference and clear old ones if it's a genre change
          const newPrefs = extractPreferencesFromText(userMessage);
          if (Object.keys(newPrefs).length > 0) {
            // Clear old preferences if user specifies new genre
            if (newPrefs.genres && newPrefs.genres.length > 0) {
              conversation.preferences = newPrefs; // Replace instead of merge
              botResponse = `Great choice! Let me find some ${Object.keys(
                newPrefs
              ).join(' and ')} movies for you.`;
            } else {
              conversation.preferences = {
                ...conversation.preferences,
                ...newPrefs,
              };
              botResponse =
                'Perfect! Let me update your preferences and find new recommendations.';
            }
            shouldGetRecommendations = true;
          }
        }
        break;

      case CONVERSATION_STATES.FOLLOW_UP:
        if (
          userMessage.includes('similar') ||
          userMessage.includes('more like')
        ) {
          shouldGetRecommendations = true;
          botResponse =
            'Here are more movies similar to your previous recommendations!';
        } else if (
          userMessage.includes('different') ||
          userMessage.includes('change')
        ) {
          conversation.preferences = {};
          conversation.askedQuestions = []; // Reset asked questions
          conversation.state = CONVERSATION_STATES.GATHERING_PREFERENCES;
          botResponse =
            "Sure! Let's find something different. " +
            generateContextualQuestion(conversation.state, {}, emotionData, [])
              ?.question;
        } else {
          const newPrefs = extractPreferencesFromText(userMessage);
          if (Object.keys(newPrefs).length > 0) {
            // Replace preferences for completely new recommendations
            conversation.preferences = newPrefs;
            shouldGetRecommendations = true;
            botResponse = `Excellent! Let me find some ${Object.keys(
              newPrefs
            ).join(' and ')} movies for you.`;
          } else {
            shouldGetRecommendations = true;
            botResponse = 'Let me find some new recommendations for you!';
          }
        }
        break;
    }

    // Generate recommendations if needed
    if (shouldGetRecommendations) {
      // Determine if this is a request for different content
      const isDifferentRequest =
        userMessage.includes('different') ||
        userMessage.includes('other') ||
        userMessage.includes('change') ||
        conversation.state === CONVERSATION_STATES.FOLLOW_UP ||
        (lastRequest && lastRequest === message); // Same request = want different results

      recommendations = await generateHybridRecommendations(
        conversation.preferences,
        emotionData,
        userId,
        isDifferentRequest,
        conversation.lastRecommendationIds || []
      );

      // Store new recommendation IDs to avoid duplicates
      if (recommendations.length > 0) {
        conversation.lastRecommendationIds = recommendations.map(
          (movie) => movie.id
        );
      }

      if (recommendations.length > 0) {
        const prefText =
          Object.keys(conversation.preferences).length > 0
            ? ` based on your preferences (${Object.keys(
                conversation.preferences
              ).join(', ')})`
            : '';
        const emotionText =
          emotionData && emotionData.dominantEmotion
            ? ` and your current ${emotionData.dominantEmotion} mood`
            : '';

        if (!botResponse) {
          botResponse = `Perfect! Here are some great movies${prefText}${emotionText}:\n\n🎬 Found ${recommendations.length} recommendations for you!`;
        }

        if (conversation.state !== CONVERSATION_STATES.FOLLOW_UP) {
          botResponse +=
            '\n\nWhat do you think? Would you like more recommendations or want to try a different genre?';
        }
      } else {
        botResponse =
          "I'm having trouble finding movies that match your criteria. Let me suggest some trending movies instead, or you can tell me different preferences!";
      }

      conversation.state = CONVERSATION_STATES.MOVIE_RECOMMENDATION;
    }

    // Handle fallback responses
    if (!botResponse) {
      const fallbackResponses = [
        "I'm here to help you find great movies! Tell me what you're in the mood for.",
        'What kind of movie experience are you looking for today?',
        "I can recommend movies based on how you're feeling or your preferences. What sounds good?",
      ];
      botResponse =
        fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    // Update conversation storage with a unique key to prevent duplicates
    conversation.lastProcessedMessage = message;
    conversation.lastProcessedTime = Date.now();
    conversationStorage.set(contextKey, conversation);

    // Clean up old conversations (simple memory management)
    if (conversationStorage.size > 1000) {
      const oldestKeys = Array.from(conversationStorage.keys()).slice(0, 100);
      oldestKeys.forEach((key) => conversationStorage.delete(key));
    }

    res.status(200).json({
      success: true,
      response: botResponse,
      recommendations: recommendations,
      conversationId: contextKey,
      conversationState: conversation.state,
      userPreferences: conversation.preferences,
      hasEmotionData: !!emotionData,
      suggestionChips: getSuggestionChips(
        conversation.state,
        conversation.preferences,
        conversation.askedQuestions
      ),
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      success: false,
      message: "Sorry, I'm having trouble right now. Please try again!",
      error: error.message,
    });
  }
};

// Generate suggestion chips for better UX
const getSuggestionChips = (state, preferences, askedQuestions = []) => {
  switch (state) {
    case CONVERSATION_STATES.GREETING:
    case CONVERSATION_STATES.GATHERING_PREFERENCES:
      return [
        'Comedy movies',
        'Action films',
        'Romance',
        'Horror',
        'Sci-Fi',
        'Recommend now',
      ];
    case CONVERSATION_STATES.MOVIE_RECOMMENDATION:
      return ['Show more', 'Different genre', 'Similar movies', 'Start over'];
    case CONVERSATION_STATES.FOLLOW_UP:
      return [
        'More like these',
        'Try different',
        'Action movies',
        'Comedy films',
      ];
    default:
      return ['Help me choose', 'Surprise me', 'Popular movies'];
  }
};

// Reset conversation
const resetConversation = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.id;

    if (conversationId) {
      conversationStorage.delete(conversationId);
    }

    res.status(200).json({
      success: true,
      message: 'Conversation reset successfully',
      newConversationId: `${userId}-${Date.now()}`,
    });
  } catch (error) {
    console.error('Error resetting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset conversation',
      error: error.message,
    });
  }
};

module.exports = {
  handleChatMessage,
  resetConversation,
  CONVERSATION_STATES,
};
