// models/index.js
const { sequelize } = require('../config/db');
const User = require('./user');
const WatchLater = require('./watchLater');
const Favorites = require('./favorites');
const Notification = require("./notification")
const initModels = async () => {
  try {
    // Define associations
    User.hasMany(WatchLater, {
      foreignKey: 'userId',
      as: 'watchLaterMovies',
      onDelete: 'CASCADE',
    });
    WatchLater.belongsTo(User, {
      foreignKey: 'userId',
      as: 'user',
    });

    User.hasMany(Favorites, {
      foreignKey: 'userId',
      as: 'favoriteMovies',
      onDelete: 'CASCADE',
    });
    Favorites.belongsTo(User, {
      foreignKey: 'userId',
      as: 'user',
    });

    // Sync database with alter: true to update existing tables
    await sequelize.sync({ alter: true });
    console.log('✅ Models synced successfully.');
  } catch (error) {
    console.error('❌ Error syncing models:', error);
  }
};

module.exports = {
  sequelize,
  User,
  WatchLater,
  Favorites,
  initModels,
};
