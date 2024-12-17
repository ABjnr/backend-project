const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const User = require("./user");

const Task = sequelize.define("task", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "in_progress", "completed"),
    defaultValue: "pending",
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  createdFor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: "id",
    },
  },
});

module.exports = Task;
