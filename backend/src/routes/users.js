const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
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
  UserError,
} = require("../services/userService");

// All routes here require a logged-in admin
router.use(authenticate, requireRole("admin"));

// GET /api/users/students?date=YYYY-MM-DD — list all students for the
// admin table, with attendance status for the given date (defaults
// to today if not provided).
router.get("/students", async (req, res) => {
  const { date } = req.query;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res
      .status(400)
      .json({ error: "date must be in YYYY-MM-DD format." });
  }
  try {
    const students = await listStudents(date);
    res.json(students);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/users/staff — list in-charge/admin accounts
router.get("/staff", async (req, res) => {
  try {
    const staff = await listStaff();
    res.json(staff);
  } catch (err) {
    handleError(err, res);
  }
});

// PATCH /api/users/staff/:userId — update an in-charge account's name/email
router.patch("/staff/:userId", async (req, res) => {
  try {
    const updated = await updateStaffAccount(req.params.userId, req.body);
    res.json(updated);
  } catch (err) {
    handleError(err, res);
  }
});

// DELETE /api/users/staff/:userId — permanently deletes an in-charge account.
// Safe compared to student deletion: agencies.in_charge_id and
// dtr_periods.certified_by are ON DELETE SET NULL, so no attendance
// or DTR data is destroyed.
router.delete("/staff/:userId", async (req, res) => {
  try {
    await deleteStaffAccount(req.params.userId);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/users — create a new account (student, in_charge, or admin)
router.post("/", async (req, res) => {
  const {
    email,
    password,
    fullName,
    role,
    course,
    agencyId,
    requiredHours,
    officialHoursText,
    university,
    batch,
    ojtStatus,
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
  if (batch && !/^\d{4}-\d{2}$/.test(batch)) {
    return res.status(400).json({ error: "batch must be in YYYY-MM format." });
  }

  try {
    const result = await createUser({
      email,
      password,
      fullName,
      role,
      course,
      agencyId,
      requiredHours,
      officialHoursText,
      university,
      batch,
      ojtStatus,
    });
    res.status(201).json(result);
  } catch (err) {
    handleError(err, res);
  }
});

// PATCH /api/users/students/:studentId — update a student's agency/course/hours
router.patch("/students/:studentId", async (req, res) => {
  if (
    "batch" in req.body &&
    req.body.batch &&
    !/^\d{4}-\d{2}$/.test(req.body.batch)
  ) {
    return res.status(400).json({ error: "batch must be in YYYY-MM format." });
  }
  try {
    const updated = await updateStudentProfile(req.params.studentId, req.body);
    res.json(updated);
  } catch (err) {
    handleError(err, res);
  }
});

// DELETE /api/users/students/:studentId — permanently deletes the student
// account AND all their attendance/DTR history (cascading delete).
router.delete("/students/:studentId", async (req, res) => {
  try {
    await deleteStudent(req.params.studentId);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/users/students/:studentId/approve — approves a self-signed-up
// student, letting them log in for the first time.
router.post("/students/:studentId/approve", async (req, res) => {
  try {
    const result = await approveStudent(req.params.studentId);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/users/students/:studentId/reject — rejects a self-signed-up
// student's registration. Account is kept (not deleted) with status
// 'rejected', blocking their login with a clear message.
router.post("/students/:studentId/reject", async (req, res) => {
  try {
    const result = await rejectStudent(req.params.studentId);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

// PATCH /api/users/:userId/status — activate/deactivate an account
router.patch("/:userId/status", async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive (boolean) is required." });
  }
  try {
    const updated = await setUserActiveStatus(req.params.userId, isActive);
    res.json(updated);
  } catch (err) {
    handleError(err, res);
  }
});

function handleError(err, res) {
  if (err instanceof UserError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

module.exports = router;
