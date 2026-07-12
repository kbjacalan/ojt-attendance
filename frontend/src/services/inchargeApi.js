const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export const listMyStudents = (date) =>
  request(date ? `/incharge/students?date=${date}` : "/incharge/students");

export const getStudentDTR = (studentId, month) =>
  request(`/incharge/students/${studentId}/dtr?month=${month}`);

export const certifyDTR = (studentId, month, signature) =>
  request(`/incharge/students/${studentId}/certify`, {
    method: "POST",
    body: JSON.stringify({ month, signature }),
  });

export const uncertifyDTR = (studentId, month) =>
  request(`/incharge/students/${studentId}/uncertify`, {
    method: "POST",
    body: JSON.stringify({ month }),
  });

/**
 * Corrects a single day's attendance. `times` may include any of
 * amIn, amOut, pmIn, pmOut, otIn, otOut as "HH:MM" strings (or null
 * to clear a field). `remarks` is required.
 */
export const correctAttendance = (studentId, dateStr, times, remarks) =>
  request(`/attendance/${studentId}/${dateStr}`, {
    method: "PATCH",
    body: JSON.stringify({ ...times, remarks }),
  });
