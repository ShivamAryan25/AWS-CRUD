const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    port: process.env.DB_PORT || 3306,
    logging: console.log,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      connectTimeout: 60000,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Test the connection
const testConnection = async () => {
  try {
    console.log("Attempting to connect to:", process.env.DB_HOST);
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
  } catch (error) {
    console.error(
      "Unable to connect to the database:",
      error.original?.message || error.message
    );
    if (error.original?.code === "ECONNREFUSED") {
      console.error("\nPossible issues:");
      console.error("1. RDS instance is not publicly accessible");
      console.error(
        "2. Security group does not allow inbound traffic on port 3306"
      );
      console.error("3. Database instance is not running");
      console.error("\nPlease verify:");
      console.error('1. RDS instance is set to "Publicly accessible: Yes"');
      console.error("2. Security group inbound rules include:");
      console.error("   - Type: MYSQL/Aurora (3306)");
      console.error("   - Source: 0.0.0.0/0");
      console.error('3. Database instance status is "Available"');
    }
  }
};

testConnection();

module.exports = sequelize;
