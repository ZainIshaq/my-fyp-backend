// models/favorites.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Favorites = sequelize.define(
  'Favorites',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    movieId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    posterUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    backdropUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    genre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    releaseDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emotionMatch: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recommendationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    movieLink: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    addedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'Favorites',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'movieId'], // Prevent duplicate entries
      },
    ],
  }
);

module.exports = Favorites;
