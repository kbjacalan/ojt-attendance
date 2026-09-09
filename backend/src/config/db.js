const { Pool } = require("pg");

// Uses standard PG* env vars, or set connectionString directly.
// Example .env:
//   DATABASE_URL=postgresql://user:password@localhost:5432/ojt_attendance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
