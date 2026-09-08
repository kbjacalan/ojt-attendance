const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const {
  listControlNumbers,
  listAvailableControlNumbers,
  createControlNumber,
  deleteControlNumber,
  ControlNumberError,
} = require("../services/controlNumberService");

/**
 * GET /api/control-numbers/public — unauthenticated, lists only
 * control numbers not yet claimed by a student, for the signup
 * form's OJT Control Number dropdown. Must stay above the
 * authenticate/requireRole gate below, same as agencies/public.
 */
router.get("/public", async (req, res) => {
  try {
    const controlNumbers = await listAvailableControlNumbers();
    res.json(controlNumbers);
  } catch (err) {
    handleError(err, res);
  }
});

router.use(authenticate, requireRole("admin"));

router.get("/", async (req, res) => {
  try {
    const controlNumbers = await listControlNumbers();
    res.json(controlNumbers);
  } catch (err) {
    handleError(err, res);
  }
});

router.post("/", async (req, res) => {
  const { controlNumber } = req.body;

  if (!controlNumber) {
    return res.status(400).json({ error: "controlNumber is required." });
  }

  try {
    const created = await createControlNumber({ controlNumber });
    res.status(201).json(created);
  } catch (err) {
    handleError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteControlNumber(req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
});

function handleError(err, res) {
  if (err instanceof ControlNumberError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

module.exports = router;
