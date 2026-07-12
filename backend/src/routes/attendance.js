const express = require("express");
const router = express.Router();
const {
  timeIn,
  timeOut,
  correctAttendanceLog,
  getMyAgencyGeofence,
  AttendanceError,
} = require("../services/attendanceService");
const {
  assertStudentBelongsToInCharge,
  InChargeError,
} = require("../services/inChargeService");
const { authenticate, requireRole } = require("../middleware/authenticate");

function validateCoordinates(req, res, next) {
  const { latitude, longitude } = req.body;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res
      .status(400)
      .json({ error: "latitude and longitude (numbers) are required." });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "Invalid coordinate values." });
  }
  next();
}

function validatePeriod(req, res, next) {
  const { period } = req.body;
  if (!["morning", "afternoon"].includes(period)) {
    return res
      .status(400)
      .json({ error: "period must be 'morning' (AM) or 'afternoon' (PM)." });
  }
  next();
}

const PERIOD_LABEL = { morning: "AM", afternoon: "PM" };

router.post(
  "/time-in",
  authenticate,
  requireRole("student"),
  validateCoordinates,
  validatePeriod,
  async (req, res) => {
    try {
      const result = await timeIn({
        studentId: req.user.studentId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        period: req.body.period,
      });
      res.json({
        message: `Timed in successfully (${PERIOD_LABEL[result.period]}).`,
        distanceMeters: result.distanceMeters,
        log: result.log,
      });
    } catch (err) {
      handleError(err, res);
    }
  },
);

router.post(
  "/time-out",
  authenticate,
  requireRole("student"),
  validateCoordinates,
  validatePeriod,
  async (req, res) => {
    try {
      const result = await timeOut({
        studentId: req.user.studentId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        period: req.body.period,
      });
      res.json({
        message: `Timed out successfully (${PERIOD_LABEL[result.period]}).`,
        distanceMeters: result.distanceMeters,
        log: result.log,
      });
    } catch (err) {
      handleError(err, res);
    }
  },
);

/**
 * GET /api/attendance/my-agency — returns the logged-in student's
 * assigned agency's name, coordinates, and geofence radius. Used by
 * the Attendance page's live map (agency pin + radius circle) so the
 * student can see whether they're inside the geofence before punching.
 * Only exposes what's needed to render that — not the full agency
 * record (address, in-charge, etc.), which stays admin-only.
 */
router.get(
  "/my-agency",
  authenticate,
  requireRole("student"),
  async (req, res) => {
    try {
      const agency = await getMyAgencyGeofence(req.user.studentId);
      res.json(agency);
    } catch (err) {
      handleError(err, res);
    }
  },
);

/**
 * PATCH /api/attendance/:studentId/:date
 * date format: YYYY-MM-DD
 * body: { amIn, amOut, pmIn, pmOut, otIn, otOut (each "HH:MM" or null), remarks }
 *
 * Lets an in-charge (own students only) or admin (any student) manually
 * correct a day's attendance — missed time-outs, GPS rejections that
 * should have succeeded, or adding a forgotten record entirely.
 */
router.patch(
  "/:studentId/:date",
  authenticate,
  requireRole("in_charge", "admin"),
  async (req, res) => {
    const { studentId, date } = req.params;
    const { remarks, ...times } = req.body;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ error: "date must be in YYYY-MM-DD format." });
    }

    try {
      if (req.user.role === "in_charge") {
        await assertStudentBelongsToInCharge(studentId, req.user.userId);
      }

      const updatedLog = await correctAttendanceLog({
        studentId,
        dateStr: date,
        times,
        remarks,
        correctedByUserId: req.user.userId,
      });

      res.json({
        message: "Attendance corrected successfully.",
        log: updatedLog,
      });
    } catch (err) {
      handleError(err, res);
    }
  },
);

function handleError(err, res) {
  if (err instanceof AttendanceError || err instanceof InChargeError) {
    return res
      .status(err.statusCode)
      .json({ error: err.message, code: err.code || undefined });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

module.exports = router;
