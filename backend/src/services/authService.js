const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "8h"; // students stay logged in for a work day

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Add it to your .env file.");
}

class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Verifies email/password and returns a signed JWT plus basic user info.
 * For students, also includes their student_profiles.id (studentId),
 * since that's what the attendance endpoints key off of.
 */
async function login(email, password) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.is_active, u.approval_status,
            sp.id AS student_profile_id
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.email = $1`,
    [email.toLowerCase().trim()],
  );

  if (rows.length === 0) {
    throw new AuthError("Invalid email or password.");
  }

  const user = rows[0];

  if (user.approval_status === "pending") {
    throw new AuthError(
      "Your account is pending admin approval. Please check back later.",
      403,
    );
  }
  if (user.approval_status === "rejected") {
    throw new AuthError(
      "Your registration was not approved. Please contact your OJT coordinator.",
      403,
    );
  }

  if (!user.is_active) {
    throw new AuthError(
      "This account has been deactivated. Contact your OJT coordinator.",
      403,
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AuthError("Invalid email or password.");
  }

  const payload = {
    userId: user.id,
    role: user.role,
    studentId: user.student_profile_id || null,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      studentId: user.student_profile_id || null,
    },
  };
}

/**
 * Hashes a plaintext password for storage. Used when creating accounts
 * (admin creating student/in-charge accounts, or a registration flow).
 */
async function hashPassword(plainPassword) {
  const SALT_ROUNDS = 12;
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Self-service password change for any authenticated user (student,
 * in-charge, or admin). Requires the current password to be re-verified
 * before setting the new one — this is a security-sensitive action,
 * so it deliberately doesn't trust the JWT alone the way most other
 * "am I allowed to do this" checks in the app do.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await pool.query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId],
  );
  if (rows.length === 0) {
    throw new AuthError("User not found.", 404);
  }

  const passwordMatches = await bcrypt.compare(
    currentPassword,
    rows[0].password_hash,
  );
  if (!passwordMatches) {
    throw new AuthError("Current password is incorrect.", 401);
  }

  const newHash = await hashPassword(newPassword);
  await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
    [newHash, userId],
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new AuthError("Invalid or expired session. Please log in again.");
  }
}

module.exports = {
  login,
  hashPassword,
  changePassword,
  verifyToken,
  AuthError,
};
