const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const {
  listAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  deleteAgency,
  AgencyError,
} = require("../services/agencyService");

router.use(authenticate, requireRole("admin"));

router.get("/", async (req, res) => {
  try {
    const agencies = await listAgencies();
    res.json(agencies);
  } catch (err) {
    handleError(err, res);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const agency = await getAgencyById(req.params.id);
    res.json(agency);
  } catch (err) {
    handleError(err, res);
  }
});

router.post("/", async (req, res) => {
  const { name, address, latitude, longitude, radiusMeters, inChargeId } =
    req.body;

  if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
    return res
      .status(400)
      .json({ error: "name, latitude, and longitude are required." });
  }

  try {
    const agency = await createAgency({
      name,
      address,
      latitude,
      longitude,
      radiusMeters,
      inChargeId,
    });
    res.status(201).json(agency);
  } catch (err) {
    handleError(err, res);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const agency = await updateAgency(req.params.id, req.body);
    res.json(agency);
  } catch (err) {
    handleError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteAgency(req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
});

function handleError(err, res) {
  if (err instanceof AgencyError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

module.exports = router;
