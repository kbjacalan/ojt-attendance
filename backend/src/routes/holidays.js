const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const {
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  HolidayError,
} = require("../services/holidayService");

router.use(authenticate, requireRole("admin"));

// GET /api/holidays?year=2026
router.get("/", async (req, res) => {
  try {
    const holidays = await listHolidays(req.query.year);
    res.json(holidays);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/holidays  { holidayDate: 'YYYY-MM-DD', name, isNational }
router.post("/", async (req, res) => {
  const { holidayDate, name, isNational } = req.body;
  if (!holidayDate || !name) {
    return res
      .status(400)
      .json({ error: "holidayDate and name are required." });
  }
  try {
    const holiday = await createHoliday({ holidayDate, name, isNational });
    res.status(201).json(holiday);
  } catch (err) {
    handleError(err, res);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const holiday = await updateHoliday(req.params.id, req.body);
    res.json(holiday);
  } catch (err) {
    handleError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteHoliday(req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
});

function handleError(err, res) {
  if (err instanceof HolidayError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

module.exports = router;
