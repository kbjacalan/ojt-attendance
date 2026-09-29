const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  listAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  deleteAgency,
} = require("../services/agencyService");

/**
 * GET /api/agencies/public — unauthenticated, minimal agency list
 * (id + name only) for the student signup form's Agency dropdown.
 * Must stay above the authenticate/requireRole gate below since this
 * is the only agency endpoint reachable before login. All agencies are
 * considered "active" — this app has no separate inactive/archived
 * state for agencies.
 */
router.get(
  "/public",
  asyncHandler(async (req, res) => {
    const agencies = await listAgencies();
    res.json(agencies.map((a) => ({ id: a.id, name: a.name })));
  }),
);

router.use(authenticate, requireRole("admin"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const agencies = await listAgencies();
    res.json(agencies);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const agency = await getAgencyById(req.params.id);
    res.json(agency);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, address, latitude, longitude, radiusMeters, inChargeId } =
      req.body;

    if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
      return res
        .status(400)
        .json({ error: "name, latitude, and longitude are required." });
    }

    const agency = await createAgency({
      name,
      address,
      latitude,
      longitude,
      radiusMeters,
      inChargeId,
    });
    res.status(201).json(agency);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const agency = await updateAgency(req.params.id, req.body);
    res.json(agency);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteAgency(req.params.id);
    res.status(204).send();
  }),
);

module.exports = router;
