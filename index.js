const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const { initModels } = require("./models");
const userRoutes = require("./routes/user.js");
const adminRoutes = require("./routes/Admin.js");
const notificationRoutes = require("./routes/notification.js");
const app = express();
const path = require("path");
require("dotenv").config();

// --- Zaroori Change Yahan Karen ---
// Ab hum complex corsOptions ki jagah, seedha 'cors' function use karenge
// taki preflight (OPTIONS) requests theek se handle ho saken.

const allowedOrigins = [
  "http://localhost:3000",
  "https://def-fyp.netlify.app",
  "https://my-fyp-frontend.vercel.app", // Aapka Vercel Frontend URL
];

// Use the CORS middleware with a direct configuration object
app.use(
  cors({
    origin: allowedOrigins, // List of allowed origins
    methods: ["GET", "POST", "PUT", "DELETE"], // Saare zaroori methods allow karein
    credentials: true,
    optionsSuccessStatus: 200, // Some older browsers default to 204
  })
);
// --- Change End ---

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Add a test endpoint to verify CORS
app.get("/api/test", (req, res) => {
  res.json({ message: "CORS is working!", origin: req.get("origin") });
});

connectDB();
initModels();

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
