/**
 * Run manually to create accounts, e.g.:
 *   node scripts/createUser.js
 *
 * This is a stopgap until you build an admin UI for account creation.
 * Edit the values below, run once per account you need to create.
 */
require("dotenv").config();
const pool = require("../src/config/db");
const { hashPassword } = require("../src/services/authService");

async function createUser({ email, password, fullName, role }) {
  const passwordHash = await hashPassword(password);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role`,
    [email.toLowerCase().trim(), passwordHash, fullName, role],
  );

  console.log("User created:", rows[0]);
  return rows[0];
}

async function main() {
  // EDIT THESE VALUES before running
  const user = await createUser({
    email: "marc@example.com",
    password: "marc",
    fullName: "MArc Ballares",
    role: "in_charge", // 'student' | 'in_charge' | 'admin'
  });

  // If creating a student, you also need a matching student_profiles row:
  if (user.role === "student") {
    await pool.query(
      `INSERT INTO student_profiles (user_id, course, agency_id, required_hours)
       VALUES ($1, $2, $3, $4)`,
      [
        user.id,
        "BSIT",
        null /* set agency UUID once CAAP is registered */,
        486,
      ],
    );
    console.log("Student profile created for", user.email);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
