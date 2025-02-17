// knexInstance.js

const knex = require("knex");
require("dotenv").config();

// Create a new Knex instance with database configuration
const db = knex({
  client: "pg", // Use the client for your preferred database, 'pg' for PostgreSQL, 'mysql' for MySQL, etc.
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
});

module.exports = db;
