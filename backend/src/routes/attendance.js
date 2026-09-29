const express = require("express");
const router = express.Router();
const {
  timeIn,
  timeOut,
  correctAttendanceLog,
  getMyAgencyGeofence,
} = require("../services/attendanceService");
const {
  assertStudentBelongsToInCharge,
} = require("../services/inChargeService");
const { authenticate, requireRole } = require("../middleware/authenticate");
const { asyncHandler } = require("../middleware/errorHandler");
const { isDateString } = require("../utils/validators");

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
  if (!["morning", "afternoon", "overtime"].includes(period)) {
    return res.status(400).json({
      error: "period must be 'morning' (AM), 'afternoon' (PM), or 'overtime' (OT).",
    });
  }
  next();
}

const PERIOD_LABEL = { morning: "AM", afternoon: "PM", overtime: "OT" };

router.post(
  "/time-in",
  authenticate,
  requireRole("student"),
  validateCoordinates,
  validatePeriod,
  asyncHandler(async (req, res) => {
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
  }),
);

router.post(
  "/time-out",
  authenticate,
  requireRole("student"),
  validateCoordinates,
  validatePeriod,
  asyncHandler(async (req, res) => {
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
  }),
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
  asyncHandler(async (req, res) => {
    const agency = await getMyAgencyGeofence(req.user.studentId);
    res.json(agency);
  }),
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
  asyncHandler(async (req, res) => {
    const { studentId, date } = req.params;
    const { remarks, ...times } = req.body;

    if (!isDateString(date)) {
      return res
        .status(400)
        .json({ error: "date must be in YYYY-MM-DD format." });
    }

    if (req.user.role === "in_charge") {
      await assertStudentBelongsToInCharge(studentId, req.user.userId);
    }

    const { warnings, ...updatedLog } = await correctAttendanceLog({
      studentId,
      dateStr: date,
      times,
      remarks,
      correctedByUserId: req.user.userId,
    });

    res.json({
      message: "Attendance corrected successfully.",
      log: updatedLog,
      warnings,
    });
  }),
);

module.exports = router;
