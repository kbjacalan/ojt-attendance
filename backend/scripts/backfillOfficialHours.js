require("dotenv").config();
const pool = require("../src/config/db");

function to24Hour(time12) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((time12 || "").trim());
  if (!match) return null;
  let [, hStr, mStr, period] = match;
  let h = parseInt(hStr, 10) % 12;
  if (period.toUpperCase() === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${mStr}:00`;
}

function parseOfficialHoursText(text) {
  const result = { amStart: null, amEnd: null, pmStart: null, pmEnd: null };
  if (!text) return result;

  const morningMatch = /Morning:\s*([\d:]+\s*[AP]M)\s*-\s*([\d:]+\s*[AP]M)/i.exec(text);
  if (morningMatch) {
    result.amStart = to24Hour(morningMatch[1]);
    result.amEnd = to24Hour(morningMatch[2]);
  }

  const afternoonMatch = /Afternoon:\s*([\d:]+\s*[AP]M)\s*-\s*([\d:]+\s*[AP]M)/i.exec(text);
  if (afternoonMatch) {
    result.pmStart = to24Hour(afternoonMatch[1]);
    result.pmEnd = to24Hour(afternoonMatch[2]);
  }

  return result;
}

async function backfill() {
  const { rows } = await pool.query(
    `SELECT sp.id, u.email, sp.official_hours_text
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id`,
  );

  const unresolved = [];

  for (const row of rows) {
    const parsed = parseOfficialHoursText(row.official_hours_text);

    if (!parsed.amStart || !parsed.amEnd || !parsed.pmStart || !parsed.pmEnd) {
      unresolved.push({
        id: row.id,
        email: row.email,
        text: row.official_hours_text,
      });
      continue;
    }

    await pool.query(
      `UPDATE student_profiles
       SET am_start = $1, am_end = $2, pm_start = $3, pm_end = $4
       WHERE id = $5`,
      [parsed.amStart, parsed.amEnd, parsed.pmStart, parsed.pmEnd, row.id],
    );
  }

  console.log(
    `Backfilled ${rows.length - unresolved.length} of ${rows.length} student profiles.`,
  );

  if (unresolved.length > 0) {
    console.log(`\n${unresolved.length} profile(s) need manual review:`);
    for (const u of unresolved) {
      console.log(`  ${u.email} (${u.id}): "${u.text || ""}"`);
    }
  }

  process.exit(0);
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
