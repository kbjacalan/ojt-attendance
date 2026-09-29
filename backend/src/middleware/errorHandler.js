function logError(err, req) {
  const context = req
    ? `${req.method} ${req.originalUrl || req.url}`
    : "unknown route";
  console.error(`[${context}]`, err);
}

function errorHandler(err, req, res, next) {
  void next;
  if (res.headersSent) {
    return;
  }
  if (typeof err.statusCode === "number") {
    const body = { error: err.message || "Request failed." };
    if (err.code) body.code = err.code;
    return res.status(err.statusCode).json(body);
  }
  logError(err, req);
  return res.status(500).json({ error: "Internal server error." });
}

function notFoundHandler(req, res) {
  return res
    .status(404)
    .json({ error: `Not found: ${req.method} ${req.originalUrl || req.url}` });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, notFoundHandler, asyncHandler };
