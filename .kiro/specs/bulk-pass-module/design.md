# Design Document — Bulk Pass Module

## Overview

The Bulk Pass Module adds group port-entry pass management to the HEP Automation System. It mirrors the Vendor Pass module's architecture end-to-end: same raw-SQL `pool.query` data layer, same token / reference-number / email / QR service reuse strategy, and the same Next.js App Router frontend conventions.

The module introduces four new database tables (`bulk_pass_batches`, `bulk_pass_persons`, `bulk_pass_uploads`, `bulk_pass_status_logs`), one new counter column (`daily_pass_counters.bulkPassCounter`), a backend controller + schema model + route file in `user_service`, a new route in `approval-admin-service` for Traffic Officer actions, six email templates, a Next.js applicant portal at `/bulk_pass/[token]`, and a Department User management area at `/dashboard/bulk_pass`.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Next.js Frontend (HEP_Frontend)                          │
│  ┌────────────────────┐  ┌──────────────────────────┐    │
│  │ /dashboard/bulk_pass│  │ /bulk_pass/[token]        │    │
│  │  (Dept User UI)    │  │  (Applicant Portal - pub) │    │
│  └────────┬───────────┘  └────────────┬─────────────┘    │
│           │  bulkPassApi.js            │                   │
└───────────┼────────────────────────────┼───────────────────┘
            │                            │
            ▼                            ▼
┌────────────────────────────────────────────────────────────┐
│  user_service  (port 5001)                                  │
│  POST /api/bulk-pass/intake          (Dept User)            │
│  GET  /api/bulk-pass/list            (Dept User)            │
│  GET  /api/bulk-pass/:id             (Dept User)            │
│  PUT  /api/bulk-pass/:id             (Dept User – edit)     │
│  POST /api/bulk-pass/:id/forward     (Dept User)            │
│  POST /api/bulk-pass/:id/return      (Dept User)            │
│  POST /api/bulk-pass/:id/resubmit    (Dept User)            │
│  GET  /api/bulk-pass/public/:token   (Public)               │
│  GET  /api/bulk-pass/template        (Public)               │
│  POST /api/bulk-pass/public/:token/upload   (Public)        │
│  POST /api/bulk-pass/public/:token/preview  (Public)        │
│  POST /api/bulk-pass/public/:token/submit   (Public)        │
│  GET  /api/bulk-pass/public/:token/error-report  (Public)   │
│  GET  /api/bulk-pass/:id/pdf         (Dept User / Traffic)  │
│                                                             │
│  bulkPassController.js → bulkPassSchema.js                  │
│  excelParserService.js  (ExcelJS streaming parser)          │
│  photoValidationService.js (sharp)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ cross-service calls
         ┌─────────────────┴─────────────────────┐
         ▼                                         ▼
┌──────────────────┐                   ┌─────────────────────┐
│  email_service   │                   │  qr-service          │
│  6 new templates │                   │  reuses generateBulk │
│  POST /api/email/│                   │  POST /api/qr/bulk   │
│  sendBulkPass*   │                   └─────────────────────┘
└──────────────────┘

┌──────────────────────────────────────────────────────────┐
│  approval-admin-service                                   │
│  GET  /api/bulk-pass/queue           (Traffic Officer)    │
│  POST /api/bulk-pass/:id/approve     (Traffic Officer)    │
│  POST /api/bulk-pass/:id/reject      (Traffic Officer)    │
└──────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### Backend — user_service

**`src/controllers/bulkPassController.js`**
Follows `vendorPassController.js` exactly:
- `createIntake(req, res)` — validates body, calls `BulkPassSchema.createBatch`, sends email
- `listBatches(req, res)` — reads `req.user` for filter, calls `BulkPassSchema.list`
- `getBatchDetail(req, res)` — returns full batch + persons + uploads + status log
- `updateBatch(req, res)` — only allowed for `DRAFT` / `REJECTED` status
- `forwardToApproval(req, res)` — sets `UNDER_REVIEW`, deactivates token, logs
- `returnToApplicant(req, res)` — requires `returnReason`, sets `RETURNED_TO_APPLICANT`, activates token, logs, sends email
- `resubmitBatch(req, res)` — only for `REJECTED`, activates token, sets `RETURNED_TO_APPLICANT`, logs
- `getPublicByToken(req, res)` — public, validates token and `tokenActive`
- `downloadTemplate(req, res)` — public, streams the pre-built template xlsx
- `uploadFiles(req, res)` — public, receives up to 5 xlsx files via multer disk storage
- `previewParsed(req, res)` — public, calls `excelParserService.parseAndValidate`, returns row array
- `submitBatch(req, res)` — public, persists persons, updates status to `SUBMITTED`
- `downloadErrorReport(req, res)` — public, calls `excelParserService.buildErrorReport`
- `downloadPdf(req, res)` — protected, reads `qrPdfPath`

**`src/models/bulkPassSchema.js`**  
Raw-SQL data layer mirroring `vendorPassRequestSchema.js`:
- `createBatch(data)` — INSERT into `bulk_pass_batches`, returns row
- `getById(id)` — SELECT by id
- `getByToken(token)` — SELECT by token
- `list(filters)` — LEFT JOINs with `bulk_pass_persons`, applies WHERE clauses
- `updateBatch(id, data)` — UPDATE allowed fields
- `setStatus(id, status, extra)` — UPDATE status + optional fields
- `logTransition(batchId, status, changedBy, remarks)` — INSERT into `bulk_pass_status_logs`
- `insertPersons(batchId, rows)` — batch INSERT into `bulk_pass_persons`
- `insertUpload(data)` — INSERT into `bulk_pass_uploads`
- `getPersonsByBatch(batchId)` — SELECT all persons for a batch
- `getUploadsByBatch(batchId)` — SELECT upload records
- `getStatusLog(batchId)` — SELECT status log ordered by createdAt ASC

**`src/services/excelParserService.js`**  
Uses `exceljs` (already a common Node dependency — add if not present):
- `parseAndValidate(filePaths, fileNames)` → `Promise<{ rows: ParsedRow[], summary: ValidationSummary }>`
- `buildErrorReport(rows)` → Buffer (xlsx with error column)
- Internal: reads worksheets in streaming mode to avoid large memory allocation
- Internal: extracts embedded images using `worksheet.getImages()`, maps by row anchor
- Internal: `validateRow(row, seenAadhaar)` — runs all field validators
- Internal: `validatePhoto(imageBuffer)` → uses `sharp` for dimensions/format/size check

**`src/services/photoValidationService.js`**  
Thin wrapper around `sharp`:
- `validateEmbeddedPhoto(buffer)` → `{ valid: boolean, error: string | null }`
- Checks: format (jpeg/png only), size ≤ 500 KB, width ≥ 200, height ≥ 200, width ≤ 600, height ≤ 600, aspect ratio 0.8–1.25

**`src/routes/bulkPassRoutes.js`**  
Pattern identical to `vendorPassRoutes.js`: public routes first, then `verifyToken` protected routes.

### Backend — approval-admin-service

**`src/controllers/bulkPassApprovalController.js`**  
- `getQueue(req, res)` — returns UNDER_REVIEW batches from user_service via axios
- `approveBatch(req, res)` — calls user_service to set COMPLETED, triggers QR + PDF generation, sends approval email
- `rejectBatch(req, res)` — calls user_service to set REJECTED with reason, sends rejection email

### Email Service

Six new template files in `email_service/src/emailTemplates/`:
- `bulkPassInvitationTemplate.js` — invite applicant, includes upload link + ref no
- `bulkPassSubmittedTemplate.js` — confirms applicant submission
- `bulkPassUnderReviewTemplate.js` — notifies applicant batch is under review
- `bulkPassReturnedTemplate.js` — notifies applicant of return with reason + link
- `bulkPassApprovedTemplate.js` — notifies applicant of approval, attaches PDF
- `bulkPassRejectedTemplate.js` — notifies applicant of rejection with reason

### QR Service

New function `generateBulkPass(batchId)` in `passQrService.js`:
- Fetches batch data from user_service via axios
- Signs JWT payload: `{ ref_no, person_count, vehicle_count, validity, batch_id, department, type: "bulk_pass" }`
- Generates QR code image
- Generates PDF using PDFKit (same header style as existing person passes)
- Writes PDF to `uploads/bulk_pass_pdfs/{ref_no}.pdf`
- Returns buffer

### Frontend

**`src/lib/bulkPassApi.js`** — mirrors `vendorPassApi.js`:
```js
getBulkVisitorTypes()
createBulkIntake(formData)
listBulkBatches(filters)
getBulkBatchDetail(id)
updateBulkBatch(id, data)
forwardToApproval(id)
returnToApplicant(id, data)
resubmitBatch(id)
resendLink(id)
getPublicBatch(token)
uploadExcelFiles(token, files)
parsePreview(token, filePaths)
submitBulkBatch(token)
downloadTemplate()
downloadErrorReport(token, rows)
downloadBulkPdf(id)
```

**Frontend Pages:**
- `/dashboard/bulk_pass/page.js` — list page with filters, status chips, action buttons
- `/dashboard/bulk_pass/create/page.js` — create form
- `/dashboard/bulk_pass/[id]/page.js` — detail page
- `/bulk_pass/[token]/page.js` — public applicant portal (template download, file upload, preview table, submit)

---

## Data Models

### `bulk_pass_batches`

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| refNo | VARCHAR(60) | Unique, BLK format |
| token | VARCHAR(96) | Unique, URL-safe base64 |
| tokenActive | BOOLEAN | Default true |
| createdByUserId | INTEGER | FK → users.id |
| departmentId | INTEGER | |
| departmentName | VARCHAR(100) | |
| visitorType | VARCHAR(50) | CRUISE_VESSEL, EDUCATIONAL_VISIT, INTERNSHIP, VIP, GOVT_OFFICIAL, OTHER |
| companyName | VARCHAR(200) | |
| applicantEmail | VARCHAR(150) | |
| applicantMobile | VARCHAR(15) | |
| refDocNo | VARCHAR(100) | nullable |
| workOrderRequired | BOOLEAN | Default false |
| noOfPersons | INTEGER | Default 0 |
| noOfVehicles | INTEGER | Default 0 |
| paymentMode | ENUM(CASH, FREE) | Default CASH |
| passType | ENUM(MULTIPLE, SINGLE) | Default MULTIPLE |
| purpose | TEXT | |
| validityUpto | TIMESTAMP WITH TIME ZONE | |
| remarks | TEXT | nullable |
| status | ENUM(DRAFT, SUBMITTED, UNDER_REVIEW, RETURNED_TO_APPLICANT, REJECTED, COMPLETED) | Default DRAFT |
| returnReason | TEXT | nullable |
| rejectionReason | TEXT | nullable |
| qrPdfPath | VARCHAR(500) | nullable |
| submittedAt | TIMESTAMP | nullable |
| lastEmailSentAt | TIMESTAMP | nullable |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### `bulk_pass_persons`

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| batchId | INTEGER | FK → bulk_pass_batches.id |
| fileName | VARCHAR(300) | source Excel filename |
| rowNumber | INTEGER | 1-based row in source file |
| name | VARCHAR(200) | |
| aadhaar | VARCHAR(12) | |
| dob | DATE | |
| gender | VARCHAR(10) | |
| mobile | VARCHAR(15) | |
| address | TEXT | |
| vehicleNumber | VARCHAR(20) | nullable |
| vehicleType | VARCHAR(50) | nullable |
| photoPath | VARCHAR(500) | nullable |
| validationStatus | VARCHAR(10) | valid / invalid |
| errorMessage | TEXT | nullable |
| createdAt | TIMESTAMP | |

### `bulk_pass_uploads`

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| batchId | INTEGER | FK → bulk_pass_batches.id |
| fileName | VARCHAR(300) | |
| filePath | VARCHAR(500) | |
| rowCount | INTEGER | |
| uploadedAt | TIMESTAMP | |

### `bulk_pass_status_logs`

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| batchId | INTEGER | FK → bulk_pass_batches.id |
| status | VARCHAR(50) | |
| changedBy | INTEGER | userId |
| remarks | TEXT | nullable |
| createdAt | TIMESTAMP | |

### `daily_pass_counters` extension

New column: `bulkPassCounter INTEGER DEFAULT 0`

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property-based testing library:** `fast-check` (JavaScript). All property tests run a minimum of 100 iterations.

Each property test is tagged with: `**Feature: bulk-pass-module, Property {N}: {text}**`

---

**Property 1: Batch creation produces a valid BLK reference and DRAFT status**

*For any* valid intake payload (valid email, 10-digit mobile, persons 0–50, vehicles 0–20, future validityUpto), calling `createBatch` must return a record with `status = 'DRAFT'`, a `refNo` matching `/^BLK\d{6}\d{4}$/`, and a non-empty `token`.

**Validates: Requirements 1.1, 1.9**

---

**Property 2: Input validation rejects invalid email formats**

*For any* string that does not match `[^\s@]+@[^\s@]+\.[^\s@]+`, the intake creation endpoint must return HTTP 400 with message `"Invalid applicant email"`.

**Validates: Requirements 1.4**

---

**Property 3: Input validation rejects invalid mobile numbers**

*For any* mobile string whose length is not exactly 10 digits, the intake creation endpoint must return HTTP 400.

**Validates: Requirements 1.5, 1.6, 1.7**

---

**Property 4: Input validation rejects non-future validity dates**

*For any* `validityUpto` datetime at or before `Date.now()`, the intake creation endpoint must return HTTP 400 with message `"Validity upto must be a future date"`.

**Validates: Requirements 1.8**

---

**Property 5: List ordering — batches always returned newest-first**

*For any* set of batches belonging to a user (created at distinct timestamps), the list endpoint must return them in descending `createdAt` order such that for every adjacent pair `(a, b)` in the response, `a.createdAt >= b.createdAt`.

**Validates: Requirements 2.1**

---

**Property 6: Filter predicate — every returned record satisfies applied filters**

*For any* filter object `{ status?, companyName?, fromDate?, toDate? }` applied to the list endpoint, every record in the response must satisfy all non-null filter predicates (status equality, company name ILIKE, date range).

**Validates: Requirements 2.2**

---

**Property 7: Forward-to-approval produces UNDER_REVIEW and deactivates token**

*For any* batch in `SUBMITTED` status, calling the forward-to-approval action must result in `status = 'UNDER_REVIEW'` and `tokenActive = false` in the persisted record.

**Validates: Requirements 3.1**

---

**Property 8: Return-to-applicant produces RETURNED_TO_APPLICANT and activates token**

*For any* batch in `SUBMITTED` status and any non-empty `returnReason` string, calling return-to-applicant must result in `status = 'RETURNED_TO_APPLICANT'`, `tokenActive = true`, and `returnReason` stored on the batch.

**Validates: Requirements 3.2**

---

**Property 9: Every status transition produces an audit log entry**

*For any* status action (forward, return, submit, approve, reject, resubmit) performed on a batch, querying `bulk_pass_status_logs` for that `batchId` must return at least one row with the corresponding new status and the acting user's ID.

**Validates: Requirements 3.3**

---

**Property 10: Public token lookup returns intake for valid active tokens**

*For any* batch with `tokenActive = true`, calling `GET /bulk-pass/public/:token` must return HTTP 200 with the intake fields matching the batch record.

**Validates: Requirements 4.1**

---

**Property 11: File upload constraints are enforced**

*For any* upload request containing more than 5 files, or containing a file whose extension is not `.xlsx`/`.xls`, or containing a file whose size exceeds 15 MB, the upload endpoint must reject the request with HTTP 400.

**Validates: Requirements 4.5**

---

**Property 12: Parsed row count equals sum of rows across all files**

*For any* set of valid Excel files (each ≤ 200 rows, total ≤ 1000), the parse result's `rows.length` must equal the arithmetic sum of the row counts of all input files.

**Validates: Requirements 5.1**

---

**Property 13: Aadhaar validator accepts exactly 12-digit numeric strings**

*For any* string `s`, the `validateAadhaar(s)` function must return `true` iff `s` matches `/^\d{12}$/` after stripping whitespace, and `false` for all other inputs.

**Validates: Requirements 5.3**

---

**Property 14: Cross-file duplicate Aadhaar detection**

*For any* set of rows across one or more files where the same Aadhaar number appears more than once, all but the first occurrence must have `validationStatus = 'invalid'` with an error message containing `"Duplicate Aadhaar"`.

**Validates: Requirements 5.4**

---

**Property 15: DOB validator rejects future dates**

*For any* date string representing a date strictly after today, `validateDOB(dateStr)` must return `{ valid: false, error: "Invalid DOB: future date not allowed" }`.

**Validates: Requirements 5.5**

---

**Property 16: Mobile validator accepts only 10-digit numbers starting with 6–9**

*For any* string `s`, `validateMobile(s)` must return `true` iff `s` is exactly 10 digits and the first digit is in `{6,7,8,9}`, and `false` otherwise.

**Validates: Requirements 5.6**

---

**Property 17: Photo validation returns first failing rule's error message**

*For any* image buffer, `validateEmbeddedPhoto(buffer)` must return `{ valid: false, error: E }` where `E` is the error message corresponding to the first constraint violated in the order: format → size → min dimensions → max dimensions → aspect ratio. For images satisfying all constraints, it must return `{ valid: true, error: null }`.

**Validates: Requirements 5.8**

---

**Property 18: Every parse result row contains all required fields**

*For any* parsed Excel file, every element in the `rows` array must have non-null values for `fileName`, `rowNumber`, `validationStatus`, and `errorMessage` (empty string when valid), and must have values present for `name`, `aadhaar`, `dob`, `gender`, `mobile`.

**Validates: Requirements 6.1**

---

**Property 19: Error report contains all rows plus an error column**

*For any* parse result with N rows, `buildErrorReport(rows)` must return a buffer that, when parsed back as xlsx, contains exactly N data rows plus a header row, and each row must have an "Error" column matching `rows[i].errorMessage`.

**Validates: Requirements 6.2**

---

**Property 20: canSubmit flag equals all-rows-valid**

*For any* parse result array `rows`, the derived `canSubmit` value must be `true` iff every row has `validationStatus = 'valid'`, and `false` if any row has `validationStatus = 'invalid'`.

**Validates: Requirements 6.3**

---

**Property 21: Successful submission creates person records and sets SUBMITTED status**

*For any* valid submission (all rows valid, batch in DRAFT or RETURNED_TO_APPLICANT status), calling the submit endpoint must: create exactly `rows.length` records in `bulk_pass_persons` with the correct `batchId`, update batch status to `SUBMITTED`, and set `tokenActive = false`.

**Validates: Requirements 7.1, 7.4**

---

**Property 22: Submission rejected when batch not in submittable state**

*For any* batch whose status is not `DRAFT` or `RETURNED_TO_APPLICANT`, calling the submit endpoint must return HTTP 400 with message `"Batch is not in a submittable state"`.

**Validates: Requirements 7.3**

---

**Property 23: Traffic approval queue returns UNDER_REVIEW batches oldest-first**

*For any* set of batches in `UNDER_REVIEW` status, the queue endpoint must return them in ascending `createdAt` order such that for every adjacent pair `(a, b)`, `a.createdAt <= b.createdAt`.

**Validates: Requirements 8.1**

---

**Property 24: Approval produces COMPLETED status and non-null qrPdfPath**

*For any* batch in `UNDER_REVIEW` status, calling the approve action must result in `status = 'COMPLETED'` and `qrPdfPath` being a non-null, non-empty string in the persisted record.

**Validates: Requirements 8.2**

---

**Property 25: Rejection produces REJECTED status and stores reason**

*For any* batch in `UNDER_REVIEW` status and any non-empty `rejectionReason` string, calling the reject action must result in `status = 'REJECTED'` and `rejectionReason` matching the submitted reason in the persisted record.

**Validates: Requirements 8.3**

---

**Property 26: Resubmit activates token and sets RETURNED_TO_APPLICANT**

*For any* batch in `REJECTED` status, calling resubmit must result in `tokenActive = true` and `status = 'RETURNED_TO_APPLICANT'`.

**Validates: Requirements 9.2**

---

**Property 27: PDF download returns PDF content for COMPLETED batches**

*For any* batch in `COMPLETED` status with a valid `qrPdfPath`, calling the download-PDF endpoint must return HTTP 200 with `Content-Type: application/pdf` and a non-empty response body.

**Validates: Requirements 10.1**

---

## Error Handling

All controller functions follow this pattern (mirrored from `vendorPassController.js`):

```js
exports.createIntake = async (req, res) => {
  try {
    // validation
    // business logic
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[bulkPass] createIntake error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
```

Specific HTTP codes:
- `400` — validation failure (missing required field, invalid format, wrong status for action)
- `403` — inactive token
- `404` — token not found, batch not found, PDF not found
- `500` — unexpected server error

---

## Testing Strategy

### Unit Tests

Unit tests are placed in `user_service/__tests__/` and cover:
- `validateAadhaar(s)` — specific valid and invalid examples
- `validateMobile(s)` — boundary examples (6, 9 prefix; 9-digit; 11-digit)
- `validateDOB(s)` — today (invalid), yesterday (valid), future (invalid), malformed
- `validatePhoto(buffer)` — each failing rule in isolation using synthetic buffers
- `buildErrorReport(rows)` — given 3 rows (1 valid, 2 invalid), output xlsx structure
- `BulkPassSchema.getByToken` — with a known token returns expected row
- Status transition guards — calling `forwardToApproval` on a non-SUBMITTED batch returns 400

### Property-Based Tests

All property tests use `fast-check`. Configuration: `{ numRuns: 100 }` minimum.

Each test is annotated:
```js
// **Feature: bulk-pass-module, Property 13: Aadhaar validator accepts exactly 12-digit numeric strings**
// **Validates: Requirements 5.3**
it('Property 13 — aadhaar validator', () => {
  fc.assert(fc.property(
    fc.string(),
    (s) => {
      const result = validateAadhaar(s);
      const expected = /^\d{12}$/.test(s.replace(/\s/g, ''));
      return result === expected;
    }
  ), { numRuns: 100 });
});
```

Properties implemented as property-based tests (one test per property):
- Property 1 — batch creation round-trip (fast-check arbitrary valid intake → create → assert DRAFT + BLK ref)
- Property 2 — invalid email rejection (fast-check arbitrary string not matching email regex)
- Property 3 — invalid mobile rejection (fast-check non-10-digit strings)
- Property 4 — non-future validity rejection (fast-check past timestamps)
- Property 5 — list ordering (fast-check batch sequences → assert sorted)
- Property 6 — filter predicate (fast-check batch sets + filter combos → assert all returned match)
- Property 7 — forward-to-approval state change
- Property 8 — return-to-applicant state change
- Property 9 — audit log entry per action
- Property 10 — token lookup round-trip
- Property 11 — file upload constraint enforcement
- Property 12 — parse row count = sum of file rows
- Property 13 — Aadhaar validator correctness
- Property 14 — cross-file duplicate Aadhaar detection
- Property 15 — DOB future date rejection
- Property 16 — mobile validator correctness
- Property 17 — photo validation first-failing-rule ordering
- Property 18 — every parse result row has required fields
- Property 19 — error report row count and column presence
- Property 20 — canSubmit derived from all-valid
- Property 21 — submission creates person records + sets SUBMITTED
- Property 22 — submission rejected for non-submittable status
- Property 23 — traffic queue ordering
- Property 24 — approval sets COMPLETED + non-null qrPdfPath
- Property 25 — rejection sets REJECTED + stores reason
- Property 26 — resubmit activates token
- Property 27 — PDF download returns PDF content-type
