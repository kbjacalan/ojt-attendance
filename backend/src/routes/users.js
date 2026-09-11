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

router.use(authenticate, requireRole("admin"));

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

router.get("/staff", async (req, res) => {
  try {
    const staff = await listStaff();
    res.json(staff);
  } catch (err) {
    handleError(err, res);
  }
});

router.patch("/staff/:userId", async (req, res) => {
  try {
    const updated = await updateStaffAccount(req.params.userId, req.body);
    res.json(updated);
  } catch (err) {
    handleError(err, res);
  }
});

router.delete("/staff/:userId", async (req, res) => {
  try {
    await deleteStaffAccount(req.params.userId);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
});

router.post("/", async (req, res) => {
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
  if (batch && !/^\d{4}-\d{2}$/.test(batch)) {
    return res.status(400).json({ error: "batch must be in YYYY-MM format." });
  }
  if (
    role === "student" &&
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
  } catch (err) {
    handleError(err, res);
  }
});

router.patch("/students/:studentId", async (req, res) => {
  if (
    "batch" in req.body &&
    req.body.batch &&
    !/^\d{4}-\d{2}$/.test(req.body.batch)
  ) {
    return res.status(400).json({ error: "batch must be in YYYY-MM format." });
  }
  if (
    "requiredHours" in req.body &&
    req.body.requiredHours !== undefined &&
    req.body.requiredHours !== null &&
    req.body.requiredHours !== "" &&
    (isNaN(Number(req.body.requiredHours)) ||
      Number(req.body.requiredHours) <= 0)
  ) {
    return res
      .status(400)
      .json({ error: "requiredHours must be a positive number." });
  }
  try {
    const updated = await updateStudentProfile(req.params.studentId, req.body);
    res.json(updated);
  } catch (err) {
    handleError(err, res);
  }
});

router.delete("/students/:studentId", async (req, res) => {
  try {
    await deleteStudent(req.params.studentId);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
});

router.post("/students/:studentId/approve", async (req, res) => {
  try {
    const result = await approveStudent(req.params.studentId);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

router.post("/students/:studentId/reject", async (req, res) => {
  try {
    const result = await rejectStudent(req.params.studentId);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

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
