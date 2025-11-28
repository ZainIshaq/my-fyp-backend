const { DataTypes } = require("sequelize");
const {sequelize} = require("../config/db");

const Video = sequelize.define("Video", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  genre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  videoUrl: {
    type: DataTypes.STRING, // Store video file path or URL
    allowNull: false,
  },
  thumbnailUrl: {
    type: DataTypes.STRING, // Store thumbnail image path or URL
    allowNull: true, 
  },
  cloudinaryVideoId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cloudinary public_id for video file'
  },
  cloudinaryThumbnailId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cloudinary public_id for thumbnail file'
  }
});

module.exports = Video;