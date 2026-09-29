const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const { asyncHandler } = require("../middleware/errorHandler");
const { getMonthlyDTR, getPunchedMonths } = require("../services/dtrService");
const { getCurrentMonthStr } = require("../utils/month");

/**
 * GET /api/dtr?month=YYYY-MM
 * Returns the logged-in student's own DTR for the given month.
 * Defaults to the current month if not specified.
 */
router.get(
  "/",
  authenticate,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const month = req.query.month || getCurrentMonthStr();
    const dtr = await getMonthlyDTR(req.user.studentId, month);
    res.json(dtr);
  }),
);

/**
 * GET /api/dtr/months
 * Lists months (YYYY-MM, newest first) where the logged-in student
 * has at least one punch record. Used to bound DTR month pickers.
 */
router.get(
  "/months",
  authenticate,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const months = await getPunchedMonths(req.user.studentId);
    res.json({ months });
  }),
);

/**
 * GET /api/dtr/student/:studentId/months
 * Lists punched months for any student (admin review).
 */
router.get(
  "/student/:studentId/months",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const months = await getPunchedMonths(req.params.studentId);
    res.json({ months });
  }),
);

/**
 * GET /api/dtr/student/:studentId?month=YYYY-MM
 * Lets an admin or in-charge view any student's DTR (e.g. for review/certification).
 */
router.get(
  "/student/:studentId",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const month = req.query.month || getCurrentMonthStr();
    const dtr = await getMonthlyDTR(req.params.studentId, month);
    res.json(dtr);
  }),
);

module.exports = router;
