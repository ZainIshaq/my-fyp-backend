const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const { initModels } = require("./models");
const userRoutes = require("./routes/user.js");
const adminRoutes = require("./routes/Admin.js");
const notificationRoutes = require("./routes/notification.js")
const app = express();
const path = require('path');
require('dotenv').config();

// Define the list of allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://def-fyp.netlify.app',  // If you are using this for deployment
 
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log('Incoming origin:', origin); // Log the incoming origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Rejected CORS origin:', origin); // Log the rejected origin
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// Use the CORS middleware
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add a test endpoint to verify CORS
app.get('/api/test', (req, res) => {
  res.json({ message: 'CORS is working!', origin: req.get('origin') });
});

connectDB();
initModels();

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
