const pool = require("../config/db");
const { hashPassword } = require("./authService");
const { getManilaDateString } = require("../utils/time");
const { computeDutyStatus } = require("../utils/duty");

class UserError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Creates a user account. If role is 'student', also creates the
 * matching student_profiles row in the same transaction.
 */
async function createUser({
  email,
  password,
  fullName,
  role,
  course,
  agencyId,
  requiredHours,
  officialHoursText,
  approvalStatus,
  university,
  batch,
  ojtStatus,
}) {
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
           (user_id, course, agency_id, required_hours, official_hours_text, university, batch, ojt_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, course, agency_id, required_hours, official_hours_text, qr_token, university, batch, ojt_status`,
        [
          user.id,
          course || null,
          agencyId || null,
          requiredHours || 486,
          officialHoursText || null,
          university || null,
          batch || null,
          ojtStatus || "active",
        ],
      );
      studentProfile = profileResult.rows[0];
    }

    await client.query("COMMIT");

    return { user, studentProfile };
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      // unique_violation — email already exists
      throw new UserError("An account with this email already exists.", 409);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Auto-syncs a student's ojt_status against their cumulative logged
 * hours vs. required_hours. 'dropped' is admin-controlled and never
 * touched automatically — this deliberately does NOT auto-mark students
 * as 'dropped' for having no/low attendance, since a student can
 * legitimately go a while between duty days and auto-dropping would
 * incorrectly penalize that.
 *
 * 'pending' students are promoted the moment they log their first hour
 * (to 'active', or straight to 'completed' if that single correction
 * already meets a very small required_hours) — a student who is
 * demonstrably attending shouldn't stay stuck at "hasn't started yet"
 * just because nobody remembered to flip a dropdown. From there it
 * toggles between 'active' and 'completed' as hours cross the
 * required_hours threshold in either direction.
 *
 * Called after anything that changes a student's logged hours
 * (time-out, admin attendance correction) or their required_hours.
 */
async function syncOjtStatus(studentId) {
  const { rows } = await pool.query(
    `SELECT sp.ojt_status, sp.required_hours,
            COALESCE(SUM(al.total_hours), 0) AS logged_hours
     FROM student_profiles sp
     LEFT JOIN attendance_logs al ON al.student_id = sp.id
     WHERE sp.id = $1
     GROUP BY sp.id, sp.ojt_status, sp.required_hours`,
    [studentId],
  );
  if (rows.length === 0) return null;

  const { ojt_status, required_hours, logged_hours } = rows[0];
  const requiredHours = parseFloat(required_hours);
  const loggedHours = parseFloat(logged_hours);
  const meetsRequirement = requiredHours > 0 && loggedHours >= requiredHours;

  let nextStatus = null;
  if (ojt_status === "pending" && loggedHours > 0) {
    // First logged hour while still marked "pending" — they've clearly
    // started, so promote out of pending automatically.
    nextStatus = meetsRequirement ? "completed" : "active";
  } else if (ojt_status === "active" && meetsRequirement) {
    nextStatus = "completed";
  } else if (ojt_status === "completed" && loggedHours < requiredHours) {
    // Hours were corrected downward (or required_hours raised) after
    // an auto-completion — fall back to 'active' since the student no
    // longer actually meets the completion threshold.
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

/**
 * Lists all students with their agency name and basic profile info.
 * Used to populate the admin's student management table.
 */
async function listStudents(dateStr) {
  const targetDate = dateStr || getManilaDateString();

  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.email, u.full_name, u.is_active, u.approval_status, u.created_at,
            sp.id AS student_id, sp.course, sp.required_hours, sp.official_hours_text,
            sp.university, sp.batch, sp.ojt_status,
            a.id AS agency_id, a.name AS agency_name,
            al.am_time_in, al.am_time_out, al.pm_time_in, al.pm_time_out,
            al.ot_time_in, al.ot_time_out
     FROM users u
     JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN agencies a ON a.id = sp.agency_id
     LEFT JOIN attendance_logs al ON al.student_id = sp.id AND al.log_date = $1
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
      ...rest
    } = row;
    const duty = computeDutyStatus(row);
    return { ...rest, ...duty };
  });
}

/**
 * Lists in-charge and admin accounts (non-students), useful for
 * assigning an in-charge to an agency.
 */
async function listStaff() {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
            STRING_AGG(a.name, ', ' ORDER BY a.name) AS agency_names
     FROM users u
     LEFT JOIN agencies a ON a.in_charge_id = u.id
     WHERE u.role IN ('in_charge', 'admin')
     GROUP BY u.id, u.email, u.full_name, u.role, u.is_active, u.created_at
     ORDER BY u.full_name ASC`,
  );
  return rows;
}

/**
 * Updates a student's account and/or profile fields. Accepts any of:
 * fullName, email (on the users table), agencyId, course, requiredHours,
 * officialHoursText (on student_profiles).
 *
 * Uses explicit key-presence checks (not COALESCE) so a field can be
 * intentionally cleared to null — e.g. { agencyId: null } to unassign
 * a student from their agency. COALESCE would have silently ignored
 * that null and kept the old value, which was a pre-existing bug.
 */
async function updateStudentProfile(studentId, updates) {
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
    if ("officialHoursText" in updates) {
      profileSetClauses.push(`official_hours_text = $${pIdx++}`);
      profileValues.push(updates.officialHoursText);
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

    // If required_hours changed (and the admin didn't also set ojt_status
    // explicitly in this same call — that takes priority), re-check
    // whether the student now crosses the completion threshold.
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
      throw new UserError("An account with this email already exists.", 409);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Permanently deletes a student account. Because student_profiles,
 * attendance_logs, and dtr_periods all reference users with
 * ON DELETE CASCADE, this irreversibly erases their entire attendance
 * and DTR history — not just the login. Deactivating (setUserActiveStatus)
 * is the safer default for students who simply finished or left; this
 * should be reserved for accounts created in error/duplicates.
 */
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

/**
 * Approves a self-signed-up student account, letting them log in.
 * Scoped via student_profiles so it can never accidentally approve
 * a non-student account.
 */
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

/**
 * Rejects a self-signed-up student account. The account is NOT deleted —
 * it stays as a record with status 'rejected', blocking login with a
 * clear message. Admin can still hard-delete it separately if desired.
 */
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

/**
 * Activates or deactivates a user account (soft "delete" — preserves
 * their attendance history rather than removing the account).
 */
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

/**
 * Updates an in-charge account's name/email. Deliberately scoped to
 * role = 'in_charge' in the WHERE clause so this endpoint can never be
 * used to edit an admin account by guessing/passing a different userId.
 */
async function updateStaffAccount(userId, { fullName, email }) {
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

  if (setClauses.length === 0) {
    throw new UserError("Nothing to update.", 400);
  }

  values.push(userId);

  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${setClauses.join(", ")}, updated_at = now()
       WHERE id = $${idx} AND role = 'in_charge'
       RETURNING id, email, full_name, role, is_active`,
      values,
    );
    if (rows.length === 0) {
      throw new UserError("In-charge account not found.", 404);
    }
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      throw new UserError("An account with this email already exists.", 409);
    }
    throw err;
  }
}

/**
 * Permanently deletes an in-charge account. Unlike deleteStudent, this
 * is low-risk: agencies.in_charge_id and dtr_periods.certified_by are
 * both ON DELETE SET NULL in the schema, so no attendance or DTR data
 * is destroyed — the agency just becomes unassigned and old certified
 * records keep their timestamp but lose the "certified by" reference.
 * Scoped to role = 'in_charge' so this can't delete an admin account.
 */
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
