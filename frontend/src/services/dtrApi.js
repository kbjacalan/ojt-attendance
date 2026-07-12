const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export async function getMyDTR(month) {
  const token = localStorage.getItem("token");
  const query = month ? `?month=${month}` : "";

  const res = await fetch(`${API_BASE_URL}/dtr${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Failed to load DTR.");
  }

  return data;
}
