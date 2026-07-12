const pool = require("../config/db");

class HolidayError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function listHolidays(year) {
  if (year) {
    const { rows } = await pool.query(
      `SELECT * FROM holidays WHERE EXTRACT(YEAR FROM holiday_date) = $1 ORDER BY holiday_date ASC`,
      [year],
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT * FROM holidays ORDER BY holiday_date ASC`,
  );
  return rows;
}

async function createHoliday({ holidayDate, name, isNational }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO holidays (holiday_date, name, is_national)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [holidayDate, name, isNational !== false],
    );
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      throw new HolidayError(
        "A holiday is already recorded for this date.",
        409,
      );
    }
    throw err;
  }
}

async function updateHoliday(id, { holidayDate, name, isNational }) {
  const { rows } = await pool.query(
    `UPDATE holidays
     SET holiday_date = COALESCE($1, holiday_date),
         name = COALESCE($2, name),
         is_national = COALESCE($3, is_national)
     WHERE id = $4
     RETURNING *`,
    [holidayDate, name, isNational, id],
  );
  if (rows.length === 0) {
    throw new HolidayError("Holiday not found.", 404);
  }
  return rows[0];
}

async function deleteHoliday(id) {
  const { rowCount } = await pool.query(`DELETE FROM holidays WHERE id = $1`, [
    id,
  ]);
  if (rowCount === 0) {
    throw new HolidayError("Holiday not found.", 404);
  }
}

module.exports = {
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  HolidayError,
};
