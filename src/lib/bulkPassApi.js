import axios from "axios";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

// Origin of user_service (without the /api suffix) — used to build URLs for
// statically-served uploaded files (photos, vehicle docs, work orders).
export const FILE_BASE = AGENT_API.replace(/\/api\/?$/, "");

// Build an absolute URL for a stored upload path like "uploads/bulk_pass/32/x.jpg".
// Returns "" for empty input and passes through already-absolute http(s) URLs.
export function fileUrl(p) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return `${FILE_BASE}/${String(p).replace(/^\/+/, "")}`;
}

const authHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Response interceptor to ensure detailed backend error messages are preserved
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMsg = error.response?.data?.message || error.response?.data?.errorDetails;
    if (backendMsg) {
      error.message = backendMsg;
    }
    return Promise.reject(error);
  }
);

// ── Lookup data ──────────────────────────────────────────────────────────────

export async function getBulkVisitorTypes() {
  const res = await axios.get(`${AGENT_API}/bulk-pass/visitor-types`, {
    headers: authHeaders(),
  });
  return res.data?.data || [];
}

// ── Department User (protected) ──────────────────────────────────────────────

export async function createBulkIntake(formData) {
  const res = await axios.post(`${AGENT_API}/bulk-pass/intake`, formData, {
    headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
  });
  return res.data?.data;
}

export async function listBulkBatches(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.append(k, v);
  });
  const res = await axios.get(
    `${AGENT_API}/bulk-pass/list?${params.toString()}`,
    { headers: authHeaders() }
  );
  return res.data?.data || [];
}

export async function getBulkBatchDetail(id) {
  const res = await axios.get(`${AGENT_API}/bulk-pass/${id}`, {
    headers: authHeaders(),
  });
  // Backend returns { batch, persons, uploads, statusLog } — flatten into one object
  // so pages can access batch fields directly alongside persons/uploads/statusLogs
  const raw = res.data?.data;
  if (!raw) return null;
  return {
    ...normaliseBatchRow(raw.batch),
    persons: raw.persons || [],
    uploads: raw.uploads || [],
    statusLogs: raw.statusLog || raw.statusLogs || [],
  };
}

/**
 * The batch table keeps the multi-submission columns in snake_case. Expose
 * camelCase aliases so pages can read them the same way as every other field.
 */
function normaliseBatchRow(batch) {
  if (!batch) return {};
  return {
    ...batch,
    parentRequestId: batch.parentRequestId ?? batch.parent_request_id ?? null,
    submissionNumber: batch.submissionNumber ?? batch.submission_number ?? null,
    requestSource: batch.requestSource ?? batch.request_source ?? null,
  };
}

export async function updateBulkBatch(id, data) {
  // PUT route reads req.body as JSON — do NOT send multipart/form-data here
  const res = await axios.put(`${AGENT_API}/bulk-pass/${id}`, data, {
    headers: authHeaders(),
  });
  return res.data?.data;
}

/**
 * Switch the applicant link off (or back on) before the validity window ends.
 * On a reusable Bulk Pass this stops new batches while the history stays
 * readable; batches already under review are untouched.
 */
export async function setBulkPassLinkActive(id, active, reason) {
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/${id}/link-status`,
    { active: !!active, reason: reason || undefined },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function returnToApplicant(id, remarks) {
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/${id}/return`,
    { returnReason: remarks },
    { headers: authHeaders() }
  );
  return res.data;
}

/**
 * Reopen a REJECTED batch so the applicant can correct and resend it.
 * Moves the batch to RETURNED_TO_APPLICANT and re-issues its upload link.
 */
export async function resubmitBatch(id) {
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/${id}/resubmit`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
}

export async function resendInvitation(id) {
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/${id}/resend-invitation`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
}

export async function downloadBulkPdf(id) {
  const res = await axios.get(`${AGENT_API}/bulk-pass/${id}/pdf`, {
    headers: authHeaders(),
    responseType: "blob",
    // Without this, axios rejects on 4xx/5xx BEFORE the JSON-in-blob parse below,
    // so the server's helpful message ("PDF not yet generated") is lost and the
    // user sees a generic "Request failed with status code 404".
    validateStatus: () => true,
  });
  // If the server returned JSON (error), the blob will contain JSON text
  // Parse it so callers can read err.response.data.message
  const contentType = res.headers["content-type"] || "";
  if (res.status !== 200 || !contentType.includes("application/pdf")) {
    const text = await res.data.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }
    const err = new Error(parsed.message || "PDF not available");
    err.response = { data: parsed, status: res.status };
    throw err;
  }
  return res.data;
}

// ── Public (applicant) routes — no auth header ───────────────────────────────

// Real-time blacklist check for the public upload form (no auth required)
export async function checkBulkPassBlacklist(entityType, identifier) {
  const res = await axios.get(
    `${AGENT_API}/bulk-pass/public/blacklist-check?entity_type=${encodeURIComponent(entityType)}&identifier=${encodeURIComponent(identifier)}`
  );
  return res.data; // { success, isBlacklisted, data }
}

/**
 * Check RC / insurance / fitness validity via ULIP VAHAN database.
 * Public — no auth required. Called from the vehicle modal in the bulk pass form.
 * Returns: { success, found, rcActive, rcStatus, validityChecks[], expired[], allValid, makerModel, vehicleClass }
 */
export async function checkVehicleValidity(vehiclenumber) {
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/public/vehicle-check`,
    { vehiclenumber }
  );
  return res.data;
}

export async function getPublicBatch(token) {
  const res = await axios.get(`${AGENT_API}/bulk-pass/public/${token}`);
  return res.data?.data;
}

/**
 * Resolve an applicant link into the whole Bulk Pass context in one call.
 *
 * Returns the flattened `data` object:
 * {
 *   isParentRequest, isParentBatch, multipleSubmissionsEnabled,
 *   canSubmit, blockReason, message,
 *   validity: { state, expiringSoon, daysRemaining, validityFrom, validityUpto },
 *   bulkPass: { identifier, companyName, maxPersons, maxVehicles, ... },
 *   batch | parentRequest,          // legacy shapes, still populated
 *   submissionHistory: [],
 *   submissionSummary: { totalSubmissions, totalPersons, totalVehicles, byStatus },
 *   nextSubmissionNumber
 * }
 *
 * An expired multi-submission Bulk Pass still resolves: `canSubmit` is false
 * but the history stays readable.
 */
export async function validateUploadToken(token) {
  const res = await axios.get(`${AGENT_API}/bulk-pass/validate-token/${token}`);
  // Older callers read the envelope directly, so keep both levels available.
  return { ...(res.data?.data || {}), ...res.data };
}

/**
 * Refresh the submission history, aggregate statistics and the remaining
 * allowance for a Bulk Pass. Answers with the same gate as validate-token
 * (`canSubmit`, `blockReason`, `message`, `remaining`), so the portal never
 * offers a batch the server would refuse.
 */
export async function getBulkPassSubmissions(token) {
  const res = await axios.get(`${AGENT_API}/bulk-pass/public/${token}/submissions`);
  return res.data?.data;
}

/**
 * Detail of one previous batch, readable only through the Bulk Pass link that
 * owns it. Aadhaar numbers arrive masked.
 */
export async function getBulkPassSubmissionDetail(token, submissionId) {
  const res = await axios.get(
    `${AGENT_API}/bulk-pass/public/${token}/submissions/${submissionId}`
  );
  return res.data?.data;
}

/**
 * Download the approved pass (QR PDF) of one batch through the Bulk Pass link
 * that owns it. Resolves to a Blob; a JSON error body is surfaced as an Error
 * with `response.data` so callers can show the server's message.
 */
export async function downloadBulkPassSubmissionPdf(token, submissionId) {
  const res = await axios.get(
    `${AGENT_API}/bulk-pass/public/${token}/submissions/${submissionId}/pdf`,
    { responseType: "blob", validateStatus: () => true }
  );
  const contentType = res.headers["content-type"] || "";
  if (res.status !== 200 || !contentType.includes("application/pdf")) {
    const text = await res.data.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }
    const err = new Error(parsed.message || "Pass not available");
    err.response = { data: parsed, status: res.status };
    throw err;
  }
  return res.data;
}

// Public scan view — opened when anyone scans the bulk pass QR (no auth).
export async function getBulkPassScan(id, vehicle) {
  const qs = vehicle ? `?vehicle=${encodeURIComponent(vehicle)}` : "";
  const res = await axios.get(`${AGENT_API}/bulk-pass/scan/${id}${qs}`);
  return res.data?.data;
}

export async function uploadExcelFiles(token, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/public/${token}/upload`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data?.data;
}

export async function parsePreview(token, filePaths) {
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/public/${token}/preview`,
    { filePaths }
  );
  return res.data?.data;
}

export async function downloadTemplate() {
  const res = await axios.get(`${AGENT_API}/bulk-pass/template`, {
    responseType: "blob",
  });
  return res.data;
}

export async function downloadErrorReport(token, filePaths) {
  const params = new URLSearchParams();
  if (Array.isArray(filePaths)) {
    filePaths.forEach((p) => params.append("filePaths", p));
  }
  const res = await axios.get(
    `${AGENT_API}/bulk-pass/public/${token}/error-report?${params.toString()}`,
    { responseType: "blob" }
  );
  return res.data;
}

// ── New Excel-only + photo flow ───────────────────────────────────────────

export async function parseExcelOnly(token, filePaths, fileNames) {
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/public/${token}/parse-excel`,
    { filePaths, fileNames }
  );
  return res.data?.data;
}

export async function uploadZipPhotos(token, zipFile, onProgress) {
  const formData = new FormData();
  formData.append("zipFile", zipFile);
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/public/${token}/upload-zip`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    }
  );
  return res.data?.data;
}

export async function submitRowsDirectly(token, rows, formData, onProgress) {
  // If formData is provided (vehicles with docs), send as multipart.
  // A full batch can carry hundreds of documents, so report progress rather
  // than leaving the applicant staring at a spinner for minutes.
  if (formData) {
    const res = await axios.post(
      `${AGENT_API}/bulk-pass/public/${token}/submit-rows`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress,
      }
    );
    return res.data;
  }
  // Persons only — JSON
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/public/${token}/submit-rows`,
    { rows }
  );
  return res.data;
}

// ── Traffic Officer (approval-admin-service) ─────────────────────────────────

export async function getApprovalQueue() {
  const res = await axios.get(`${ADMIN_API}/bulk-pass/queue`, {
    headers: { ...authHeaders(), "Cache-Control": "no-cache" },
    params: { _t: Date.now() }, // cache-buster: always fetch a fresh queue
  });
  return res.data?.data || [];
}

// ── Individual person approval (new) ─────────────────────────────────────────

export async function approvePersonInBatch(batchId, personId) {
  const res = await axios.post(
    `${ADMIN_API}/bulk-pass/${batchId}/persons/${personId}/approve`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
}

export async function rejectPersonInBatch(batchId, personId, rejectionReason) {
  const res = await axios.post(
    `${ADMIN_API}/bulk-pass/${batchId}/persons/${personId}/reject`,
    { rejectionReason },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function undoPersonInBatch(batchId, personId) {
  const res = await axios.post(
    `${ADMIN_API}/bulk-pass/${batchId}/persons/${personId}/undo`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
}

/**
 * Approve every entry in a batch that is still awaiting a decision.
 * Anything already rejected is left as it is.
 */
export async function approveAllPendingInBatch(batchId) {
  const res = await axios.post(
    `${ADMIN_API}/bulk-pass/${batchId}/persons/approve-all`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
}

export async function finalizeBulkBatch(id) {
  const res = await axios.post(
    `${ADMIN_API}/bulk-pass/${id}/finalize`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
}

// ── Batch-level operations (kept for backward compat) ────────────────────────

export async function rejectBulkBatch(id, rejectionReason) {
  const res = await axios.post(
    `${ADMIN_API}/bulk-pass/${id}/reject`,
    { rejectionReason },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function returnBulkBatchByTraffic(id, returnReason) {
  const res = await axios.post(
    `${ADMIN_API}/bulk-pass/${id}/return`,
    { returnReason },
    { headers: authHeaders() }
  );
  return res.data;
}

// ── Traffic: post-approval actions ───────────────────────────────────────────

/**
 * Fetch full batch detail via the approval-admin-service.
 * Works for all statuses — traffic officers can view COMPLETED batches too.
 */
export async function getBulkBatchDetailAdmin(id) {
  const res = await axios.get(`${ADMIN_API}/bulk-pass/${id}`, {
    headers: authHeaders(),
  });
  const raw = res.data?.data;
  if (!raw) return null;
  return {
    ...normaliseBatchRow(raw.batch),
    persons: raw.persons || [],
    uploads: raw.uploads || [],
    statusLogs: raw.statusLog || raw.statusLogs || [],
  };
}

/**
 * Download the QR PDF via the approval-admin-service.
 * Available to all traffic dept users for COMPLETED batches.
 */
export async function downloadBulkPdfAdmin(id) {
  const res = await axios.get(`${ADMIN_API}/bulk-pass/${id}/pdf`, {
    headers: authHeaders(),
    responseType: "blob",
    // See downloadBulkPdf: reach the JSON-in-blob parse on non-2xx instead of
    // rejecting early and losing the server's message.
    validateStatus: () => true,
  });
  const contentType = res.headers["content-type"] || "";
  if (res.status !== 200 || !contentType.includes("application/pdf")) {
    const text = await res.data.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }
    const err = new Error(parsed.message || "PDF not available");
    err.response = { data: parsed, status: res.status };
    throw err;
  }
  return res.data;
}

/**
 * Resend the approved-pass email to the applicant.
 * Available to all traffic dept users on COMPLETED batches.
 */
export async function resendBulkPassEmail(id) {
  const res = await axios.post(
    `${ADMIN_API}/bulk-pass/${id}/resend-pass`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
}

// ── Admin Public Request Management (Multiple Pass Submissions) ──────────────

/**
 * Get public bulk pass requests with filtering.
 *
 * The endpoint answers { success, requests, pagination } and defaults to the
 * pending queue, so callers that want everything must ask for status "ALL".
 * Returns the request array directly; read pagination via
 * `listPublicRequestsPaged` when it is needed.
 */
export async function listPublicRequests(filters = {}) {
  const { requests } = await listPublicRequestsPaged(filters);
  return requests;
}

export async function listPublicRequestsPaged(filters = {}) {
  const params = new URLSearchParams();
  // Without an explicit status the backend narrows to PENDING_ADMIN_APPROVAL.
  const withDefaults = { status: "ALL", limit: 100, ...filters };
  Object.entries(withDefaults).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.append(k, v);
  });
  const res = await axios.get(
    `${AGENT_API}/bulk-pass/admin/public-requests?${params.toString()}`,
    { headers: authHeaders() }
  );
  return {
    requests: Array.isArray(res.data?.requests) ? res.data.requests : [],
    pagination: res.data?.pagination || { total: 0, page: 1, limit: 100, totalPages: 1 },
  };
}

/**
 * Get detailed information for a single public request
 * Requirements: 25.7
 */
export async function getPublicRequestDetail(id) {
  const res = await axios.get(
    `${AGENT_API}/bulk-pass/admin/public-requests/${id}`,
    { headers: authHeaders() }
  );
  return res.data?.request;
}

/**
 * Approve a public request and generate upload link
 * Requirements: 27.1-27.7
 */
export async function approvePublicRequest(id, data) {
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/admin/public-requests/${id}/approve`,
    data,
    { headers: authHeaders() }
  );
  return res.data;
}

/**
 * Reject a public request with reason
 * Requirements: 28.1-28.5
 */
export async function rejectPublicRequest(id, rejectionReason) {
  const res = await axios.post(
    `${AGENT_API}/bulk-pass/admin/public-requests/${id}/reject`,
    { rejectionReason },
    { headers: authHeaders() }
  );
  return res.data;
}

/**
 * Get child submissions for a parent batch with multiple submissions enabled
 * Requirements: 5.1-5.5, 14.1
 * 
 * Returns: {
 *   success: true,
 *   parentBatch: { id, refNo, companyName, ... },
 *   submissions: [{ id, submissionNumber, refNo, personsCount, vehiclesCount, status, createdAt }],
 *   totalSubmissions: number
 * }
 */
export async function getChildSubmissions(parentId) {
  const res = await axios.get(`${AGENT_API}/bulk-pass/batches/${parentId}/submissions`, {
    headers: authHeaders(),
  });
  return res.data;
}
