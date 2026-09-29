const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  listMyStudents,
  getStudentDTRForReview,
  assertStudentBelongsToInCharge,
  certifyDTR,
  uncertifyDTR,
} = require("../services/inChargeService");
const { getPunchedMonths } = require("../services/dtrService");
const {
  listPendingForInCharge,
  approveRequest,
  rejectRequest,
} = require("../services/otRequestService");
const { getCurrentMonthStr } = require("../utils/month");
const { isDateString } = require("../utils/validators");

router.use(authenticate, requireRole("in_charge"));

// GET /api/incharge/students?date=YYYY-MM-DD — list students assigned to
// this in-charge's agency, with attendance status for the given date
// (defaults to today if not provided).
router.get(
  "/students",
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (date && !isDateString(date)) {
      return res
        .status(400)
        .json({ error: "date must be in YYYY-MM-DD format." });
    }
    const students = await listMyStudents(req.user.userId, date);
    res.json(students);
  }),
);

// GET /api/incharge/students/:studentId/dtr/months — punched months for review
router.get(
  "/students/:studentId/dtr/months",
  asyncHandler(async (req, res) => {
    await assertStudentBelongsToInCharge(req.params.studentId, req.user.userId);
    const months = await getPunchedMonths(req.params.studentId);
    res.json({ months });
  }),
);

// GET /api/incharge/students/:studentId/dtr?month=YYYY-MM
router.get(
  "/students/:studentId/dtr",
  asyncHandler(async (req, res) => {
    const month = req.query.month || getCurrentMonthStr();
    const dtr = await getStudentDTRForReview(
      req.params.studentId,
      month,
      req.user.userId,
    );
    res.json(dtr);
  }),
);

// POST /api/incharge/students/:studentId/certify  { month: 'YYYY-MM', signature: 'data:image/png;base64,...' }
router.post(
  "/students/:studentId/certify",
  asyncHandler(async (req, res) => {
    const { month, signature } = req.body;
    if (!month) {
      return res.status(400).json({ error: "month (YYYY-MM) is required." });
    }
    if (!signature) {
      return res
        .status(400)
        .json({ error: "A signature is required to certify this DTR." });
    }
    const result = await certifyDTR(
      req.params.studentId,
      month,
      req.user.userId,
      signature,
    );
    res.json(result);
  }),
);

// POST /api/incharge/students/:studentId/uncertify  { month: 'YYYY-MM' }
router.post(
  "/students/:studentId/uncertify",
  asyncHandler(async (req, res) => {
    const { month } = req.body;
    if (!month) {
      return res.status(400).json({ error: "month (YYYY-MM) is required." });
    }
    const result = await uncertifyDTR(
      req.params.studentId,
      month,
      req.user.userId,
    );
    res.json(result);
  }),
);

// GET /api/incharge/ot-requests — pending overtime requests for
// students under this in-charge's agencies, oldest first.
router.get(
  "/ot-requests",
  asyncHandler(async (req, res) => {
    const requests = await listPendingForInCharge(req.user.userId);
    res.json(requests);
  }),
);

// POST /api/incharge/ot-requests/:id/approve  { approvedStart?, approvedEnd?, note? }
router.post(
  "/ot-requests/:id/approve",
  asyncHandler(async (req, res) => {
    const { approvedStart, approvedEnd, note } = req.body;
    const request = await approveRequest({
      requestId: req.params.id,
      inChargeUserId: req.user.userId,
      approvedStart,
      approvedEnd,
      note,
    });
    res.json(request);
  }),
);

// POST /api/incharge/ot-requests/:id/reject  { note }
router.post(
  "/ot-requests/:id/reject",
  asyncHandler(async (req, res) => {
    const request = await rejectRequest({
      requestId: req.params.id,
      inChargeUserId: req.user.userId,
      note: req.body.note,
    });
    res.json(request);
  }),
);

module.exports = router;
