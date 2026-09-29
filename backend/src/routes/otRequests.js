const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  createRequest,
  getTodayRequest,
  cancelRequest,
} = require("../services/otRequestService");

router.use(authenticate, requireRole("student"));

// GET /api/ot-requests/today — today's overtime request (or null).
router.get(
  "/today",
  asyncHandler(async (req, res) => {
    const request = await getTodayRequest(req.user.studentId);
    res.json(request);
  }),
);

// POST /api/ot-requests  { requestedStart, requestedEnd, reason }
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { requestedStart, requestedEnd, reason } = req.body;
    const request = await createRequest({
      studentId: req.user.studentId,
      requestedStart,
      requestedEnd,
      reason,
    });
    res.status(201).json(request);
  }),
);

// DELETE /api/ot-requests/:id — cancel own pending request.
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const request = await cancelRequest({
      studentId: req.user.studentId,
      requestId: req.params.id,
    });
    res.json(request);
  }),
);

module.exports = router;
