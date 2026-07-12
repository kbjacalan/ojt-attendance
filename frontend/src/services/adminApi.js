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

// ----- Students & Users -----
export const listStudents = (date) =>
  request(date ? `/users/students?date=${date}` : "/users/students");
export const listStaff = () => request("/users/staff");

export const createUser = (payload) =>
  request("/users", { method: "POST", body: JSON.stringify(payload) });

export const updateStudentProfile = (studentId, payload) =>
  request(`/users/students/${studentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const setUserActiveStatus = (userId, isActive) =>
  request(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });

export const deleteStudent = (studentId) =>
  request(`/users/students/${studentId}`, { method: "DELETE" });

export const approveStudent = (studentId) =>
  request(`/users/students/${studentId}/approve`, { method: "POST" });

export const rejectStudent = (studentId) =>
  request(`/users/students/${studentId}/reject`, { method: "POST" });

export const updateStaffAccount = (userId, payload) =>
  request(`/users/staff/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteStaffAccount = (userId) =>
  request(`/users/staff/${userId}`, { method: "DELETE" });

// ----- Agencies -----
export const listAgencies = () => request("/agencies");

export const createAgency = (payload) =>
  request("/agencies", { method: "POST", body: JSON.stringify(payload) });

export const updateAgency = (id, payload) =>
  request(`/agencies/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteAgency = (id) =>
  request(`/agencies/${id}`, { method: "DELETE" });

// ----- Holidays -----
export const listHolidays = (year) =>
  request(year ? `/holidays?year=${year}` : "/holidays");

export const createHoliday = (payload) =>
  request("/holidays", { method: "POST", body: JSON.stringify(payload) });

export const updateHoliday = (id, payload) =>
  request(`/holidays/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteHoliday = (id) =>
  request(`/holidays/${id}`, { method: "DELETE" });

// ----- Student DTR (view + correct, no certify/uncertify — that stays with in-charge) -----
export const getStudentDTR = (studentId, month) =>
  request(`/dtr/student/${studentId}?month=${month}`);

export const correctAttendance = (studentId, dateStr, times, remarks) =>
  request(`/attendance/${studentId}/${dateStr}`, {
    method: "PATCH",
    body: JSON.stringify({ ...times, remarks }),
  });
