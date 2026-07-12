const pool = require("../config/db");

class AgencyError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function listAgencies() {
  const { rows } = await pool.query(
    `SELECT a.*, u.full_name AS in_charge_name,
            (SELECT COUNT(*) FROM student_profiles sp WHERE sp.agency_id = a.id) AS student_count
     FROM agencies a
     LEFT JOIN users u ON u.id = a.in_charge_id
     ORDER BY a.name ASC`,
  );
  return rows;
}

async function getAgencyById(id) {
  const { rows } = await pool.query(`SELECT * FROM agencies WHERE id = $1`, [
    id,
  ]);
  if (rows.length === 0) {
    throw new AgencyError("Agency not found.", 404);
  }
  return rows[0];
}

async function createAgency({
  name,
  address,
  latitude,
  longitude,
  radiusMeters,
  inChargeId,
}) {
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AgencyError("Invalid coordinates.", 400);
  }

  const { rows } = await pool.query(
    `INSERT INTO agencies (name, address, latitude, longitude, radius_meters, in_charge_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      name,
      address || null,
      latitude,
      longitude,
      radiusMeters || 100,
      inChargeId || null,
    ],
  );
  return rows[0];
}

/**
 * Updates an agency's fields. Uses explicit key-presence checks (not
 * COALESCE) so inChargeId can be intentionally cleared to null — e.g.
 * selecting "Unassigned" in the dropdown. COALESCE would have silently
 * ignored that null and kept the previous in-charge, which was a bug.
 */
async function updateAgency(id, updates) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  if ("name" in updates) {
    setClauses.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if ("address" in updates) {
    setClauses.push(`address = $${idx++}`);
    values.push(updates.address);
  }
  if ("latitude" in updates) {
    setClauses.push(`latitude = $${idx++}`);
    values.push(updates.latitude);
  }
  if ("longitude" in updates) {
    setClauses.push(`longitude = $${idx++}`);
    values.push(updates.longitude);
  }
  if ("radiusMeters" in updates) {
    setClauses.push(`radius_meters = $${idx++}`);
    values.push(updates.radiusMeters);
  }
  if ("inChargeId" in updates) {
    setClauses.push(`in_charge_id = $${idx++}`);
    values.push(updates.inChargeId);
  }

  if (setClauses.length === 0) {
    throw new AgencyError("Nothing to update.", 400);
  }

  values.push(id);

  const { rows } = await pool.query(
    `UPDATE agencies SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );
  if (rows.length === 0) {
    throw new AgencyError("Agency not found.", 404);
  }
  return rows[0];
}

async function deleteAgency(id) {
  // Blocked if students are still assigned — admin must reassign them first.
  const { rows: assigned } = await pool.query(
    `SELECT COUNT(*) FROM student_profiles WHERE agency_id = $1`,
    [id],
  );
  if (parseInt(assigned[0].count, 10) > 0) {
    throw new AgencyError(
      "Cannot delete an agency with students still assigned to it.",
      409,
    );
  }

  const { rowCount } = await pool.query(`DELETE FROM agencies WHERE id = $1`, [
    id,
  ]);
  if (rowCount === 0) {
    throw new AgencyError("Agency not found.", 404);
  }
}

module.exports = {
  listAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  deleteAgency,
  AgencyError,
};
