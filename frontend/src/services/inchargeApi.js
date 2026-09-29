import { request } from "./http";

export const listMyStudents = (date) =>
  request(date ? `/incharge/students?date=${date}` : "/incharge/students");

export const getStudentDTR = (studentId, month) =>
  request(`/incharge/students/${studentId}/dtr?month=${month}`);

export const getStudentDTRMonths = async (studentId) => {
  const data = await request(`/incharge/students/${studentId}/dtr/months`);
  return data.months ?? [];
};

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

export const listPendingOTRequests = () => request("/incharge/ot-requests");

export const approveOTRequest = (requestId, approvedStart, approvedEnd, note) =>
  request(`/incharge/ot-requests/${requestId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approvedStart, approvedEnd, note }),
  });

export const rejectOTRequest = (requestId, note) =>
  request(`/incharge/ot-requests/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
