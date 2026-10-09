"use client";

import axios from "axios";

export const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

export const TRAFFIC_API = `${AGENT_API}/reports/traffic`;

export const getAuthHeaders = () => {
  let token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (!token) return {};
  token = token.replace(/^["']|["']$/g, "");
  return { Authorization: `Bearer ${token}` };
};

/** Drop empty params so URLs stay short and the API sees only real filters. */
export const compactParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== "" && v !== false,
    ),
  );

export async function fetchTraffic(path, params = {}, { signal } = {}) {
  const res = await axios.get(`${TRAFFIC_API}${path}`, {
    headers: getAuthHeaders(),
    params: compactParams(params),
    signal,
    validateStatus: (s) => s < 500,
  });
  if (res.status === 401) throw new Error("Session expired. Please log in again.");
  if (res.status === 403) throw new Error("Your role does not have access to Cargo Analytics.");
  if (res.status >= 400 || !res.data?.success) {
    throw new Error(res.data?.message || `Request failed (${res.status})`);
  }
  return res.data;
}

/** Download a server-side export (csv | xlsx) of the full filtered set. */
export async function downloadTraffic(path, params = {}, format = "csv", fallbackName = "export") {
  const res = await axios.get(`${TRAFFIC_API}${path}`, {
    headers: getAuthHeaders(),
    params: { ...compactParams(params), format },
    responseType: "blob",
  });
  const disposition = res.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `${fallbackName}.${format}`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}
