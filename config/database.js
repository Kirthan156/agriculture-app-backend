const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,           // Database name
  process.env.DB_USER,           // Username
  process.env.DB_PASSWORD,       // Password (Ensure it's a string)
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,  // Set to true to see raw SQL queries
  }
);

module.exports = sequelize;
