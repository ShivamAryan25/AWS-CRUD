const mysql = require("mysql2/promise");
const dns = require("dns").promises;
require("dotenv").config();

async function resolveHost() {
  try {
    const records = await dns.lookup(process.env.DB_HOST);
    console.log("DNS Resolution:", records);
    return records.address;
  } catch (error) {
    console.error("DNS Resolution failed:", error);
    return process.env.DB_HOST;
  }
}

async function testConnection() {
  console.log("\nTesting connection and setting up database...");

  try {
    // First connect without database to create it
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log("✓ Connected to MySQL server");

    // Create database if it doesn't exist
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
    );
    console.log(`✓ Ensured database '${process.env.DB_NAME}' exists`);

    // Switch to the database
    await connection.query(`USE \`${process.env.DB_NAME}\``);
    console.log(`✓ Switched to database '${process.env.DB_NAME}'`);

    // Test query
    const [rows] = await connection.execute("SELECT 1 + 1 as result");
    console.log("✓ Test query successful, result:", rows[0].result);

    await connection.end();
    console.log("✓ Connection closed successfully");

    console.log("\nDatabase setup completed successfully!");
  } catch (error) {
    console.error("Setup failed:", {
      message: error.message,
      code: error.code,
      errno: error.errno,
    });
  }
}

testConnection();
