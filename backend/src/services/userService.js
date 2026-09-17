const pool = require("../config/db");
const { hashPassword } = require("./authService");
const { getManilaDateString } = require("../utils/time");
const { computeDutyStatus } = require("../utils/duty");
const {
  TIME_FIELDS,
  validateOfficialHours,
} = require("../utils/officialHours");

class UserError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function createUser({
  email,
  password,
  fullName,
  role,
  course,
  agencyId,
  requiredHours,
  amStart,
  amEnd,
  pmStart,
  pmEnd,
  approvalStatus,
  university,
  batch,
  ojtStatus,
  controlNumberId,
}) {
  if (role === "student") {
    const officialHoursError = validateOfficialHours({
      amStart,
      amEnd,
      pmStart,
      pmEnd,
    });
    if (officialHoursError) {
      throw new UserError(officialHoursError, 400);
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const passwordHash = await hashPassword(password);

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, is_active, approval_status, created_at`,
      [
        email.toLowerCase().trim(),
        passwordHash,
        fullName,
        role,
        approvalStatus || "approved",
      ],
    );
    const user = userResult.rows[0];

    let studentProfile = null;

    if (role === "student") {
      const profileResult = await client.query(
        `INSERT INTO student_profiles
           (user_id, course, agency_id, required_hours, am_start, am_end, pm_start, pm_end, university, batch, ojt_status, control_number_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, course, agency_id, required_hours, am_start, am_end, pm_start, pm_end, qr_token, university, batch, ojt_status, control_number_id`,
        [
          user.id,
          course || null,
          agencyId || null,
          requiredHours || 486,
          amStart,
          amEnd,
          pmStart,
          pmEnd,
          university || null,
          batch || null,
          ojtStatus || "active",
          controlNumberId || null,
        ],
      );
      studentProfile = profileResult.rows[0];
    }

    if (role === "in_charge" && agencyId) {
      const agencyResult = await client.query(
        `UPDATE agencies SET in_charge_id = $1 WHERE id = $2 RETURNING id`,
        [user.id, agencyId],
      );
      if (agencyResult.rows.length === 0) {
        throw new UserError("Selected agency not found.", 400);
      }
    }

    await client.query("COMMIT");

    return { user, studentProfile };
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      if (err.constraint && err.constraint.includes("control_number")) {
        throw new UserError(
          "This control number is already assigned to another student.",
          409,
        );
      }
      throw new UserError("An account with this email already exists.", 409);
    }
    if (err.code === "23503") {
      throw new UserError("Selected agency not found.", 400);
    }
    throw err;
  } finally {
    client.release();
  }
}

async function syncOjtStatus(studentId) {
  const { rows } = await pool.query(
    `SELECT sp.ojt_status, sp.required_hours,
            COALESCE(SUM(al.total_hours), 0) AS cumulative_hours
     FROM student_profiles sp
     LEFT JOIN attendance_logs al ON al.student_id = sp.id
     WHERE sp.id = $1
     GROUP BY sp.id, sp.ojt_status, sp.required_hours`,
    [studentId],
  );
  if (rows.length === 0) return null;

  const { ojt_status, required_hours, cumulative_hours } = rows[0];
  const requiredHours = parseFloat(required_hours);
  const cumulativeHours = parseFloat(cumulative_hours);
  const meetsRequirement =
    requiredHours > 0 && cumulativeHours >= requiredHours;

  let nextStatus = null;
  if (ojt_status === "pending" && cumulativeHours > 0) {
    nextStatus = meetsRequirement ? "completed" : "active";
  } else if (ojt_status === "active" && meetsRequirement) {
    nextStatus = "completed";
  } else if (ojt_status === "completed" && cumulativeHours < requiredHours) {
    nextStatus = "active";
  }

  if (nextStatus) {
    await pool.query(
      `UPDATE student_profiles SET ojt_status = $1 WHERE id = $2`,
      [nextStatus, studentId],
    );
    return nextStatus;
  }
  return ojt_status;
}

async function listStudents(dateStr) {
  const targetDate = dateStr || getManilaDateString();

  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.email, u.full_name, u.is_active, u.approval_status, u.created_at,
            sp.id AS student_id, sp.course, sp.required_hours,
            sp.am_start, sp.am_end, sp.pm_start, sp.pm_end,
            sp.university, sp.batch, sp.ojt_status,
            a.id AS agency_id, a.name AS agency_name,
            cn.id AS control_number_id, cn.control_number,
            al.am_time_in, al.am_time_out, al.pm_time_in, al.pm_time_out,
            al.ot_time_in, al.ot_time_out,
            COALESCE(totals.cumulative_hours, 0) AS cumulative_hours
     FROM users u
     JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN agencies a ON a.id = sp.agency_id
     LEFT JOIN ojt_control_numbers cn ON cn.id = sp.control_number_id
     LEFT JOIN attendance_logs al ON al.student_id = sp.id AND al.log_date = $1
     LEFT JOIN (
       SELECT student_id, SUM(total_hours) AS cumulative_hours
       FROM attendance_logs
       GROUP BY student_id
     ) totals ON totals.student_id = sp.id
     WHERE u.role = 'student'
     ORDER BY u.full_name ASC`,
    [targetDate],
  );

  return rows.map((row) => {
    const {
      am_time_in,
      am_time_out,
      pm_time_in,
      pm_time_out,
      ot_time_in,
      ot_time_out,
      cumulative_hours,
      ...rest
    } = row;
    const duty = computeDutyStatus(row);
    return {
      ...rest,
      cumulative_hours:
        Math.round((parseFloat(cumulative_hours) || 0) * 100) / 100,
      ...duty,
    };
  });
}

async function listStaff() {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
            STRING_AGG(a.name, ', ' ORDER BY a.name) AS agency_names,
            (ARRAY_AGG(a.id ORDER BY a.name))[1] AS agency_id
     FROM users u
     LEFT JOIN agencies a ON a.in_charge_id = u.id
     WHERE u.role IN ('in_charge', 'admin')
     GROUP BY u.id, u.email, u.full_name, u.role, u.is_active, u.created_at
     ORDER BY u.full_name ASC`,
  );
  return rows;
}

async function updateStudentProfile(studentId, updates) {
  const touchesOfficialHours = TIME_FIELDS.some((field) => field in updates);
  if (touchesOfficialHours) {
    const missing = TIME_FIELDS.filter((field) => !(field in updates));
    if (missing.length > 0) {
      throw new UserError(
        `Official hours must be updated together. Missing: ${missing.join(", ")}.`,
        400,
      );
    }
    const officialHoursError = validateOfficialHours({
      amStart: updates.amStart,
      amEnd: updates.amEnd,
      pmStart: updates.pmStart,
      pmEnd: updates.pmEnd,
    });
    if (officialHoursError) {
      throw new UserError(officialHoursError, 400);
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const profileRes = await client.query(
      `SELECT user_id FROM student_profiles WHERE id = $1`,
      [studentId],
    );
    if (profileRes.rows.length === 0) {
      throw new UserError("Student not found.", 404);
    }
    const userId = profileRes.rows[0].user_id;

    if ("fullName" in updates || "email" in updates) {
      const setClauses = [];
      const values = [];
      let idx = 1;
      if ("fullName" in updates) {
        setClauses.push(`full_name = $${idx++}`);
        values.push(updates.fullName);
      }
      if ("email" in updates) {
        setClauses.push(`email = $${idx++}`);
        values.push(updates.email.toLowerCase().trim());
      }
      values.push(userId);
      await client.query(
        `UPDATE users SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $${idx}`,
        values,
      );
    }

    const profileSetClauses = [];
    const profileValues = [];
    let pIdx = 1;
    if ("agencyId" in updates) {
      profileSetClauses.push(`agency_id = $${pIdx++}`);
      profileValues.push(updates.agencyId);
    }
    if ("course" in updates) {
      profileSetClauses.push(`course = $${pIdx++}`);
      profileValues.push(updates.course);
    }
    if ("requiredHours" in updates) {
      profileSetClauses.push(`required_hours = $${pIdx++}`);
      profileValues.push(updates.requiredHours);
    }
    if (touchesOfficialHours) {
      profileSetClauses.push(`am_start = $${pIdx++}`);
      profileValues.push(updates.amStart);
      profileSetClauses.push(`am_end = $${pIdx++}`);
      profileValues.push(updates.amEnd);
      profileSetClauses.push(`pm_start = $${pIdx++}`);
      profileValues.push(updates.pmStart);
      profileSetClauses.push(`pm_end = $${pIdx++}`);
      profileValues.push(updates.pmEnd);
    }
    if ("university" in updates) {
      profileSetClauses.push(`university = $${pIdx++}`);
      profileValues.push(updates.university);
    }
    if ("batch" in updates) {
      profileSetClauses.push(`batch = $${pIdx++}`);
      profileValues.push(updates.batch);
    }
    if ("ojtStatus" in updates) {
      profileSetClauses.push(`ojt_status = $${pIdx++}`);
      profileValues.push(updates.ojtStatus);
    }
    if ("controlNumberId" in updates) {
      profileSetClauses.push(`control_number_id = $${pIdx++}`);
      profileValues.push(updates.controlNumberId);
    }

    let updatedProfile;
    if (profileSetClauses.length > 0) {
      profileValues.push(studentId);
      const result = await client.query(
        `UPDATE student_profiles SET ${profileSetClauses.join(", ")} WHERE id = $${pIdx} RETURNING *`,
        profileValues,
      );
      updatedProfile = result.rows[0];
    } else {
      const result = await client.query(
        `SELECT * FROM student_profiles WHERE id = $1`,
        [studentId],
      );
      updatedProfile = result.rows[0];
    }

    await client.query("COMMIT");

    if ("requiredHours" in updates && !("ojtStatus" in updates)) {
      await syncOjtStatus(studentId);
      const refreshed = await pool.query(
        `SELECT * FROM student_profiles WHERE id = $1`,
        [studentId],
      );
      return refreshed.rows[0];
    }

    return updatedProfile;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      if (err.constraint && err.constraint.includes("control_number")) {
        throw new UserError(
          "This control number is already assigned to another student.",
          409,
        );
      }
      throw new UserError("An account with this email already exists.", 409);
    }
    throw err;
  } finally {
    client.release();
  }
}

async function deleteStudent(studentId) {
  const profileRes = await pool.query(
    `SELECT user_id FROM student_profiles WHERE id = $1`,
    [studentId],
  );
  if (profileRes.rows.length === 0) {
    throw new UserError("Student not found.", 404);
  }
  await pool.query(`DELETE FROM users WHERE id = $1`, [
    profileRes.rows[0].user_id,
  ]);
}

async function approveStudent(studentId) {
  const { rows } = await pool.query(
    `UPDATE users SET approval_status = 'approved', updated_at = now()
     WHERE id = (SELECT user_id FROM student_profiles WHERE id = $1)
     RETURNING id, email, full_name, approval_status`,
    [studentId],
  );
  if (rows.length === 0) {
    throw new UserError("Student not found.", 404);
  }
  return rows[0];
}

async function rejectStudent(studentId) {
  const { rows } = await pool.query(
    `UPDATE users SET approval_status = 'rejected', updated_at = now()
     WHERE id = (SELECT user_id FROM student_profiles WHERE id = $1)
     RETURNING id, email, full_name, approval_status`,
    [studentId],
  );
  if (rows.length === 0) {
    throw new UserError("Student not found.", 404);
  }
  return rows[0];
}

async function setUserActiveStatus(userId, isActive) {
  const { rows } = await pool.query(
    `UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2
     RETURNING id, email, full_name, role, is_active`,
    [isActive, userId],
  );
  if (rows.length === 0) {
    throw new UserError("User not found.", 404);
  }
  return rows[0];
}

async function updateStaffAccount(userId, { fullName, email, agencyId }) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  if (fullName !== undefined) {
    setClauses.push(`full_name = $${idx++}`);
    values.push(fullName);
  }
  if (email !== undefined) {
    setClauses.push(`email = $${idx++}`);
    values.push(email.toLowerCase().trim());
  }

  if (setClauses.length === 0 && agencyId === undefined) {
    throw new UserError("Nothing to update.", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let updatedUser;
    if (setClauses.length > 0) {
      values.push(userId);
      const { rows } = await client.query(
        `UPDATE users SET ${setClauses.join(", ")}, updated_at = now()
         WHERE id = $${idx} AND role = 'in_charge'
         RETURNING id, email, full_name, role, is_active`,
        values,
      );
      if (rows.length === 0) {
        throw new UserError("In-charge account not found.", 404);
      }
      updatedUser = rows[0];
    } else {
      const { rows } = await client.query(
        `SELECT id, email, full_name, role, is_active FROM users
         WHERE id = $1 AND role = 'in_charge'`,
        [userId],
      );
      if (rows.length === 0) {
        throw new UserError("In-charge account not found.", 404);
      }
      updatedUser = rows[0];
    }

    if (agencyId !== undefined) {
      await client.query(
        `UPDATE agencies SET in_charge_id = NULL WHERE in_charge_id = $1`,
        [userId],
      );
      if (agencyId) {
        const agencyResult = await client.query(
          `UPDATE agencies SET in_charge_id = $1 WHERE id = $2 RETURNING id`,
          [userId, agencyId],
        );
        if (agencyResult.rows.length === 0) {
          throw new UserError("Selected agency not found.", 400);
        }
      }
    }

    await client.query("COMMIT");
    return updatedUser;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      throw new UserError("An account with this email already exists.", 409);
    }
    throw err;
  } finally {
    client.release();
  }
}

async function deleteStaffAccount(userId) {
  const { rows } = await pool.query(
    `DELETE FROM users WHERE id = $1 AND role = 'in_charge' RETURNING id`,
    [userId],
  );
  if (rows.length === 0) {
    throw new UserError("In-charge account not found.", 404);
  }
}

module.exports = {
  createUser,
  listStudents,
  listStaff,
  updateStudentProfile,
  deleteStudent,
  approveStudent,
  rejectStudent,
  setUserActiveStatus,
  updateStaffAccount,
  deleteStaffAccount,
  syncOjtStatus,
  UserError,
};
