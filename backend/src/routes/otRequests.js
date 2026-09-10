const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const {
  createRequest,
  getTodayRequest,
  cancelRequest,
  OTRequestError,
} = require("../services/otRequestService");

router.use(authenticate, requireRole("student"));

// GET /api/ot-requests/today — today's overtime request (or null).
router.get("/today", async (req, res) => {
  try {
    const request = await getTodayRequest(req.user.studentId);
    res.json(request);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /api/ot-requests  { requestedStart, requestedEnd, reason }
router.post("/", async (req, res) => {
  const { requestedStart, requestedEnd, reason } = req.body;
  try {
    const request = await createRequest({
      studentId: req.user.studentId,
      requestedStart,
      requestedEnd,
      reason,
    });
    res.status(201).json(request);
  } catch (err) {
    handleError(err, res);
  }
});

// DELETE /api/ot-requests/:id — cancel own pending request.
router.delete("/:id", async (req, res) => {
  try {
    const request = await cancelRequest({
      studentId: req.user.studentId,
      requestId: req.params.id,
    });
    res.json(request);
  } catch (err) {
    handleError(err, res);
  }
});

function handleError(err, res) {
  if (err instanceof OTRequestError) {
    return res
      .status(err.statusCode)
      .json({ error: err.message, code: err.code || undefined });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

module.exports = router;
