const express = require("express");
const router = express.Router();
const {
  login,
  changePassword,
  updateProfile,
} = require("../services/authService");
const { createUser } = require("../services/userService");
const { authenticate } = require("../middleware/authenticate");
const { asyncHandler } = require("../middleware/errorHandler");
const { validateSignupPayload } = require("../utils/studentPayload");

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = await login(email, password);
    res.json(result);
  }),
);

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const {
      email,
      password,
      fullName,
      course,
      university,
      batch,
      agencyId,
      requiredHours,
      amStart,
      amEnd,
      pmStart,
      pmEnd,
      controlNumberId,
    } = req.body;

    const validationError = validateSignupPayload({
      email,
      password,
      fullName,
      batch,
      agencyId,
      controlNumberId,
      requiredHours,
      amStart,
      amEnd,
      pmStart,
      pmEnd,
    });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await createUser({
      email,
      password,
      fullName,
      course,
      university,
      batch,
      agencyId,
      requiredHours: requiredHours ? Number(requiredHours) : undefined,
      amStart,
      amEnd,
      pmStart,
      pmEnd,
      controlNumberId,
      role: "student",
      approvalStatus: "pending",
      ojtStatus: "pending",
    });
    res.status(201).json({
      message:
        "Account created. An admin will review and approve your registration before you can log in.",
      email: result.user.email,
    });
  }),
);

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req, res) => {
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

    await changePassword(req.user.userId, currentPassword, newPassword);
    res.json({ message: "Password changed successfully." });
  }),
);

router.patch(
  "/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const { fullName } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: "fullName is required." });
    }
    if (fullName.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "Full name must be at least 2 characters." });
    }

    const user = await updateProfile(req.user.userId, fullName.trim());
    res.json({ user });
  }),
);

module.exports = router;
