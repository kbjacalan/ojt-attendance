const { validateOfficialHours } = require("./officialHours");
const {
  isBatch,
  isOptionalPositiveNumber,
} = require("./validators");

function validateBatchField(batch, { required = true } = {}) {
  if (!batch) {
    return required ? "batch (your OJT month/year) is required." : null;
  }
  if (!isBatch(batch)) {
    return "batch must be in YYYY-MM format.";
  }
  return null;
}

function validateRequiredHoursField(requiredHours) {
  if (!isOptionalPositiveNumber(requiredHours)) {
    return "requiredHours must be a positive number.";
  }
  return null;
}

function validateSignupPayload({
  email,
  password,
  fullName,
  batch,
  agencyId,
  controlNumberId,
  requiredHours,
  amStart,
  amEnd,
  pmStart,
  pmEnd,
}) {
  if (!email || !password || !fullName) {
    return "email, password, and fullName are required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  const batchError = validateBatchField(batch, { required: true });
  if (batchError) return batchError;
  if (!agencyId) {
    return "Please select your OJT agency.";
  }
  if (!controlNumberId) {
    return "Please select your OJT control number.";
  }
  const hoursError = validateRequiredHoursField(requiredHours);
  if (hoursError) return hoursError;
  return validateOfficialHours({ amStart, amEnd, pmStart, pmEnd });
}

module.exports = {
  validateBatchField,
  validateRequiredHoursField,
  validateSignupPayload,
};
