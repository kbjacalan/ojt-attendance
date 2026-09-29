const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  createUser,
  listStudents,
  listStaff,
  updateStudentProfile,
  deleteStudent,
  approveStudent,
  rejectStudent,
  setUserActiveStatus,
  updateStaffAccount,
  deleteStaffAccount,
} = require("../services/userService");
const { isDateString } = require("../utils/validators");
const {
  validateBatchField,
  validateRequiredHoursField,
} = require("../utils/studentPayload");

router.use(authenticate, requireRole("admin"));

router.get(
  "/students",
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (date && !isDateString(date)) {
      return res
        .status(400)
        .json({ error: "date must be in YYYY-MM-DD format." });
    }
    const students = await listStudents(date);
    res.json(students);
  }),
);

router.get(
  "/staff",
  asyncHandler(async (req, res) => {
    const staff = await listStaff();
    res.json(staff);
  }),
);

router.patch(
  "/staff/:userId",
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (
      password !== undefined &&
      (typeof password !== "string" || password.length < 8)
    ) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters." });
    }
    const updated = await updateStaffAccount(req.params.userId, req.body);
    res.json(updated);
  }),
);

router.delete(
  "/staff/:userId",
  asyncHandler(async (req, res) => {
    await deleteStaffAccount(req.params.userId);
    res.status(204).send();
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      email,
      password,
      fullName,
      role,
      course,
      agencyId,
      requiredHours,
      amStart,
      amEnd,
      pmStart,
      pmEnd,
      university,
      batch,
      ojtStatus,
      controlNumberId,
    } = req.body;

    if (!email || !password || !fullName || !role) {
      return res
        .status(400)
        .json({ error: "email, password, fullName, and role are required." });
    }
    if (!["student", "in_charge", "admin"].includes(role)) {
      return res
        .status(400)
        .json({ error: "role must be student, in_charge, or admin." });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters." });
    }
    if (batch) {
      const batchError = validateBatchField(batch, { required: true });
      if (batchError) {
        return res
          .status(400)
          .json({ error: "batch must be in YYYY-MM format." });
      }
    }
    if (role === "student") {
      const hoursError = validateRequiredHoursField(requiredHours);
      if (
        requiredHours !== undefined &&
        requiredHours !== null &&
        requiredHours !== "" &&
        hoursError
      ) {
        return res
          .status(400)
          .json({ error: "requiredHours must be a positive number." });
      }
    }

    const result = await createUser({
      email,
      password,
      fullName,
      role,
      course,
      agencyId,
      requiredHours,
      amStart,
      amEnd,
      pmStart,
      pmEnd,
      university,
      batch,
      ojtStatus,
      controlNumberId,
    });
    res.status(201).json(result);
  }),
);

router.patch(
  "/students/:studentId",
  asyncHandler(async (req, res) => {
    if ("batch" in req.body && req.body.batch) {
      const batchError = validateBatchField(req.body.batch, { required: true });
      if (batchError) {
        return res
          .status(400)
          .json({ error: "batch must be in YYYY-MM format." });
      }
    }
    if ("requiredHours" in req.body) {
      const hoursError = validateRequiredHoursField(req.body.requiredHours);
      if (
        req.body.requiredHours !== undefined &&
        req.body.requiredHours !== null &&
        req.body.requiredHours !== "" &&
        hoursError
      ) {
        return res
          .status(400)
          .json({ error: "requiredHours must be a positive number." });
      }
    }
    const updated = await updateStudentProfile(req.params.studentId, req.body);
    res.json(updated);
  }),
);

router.delete(
  "/students/:studentId",
  asyncHandler(async (req, res) => {
    await deleteStudent(req.params.studentId);
    res.status(204).send();
  }),
);

router.post(
  "/students/:studentId/approve",
  asyncHandler(async (req, res) => {
    const result = await approveStudent(req.params.studentId);
    res.json(result);
  }),
);

router.post(
  "/students/:studentId/reject",
  asyncHandler(async (req, res) => {
    const result = await rejectStudent(req.params.studentId);
    res.json(result);
  }),
);

router.patch(
  "/:userId/status",
  asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive (boolean) is required." });
    }
    const updated = await setUserActiveStatus(req.params.userId, isActive);
    res.json(updated);
  }),
);

module.exports = router;
