import { request } from "./http";

export async function getMyDTR(month) {
  const query = month ? `?month=${month}` : "";
  return request(`/dtr${query}`);
}
