const pool = require("../config/db");

class ControlNumberError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function listControlNumbers() {
  const { rows } = await pool.query(
    `SELECT cn.*, sp.id AS student_id, u.full_name AS student_name
     FROM ojt_control_numbers cn
     LEFT JOIN student_profiles sp ON sp.control_number_id = cn.id
     LEFT JOIN users u ON u.id = sp.user_id
     ORDER BY cn.control_number ASC`,
  );
  return rows;
}

/**
 * Public, unauthenticated list for the signup form's dropdown — only
 * control numbers not already claimed by another student, so a
 * trainee can never pick one that's already in use.
 */
async function listAvailableControlNumbers() {
  const { rows } = await pool.query(
    `SELECT cn.id, cn.control_number
     FROM ojt_control_numbers cn
     LEFT JOIN student_profiles sp ON sp.control_number_id = cn.id
     WHERE sp.id IS NULL
     ORDER BY cn.control_number ASC`,
  );
  return rows;
}

async function createControlNumber({ controlNumber }) {
  if (!controlNumber || !controlNumber.trim()) {
    throw new ControlNumberError("controlNumber is required.", 400);
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO ojt_control_numbers (control_number)
       VALUES ($1)
       RETURNING *`,
      [controlNumber.trim()],
    );
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      throw new ControlNumberError(
        "This control number already exists.",
        409,
      );
    }
    throw err;
  }
}

async function deleteControlNumber(id) {
  // Blocked if a student is still using it — admin must reassign the
  // student to a different control number first.
  const { rows: assigned } = await pool.query(
    `SELECT COUNT(*) FROM student_profiles WHERE control_number_id = $1`,
    [id],
  );
  if (parseInt(assigned[0].count, 10) > 0) {
    throw new ControlNumberError(
      "Cannot delete a control number that's assigned to a student.",
      409,
    );
  }

  const { rowCount } = await pool.query(
    `DELETE FROM ojt_control_numbers WHERE id = $1`,
    [id],
  );
  if (rowCount === 0) {
    throw new ControlNumberError("Control number not found.", 404);
  }
}

module.exports = {
  listControlNumbers,
  listAvailableControlNumbers,
  createControlNumber,
  deleteControlNumber,
  ControlNumberError,
};
