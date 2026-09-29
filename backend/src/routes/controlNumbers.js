const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  listControlNumbers,
  listAvailableControlNumbers,
  createControlNumber,
  deleteControlNumber,
} = require("../services/controlNumberService");

/**
 * GET /api/control-numbers/public — unauthenticated, lists only
 * control numbers not yet claimed by a student, for the signup
 * form's OJT Control Number dropdown. Must stay above the
 * authenticate/requireRole gate below, same as agencies/public.
 */
router.get(
  "/public",
  asyncHandler(async (req, res) => {
    const controlNumbers = await listAvailableControlNumbers();
    res.json(controlNumbers);
  }),
);

router.use(authenticate, requireRole("admin"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const controlNumbers = await listControlNumbers();
    res.json(controlNumbers);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { controlNumber } = req.body;

    if (!controlNumber) {
      return res.status(400).json({ error: "controlNumber is required." });
    }

    const created = await createControlNumber({ controlNumber });
    res.status(201).json(created);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteControlNumber(req.params.id);
    res.status(204).send();
  }),
);

module.exports = router;
