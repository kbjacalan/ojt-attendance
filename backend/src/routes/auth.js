const express = require("express");
const router = express.Router();
const { login, AuthError } = require("../services/authService");
const { createUser, UserError } = require("../services/userService");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /api/auth/signup — public, unauthenticated student self-registration.
 * Creates the account with approval_status = 'pending'; they cannot log
 * in until an admin approves them. `role` is deliberately hardcoded to
 * 'student' here regardless of anything in the request body — this is
 * the only account-creation path that isn't behind admin auth, so it
 * must never be able to create an in_charge or admin account.
 */
router.post("/signup", async (req, res) => {
  const {
    email,
    password,
    fullName,
    course,
    university,
    batch,
    requiredHours,
    officialHoursText,
  } = req.body;

  if (!email || !password || !fullName) {
    return res
      .status(400)
      .json({ error: "email, password, and fullName are required." });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  }
  if (!batch || !/^\d{4}-\d{2}$/.test(batch)) {
    return res
      .status(400)
      .json({ error: "batch (your OJT month/year) is required." });
  }
  if (
    requiredHours !== undefined &&
    requiredHours !== null &&
    requiredHours !== "" &&
    (isNaN(Number(requiredHours)) || Number(requiredHours) <= 0)
  ) {
    return res
      .status(400)
      .json({ error: "requiredHours must be a positive number." });
  }

  try {
    const result = await createUser({
      email,
      password,
      fullName,
      course,
      university,
      batch,
      requiredHours: requiredHours ? Number(requiredHours) : undefined,
      officialHoursText,
      role: "student",
      approvalStatus: "pending",
      ojtStatus: "pending",
    });
    res.status(201).json({
      message:
        "Account created. An admin will review and approve your registration before you can log in.",
      email: result.user.email,
    });
  } catch (err) {
    if (err instanceof UserError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
