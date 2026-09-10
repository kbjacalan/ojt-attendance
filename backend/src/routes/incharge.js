const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const {
  listMyStudents,
  getStudentDTRForReview,
  certifyDTR,
  uncertifyDTR,
  InChargeError,
} = require("../services/inChargeService");
const {
  listPendingForInCharge,
  approveRequest,
  rejectRequest,
  OTRequestError,
} = require("../services/otRequestService");

router.use(authenticate, requireRole("in_charge"));

// GET /api/incharge/students?date=YYYY-MM-DD — list students assigned to
// this in-charge's agency, with attendance status for the given date
// (defaults to today if not provided).
router.get("/students", async (req, res) => {
  const { date } = req.query;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res
      .status(400)
      .json({ error: "date must be in YYYY-MM-DD format." });
  }
  try {
    const students = await listMyStudents(req.user.userId, date);
    res.json(students);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/incharge/students/:studentId/dtr?month=YYYY-MM
router.get("/students/:studentId/dtr", async (req, res) => {
  const month = req.query.month || getCurrentMonthStr();

  try {
    const dtr = await getStudentDTRForReview(
      req.params.studentId,
      month,
      req.user.userId,
    );
    res.json(dtr);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/incharge/students/:studentId/certify  { month: 'YYYY-MM', signature: 'data:image/png;base64,...' }
router.post("/students/:studentId/certify", async (req, res) => {
  const { month, signature } = req.body;
  if (!month) {
    return res.status(400).json({ error: "month (YYYY-MM) is required." });
  }
  if (!signature) {
    return res
      .status(400)
      .json({ error: "A signature is required to certify this DTR." });
  }

  try {
    const result = await certifyDTR(
      req.params.studentId,
      month,
      req.user.userId,
      signature,
    );
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/incharge/students/:studentId/uncertify  { month: 'YYYY-MM' }
router.post("/students/:studentId/uncertify", async (req, res) => {
  const { month } = req.body;
  if (!month) {
    return res.status(400).json({ error: "month (YYYY-MM) is required." });
  }

  try {
    const result = await uncertifyDTR(
      req.params.studentId,
      month,
      req.user.userId,
    );
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/incharge/ot-requests — pending overtime requests for
// students under this in-charge's agencies, oldest first.
router.get("/ot-requests", async (req, res) => {
  try {
    const requests = await listPendingForInCharge(req.user.userId);
    res.json(requests);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/incharge/ot-requests/:id/approve  { approvedStart?, approvedEnd?, note? }
router.post("/ot-requests/:id/approve", async (req, res) => {
  const { approvedStart, approvedEnd, note } = req.body;
  try {
    const request = await approveRequest({
      requestId: req.params.id,
      inChargeUserId: req.user.userId,
      approvedStart,
      approvedEnd,
      note,
    });
    res.json(request);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/incharge/ot-requests/:id/reject  { note }
router.post("/ot-requests/:id/reject", async (req, res) => {
  try {
    const request = await rejectRequest({
      requestId: req.params.id,
      inChargeUserId: req.user.userId,
      note: req.body.note,
    });
    res.json(request);
  } catch (err) {
    handleError(err, res);
  }
});

function getCurrentMonthStr() {
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

function handleError(err, res) {
  if (err instanceof InChargeError || err instanceof OTRequestError) {
    return res
      .status(err.statusCode)
      .json({ error: err.message, code: err.code || undefined });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

module.exports = router;
