const { Sequelize } = require("sequelize");
// 'dotenv' ki zaroorat nahi agar aap Render par DATABASE_URL use kar rahe hain
// require('dotenv').config();

// Hum maan rahe hain ki aapne Render ke Environment Variables mein
// 'DATABASE_URL' key set ki hui hai, jismein poora connection string hai.
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  // SSL settings Render ke cloud database connection ke liye zaroori hain
  dialectOptions: {
    ssl: {
      require: true, // SSL connection ki zaroorat hai
      rejectUnauthorized: false, // Self-signed certificates ko allow karta hai
    },
  },
  // Optional: Connection pool settings
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const connectDB = async () => {
  try {
    // sequelize.authenticate() poore URL ka istemaal karke connect karega
    await sequelize.authenticate();
    console.log("Database connected...");

    // Automatically create tables based on models
    await sequelize.sync({ force: false }); // `force: false` tables ko nahi chhedta
    console.log("Database synced...");
  } catch (error) {
    // Error ko detail mein log karein
    console.error("Database connection failed:", error.message);
    // Agar connection fail ho toh process exit kar dein
    // process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
