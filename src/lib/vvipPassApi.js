import axios from "axios";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

const authHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const cleanToken = token?.replace(/^["']|["']$/g, "");
  return cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {};
};

export async function submitVvipPass(formData) {
  const res = await axios.post(`${AGENT_API}/vvip-pass`, formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data?.data;
}

export async function resubmitVvipPass(id, formData) {
  const res = await axios.post(`${AGENT_API}/vvip-pass/${id}/resubmit`, formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data?.data;
}

export async function listVvipPasses(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  const res = await axios.get(`${ADMIN_API}/vvip-pass/queue?${params.toString()}`, {
    headers: authHeaders(),
  });

  return res.data?.data || [];
}

export async function getVvipPass(id) {
  const res = await axios.get(`${ADMIN_API}/vvip-pass/${id}`, {
    headers: authHeaders(),
  });

  return res.data?.data;
}

export async function approveVvipPass(id) {
  const res = await axios.post(
    `${ADMIN_API}/vvip-pass/${id}/approve`,
    {},
    { headers: authHeaders() },
  );

  return res.data?.data;
}

export async function rejectVvipPass(id, reason = "") {
  const res = await axios.post(
    `${ADMIN_API}/vvip-pass/${id}/reject`,
    { reason },
    { headers: authHeaders() },
  );

  return res.data?.data;
}

export async function returnVvipPass(id, reason = "") {
  const res = await axios.post(
    `${ADMIN_API}/vvip-pass/${id}/return`,
    { reason },
    { headers: authHeaders() },
  );

  return res.data?.data;
}

async function getVvipQrPdfBlob(id) {
  const res = await axios.get(`${AGENT_API}/vvip-pass/${id}/pdf`, {
    headers: authHeaders(),
    responseType: "blob",
  });

  const contentType = res.headers["content-type"] || "";
  if (!contentType.includes("application/pdf")) {
    const text = await res.data.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
    const err = new Error(parsed.message || "QR PDF not available.");
    err.response = { data: parsed, status: res.status };
    throw err;
  }

  return new Blob([res.data], { type: "application/pdf" });
}

export async function viewVvipQrPdf(id) {
  const blob = await getVvipQrPdfBlob(id);
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}

export async function downloadVvipQrPdf(id, referenceNo = "vvip-pass") {
  const blob = await getVvipQrPdfBlob(id);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${referenceNo || "vvip-pass"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
