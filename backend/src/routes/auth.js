const express = require("express");
const router = express.Router();
const { login, changePassword, AuthError } = require("../services/authService");
const { createUser, UserError } = require("../services/userService");
const { authenticate } = require("../middleware/authenticate");

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
    agencyId,
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
  if (!agencyId) {
    return res.status(400).json({ error: "Please select your OJT agency." });
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
      agencyId,
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

/**
 * POST /api/auth/change-password — self-service password change for the
 * logged-in user, regardless of role. Requires the current password for
 * verification (checked in authService.changePassword) before a new one
 * can be set, so a hijacked/left-open session alone isn't enough to
 * lock the real owner out of their own account.
 */
router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "currentPassword and newPassword are required." });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "New password must be at least 8 characters." });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({
      error: "New password must be different from your current password.",
    });
  }

  try {
    await changePassword(req.user.userId, currentPassword, newPassword);
    res.json({ message: "Password changed successfully." });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
