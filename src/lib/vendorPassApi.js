import axios from "axios";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const authHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function getVisitorTypes() {
  const res = await axios.get(`${AGENT_API}/vendor-pass/visitor-types`, {
    headers: authHeaders(),
  });
  return res.data?.data || [];
}

export async function getVisitPurposes() {
  const res = await axios.get(`${AGENT_API}/pass-request/get-visit-purposes`);
  return res.data?.data || [];
}

export async function createIntake(formData) {
  const res = await axios.post(`${AGENT_API}/vendor-pass/intake`, formData, {
    headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
  });
  return res.data?.data;
}

export async function listIntakes(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.append(k, v);
  });
  const res = await axios.get(
    `${AGENT_API}/vendor-pass/list?${params.toString()}`,
    { headers: authHeaders() }
  );
  return res.data?.data || [];
}

export async function resendLink(id) {
  const res = await axios.post(
    `${AGENT_API}/vendor-pass/${id}/resend-link`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
}

export async function revokeIntake(id) {
  const res = await axios.delete(`${AGENT_API}/vendor-pass/${id}/revoke`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function getPublicIntake(token) {
  const res = await axios.get(`${AGENT_API}/vendor-pass/public/${token}`);
  return res.data?.data;
}

export async function submitPublicVendorForm(token, formData) {
  const res = await axios.post(
    `${AGENT_API}/vendor-pass/public/${token}/submit`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}
