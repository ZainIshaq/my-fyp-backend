const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const User = sequelize.define("User", {
  Name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Ensuring email uniqueness
  },
  Password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  Age: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = User;
