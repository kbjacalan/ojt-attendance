const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} = require("../services/holidayService");
const { isDateString } = require("../utils/validators");

router.use(authenticate, requireRole("admin"));

// GET /api/holidays?year=2026
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const holidays = await listHolidays(req.query.year);
    res.json(holidays);
  }),
);

// POST /api/holidays  { holidayDate: 'YYYY-MM-DD', name, isNational }
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { holidayDate, name, isNational } = req.body;
    if (!holidayDate || !name) {
      return res
        .status(400)
        .json({ error: "holidayDate and name are required." });
    }
    const holiday = await createHoliday({ holidayDate, name, isNational });
    res.status(201).json(holiday);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { holidayDate } = req.body;
    if (holidayDate !== undefined && !isDateString(holidayDate)) {
      return res
        .status(400)
        .json({ error: "holidayDate must be in YYYY-MM-DD format." });
    }
    const holiday = await updateHoliday(req.params.id, req.body);
    res.json(holiday);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteHoliday(req.params.id);
    res.status(204).send();
  }),
);

module.exports = router;
