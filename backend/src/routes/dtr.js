const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const { getMonthlyDTR, DTRError } = require("../services/dtrService");

/**
 * GET /api/dtr?month=YYYY-MM
 * Returns the logged-in student's own DTR for the given month.
 * Defaults to the current month if not specified.
 */
router.get("/", authenticate, requireRole("student"), async (req, res) => {
  const month = req.query.month || getCurrentMonthStr();

  try {
    const dtr = await getMonthlyDTR(req.user.studentId, month);
    res.json(dtr);
  } catch (err) {
    handleError(err, res);
  }
});

/**
 * GET /api/dtr/student/:studentId?month=YYYY-MM
 * Lets an admin or in-charge view any student's DTR (e.g. for review/certification).
 */
router.get(
  "/student/:studentId",
  authenticate,
  requireRole("admin", "in_charge"),
  async (req, res) => {
    const month = req.query.month || getCurrentMonthStr();

    try {
      const dtr = await getMonthlyDTR(req.params.studentId, month);
      res.json(dtr);
    } catch (err) {
      handleError(err, res);
    }
  },
);

function getCurrentMonthStr() {
  const now = new Date();
  const manilaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  return manilaStr; // en-CA gives YYYY-MM when only year+month requested
}

function handleError(err, res) {
  if (err instanceof DTRError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

module.exports = router;
