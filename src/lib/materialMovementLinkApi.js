import axios from "axios";

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AGENT_API,
  timeout: 20000,
  headers: {
    Accept: "application/json",
  },
});

client.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

function errorMessage(error, fallback) {
  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (!error?.response) {
    return "Unable to connect to the server.";
  }

  const message = error.response.data?.message;

  if (error.response.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (error.response.status === 413) {
    return "The uploaded file is too large. Maximum size is 2 MB.";
  }

  return message || fallback;
}

async function request(operation, fallback) {
  try {
    return await operation();
  } catch (error) {
    throw new Error(errorMessage(error, fallback));
  }
}

export function getMaterialLinkMasters() {
  return request(
    async () => {
      const response = await client.get(
        "/vendor-material-pass/link-masters"
      );

      return response.data?.data ?? { gates: [], purposes: [] };
    },
    "Unable to load form options."
  );
}

export function createMaterialLink(formData) {
  return request(
    async () => {
      // Let the browser/axios set the multipart boundary.
      const response = await client.post(
        "/vendor-material-pass/vendor-links",
        formData
      );

      return response.data;
    },
    "Unable to generate the application link."
  );
}

export function listMaterialLinks(params) {
  return request(
    async () => {
      const response = await client.get(
        "/vendor-material-pass/vendor-links",
        { params }
      );

      return response.data;
    },
    "Unable to load generated links."
  );
}

export function resendMaterialLink(id) {
  return request(
    async () => {
      const response = await client.post(
        `/vendor-material-pass/vendor-links/${encodeURIComponent(id)}/resend`
      );

      return response.data;
    },
    "Unable to resend the application link."
  );
}

export function revokeMaterialLink(id, reason) {
  return request(
    async () => {
      const response = await client.post(
        `/vendor-material-pass/vendor-links/${encodeURIComponent(id)}/revoke`,
        { reason }
      );

      return response.data;
    },
    "Unable to revoke the application link."
  );
}