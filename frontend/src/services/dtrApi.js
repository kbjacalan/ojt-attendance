import { request } from "./http";

export async function getMyDTR(month) {
  const query = month ? `?month=${month}` : "";
  return request(`/dtr${query}`);
}

export async function getMyDTRMonths() {
  const data = await request("/dtr/months");
  return data.months ?? [];
}
