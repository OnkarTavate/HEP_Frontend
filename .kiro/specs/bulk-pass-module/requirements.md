# Requirements Document

## Introduction

The Bulk Pass Module extends the HEP (Harbour Entry Pass) Automation System to support creation and management of group port-entry passes for categories such as Cruise Vessels, Educational Visits, Internships, VIPs, Government Officials, and other approved bulk visitor categories.

The module enables Department Users to create intake requests, generate a secure upload link for applicants, allow applicants to submit visitor data via structured Excel files with embedded photos, and route the batch through a Traffic Department approval workflow that produces a single JWT-signed Group QR Code PDF for the approved batch.

The implementation must reuse all existing infrastructure: token generation, email service, reference number counter, approval queue, and QR service — following the exact architecture, patterns, and conventions of the Vendor Pass module.

---

## Glossary

- **Bulk Pass Batch**: A single group port-entry pass request covering one or more visitors, managed as a unit through the entire workflow.
- **BLK Reference Number**: Auto-generated batch identifier with format `BLK{DD}{MM}{YY}{NNNN}`, e.g., `BLK0906260001`. Reuses the `daily_pass_counters` table with a new `bulkPassCounter` column.
- **Applicant**: The external person (not a logged-in user) who receives the upload link, downloads the Excel template, uploads visitor Excel files, and submits the batch.
- **Department User**: A logged-in HEP system user who creates the intake, manages the batch lifecycle, and forwards to the Traffic Department.
- **Traffic Officer**: A logged-in HEP system user in the Traffic Department who reviews, approves, or rejects the entire batch.
- **Upload Token**: A cryptographically secure, URL-safe, non-guessable string used to authenticate the applicant's upload session at `/bulk_pass/{token}`.
- **Excel Template**: A downloadable `.xlsx` file with predefined columns for visitor data including an embedded-photo cell per row.
- **Embedded Photo**: A photo image (JPEG or PNG) physically embedded inside an Excel cell, not a file path or external reference.
- **Group QR Code**: A single JWT-signed QR code representing the entire approved batch, generated upon Traffic Officer approval.
- **Batch Status**: The lifecycle state of a Bulk Pass Batch: `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `RETURNED_TO_APPLICANT` → `COMPLETED` (or `REJECTED`).
- **bulk_pass_batches**: The primary database table for Bulk Pass Batch records.
- **bulk_pass_persons**: The database table storing individual visitor records parsed from uploaded Excel files.
- **bulk_pass_uploads**: The database table tracking each uploaded Excel file associated with a batch.
- **bulk_pass_status_logs**: The audit trail table logging all status transitions for a batch.
- **daily_pass_counters**: Existing shared table extended with a `bulkPassCounter` column for daily-reset sequence generation.
- **pool**: The existing `pg` connection pool instance used across all user_service models via `../dbconfig/db`.
- **VISITOR_TYPES (Bulk)**: Master list of bulk visitor categories: `CRUISE_VESSEL`, `EDUCATIONAL_VISIT`, `INTERNSHIP`, `VIP`, `GOVT_OFFICIAL`, `OTHER`.
- **QR_SECRET**: Environment variable used to sign Group QR JWT tokens, reused from the existing QR service.
- **FRONTEND_BASE_URL**: Environment variable for constructing the applicant upload link.
- **EMAIL_SERVICE_URL**: Environment variable for the email service used to dispatch all bulk pass emails.

---

## Requirements

---

### Requirement 1

**User Story:** As a Department User, I want to create a Bulk Pass intake request with all required visitor group details, so that I can initiate the port-entry pass process for a group of visitors.

#### Acceptance Criteria

1. WHEN a Department User submits the Bulk Pass creation form with all required fields (visitor type, company name, applicant email, applicant mobile, purpose of visit, validity upto), THE Bulk Pass System SHALL create a new batch record with status `DRAFT`, generate a `BLK{DD}{MM}{YY}{NNNN}` reference number using the `daily_pass_counters.bulkPassCounter` column, and return the created batch in the API response.

2. WHEN the Department field is rendered in the creation form, THE Bulk Pass System SHALL auto-fill the department name and department ID from the authenticated user's session, making the field read-only.

3. WHEN the visitor type dropdown is rendered, THE Bulk Pass System SHALL present the options: `CRUISE_VESSEL`, `EDUCATIONAL_VISIT`, `INTERNSHIP`, `VIP`, `GOVT_OFFICIAL`, `OTHER`, sourced from the `BULK_VISITOR_TYPES` constants array, and SHALL require a selection before form submission.

4. WHEN a Department User submits an applicant email that does not match the pattern `[^\s@]+@[^\s@]+\.[^\s@]+`, THE Bulk Pass System SHALL reject the request with HTTP 400 and the message `"Invalid applicant email"`.

5. WHEN a Department User submits an applicant mobile that is not exactly 10 digits, THE Bulk Pass System SHALL reject the request with HTTP 400 and the message `"Applicant mobile must be 10 digits"`.

6. WHEN a Department User submits a `noOfPersons` value outside the range 0–50, THE Bulk Pass System SHALL reject the request with HTTP 400 and the message `"Number of persons must be between 0 and 50"`.

7. WHEN a Department User submits a `noOfVehicles` value outside the range 0–20, THE Bulk Pass System SHALL reject the request with HTTP 400 and the message `"Number of vehicles must be between 0 and 20"`.

8. WHEN a Department User submits a `validityUpto` datetime that is not in the future, THE Bulk Pass System SHALL reject the request with HTTP 400 and the message `"Validity upto must be a future date"`.

9. WHEN the batch is created successfully, THE Bulk Pass System SHALL generate a secure upload token using `crypto.randomBytes(9).toString('base64')` with URL-safe character substitution, store it in the `bulk_pass_batches.token` column, and set `tokenActive` to `true`.

10. WHEN the batch is created successfully, THE Bulk Pass System SHALL send an invitation email to the applicant email containing the reference number, intake details summary, upload link (`{FRONTEND_BASE_URL}/bulk_pass/{token}`), and submission instructions, via the existing email service at `EMAIL_SERVICE_URL`.

---

### Requirement 2

**User Story:** As a Department User, I want to view, search, filter, and manage my bulk pass batches from a list page, so that I can track the status of all group pass requests.

#### Acceptance Criteria

1. WHEN a Department User navigates to the Bulk Pass list page, THE Bulk Pass System SHALL return all batches created by that user, ordered by `createdAt` descending, with a maximum of 500 records.

2. WHEN a Department User applies filters (reference number search, company name search, status filter, date range), THE Bulk Pass System SHALL apply those filters as SQL `WHERE` clauses using parameterized queries and return only matching records.

3. WHEN the list is rendered, THE Bulk Pass System SHALL display status chips for each batch using the following color scheme: `DRAFT` (grey), `SUBMITTED` (blue), `UNDER_REVIEW` (amber), `RETURNED_TO_APPLICANT` (orange), `REJECTED` (red), `COMPLETED` (green).

4. WHEN a batch has status `DRAFT` or `RETURNED_TO_APPLICANT`, THE Bulk Pass System SHALL show an "Edit" action button for that batch row.

5. WHEN a batch has status `SUBMITTED`, THE Bulk Pass System SHALL show "Forward to Approval" and "Return to Applicant" action buttons for that batch row.

6. WHEN a batch has status `REJECTED`, THE Bulk Pass System SHALL show an "Edit & Resubmit" action button for that batch row.

7. WHEN a batch has status `COMPLETED`, THE Bulk Pass System SHALL show a "Download QR PDF" action button for that batch row.

---

### Requirement 3

**User Story:** As a Department User, I want to forward a submitted batch for Traffic Department approval or return it to the applicant for corrections, so that I can manage the review workflow.

#### Acceptance Criteria

1. WHEN a Department User clicks "Forward to Approval" on a batch with status `SUBMITTED`, THE Bulk Pass System SHALL update the batch status to `UNDER_REVIEW`, deactivate the upload token (`tokenActive = false`), log the transition to `bulk_pass_status_logs`, and return HTTP 200.

2. WHEN a Department User clicks "Return to Applicant" on a batch with status `SUBMITTED`, THE Bulk Pass System SHALL require a non-empty `returnReason` in the request body, set the batch status to `RETURNED_TO_APPLICANT`, set `tokenActive = true`, store `returnReason` on the batch, log the transition, and send a "Returned to Applicant" email containing the return reason and the upload link.

3. WHEN a batch status transition is persisted, THE Bulk Pass System SHALL insert a row into `bulk_pass_status_logs` containing the new status, the ID of the user performing the action, any remarks, and the current timestamp.

4. WHEN a Department User views a batch detail page, THE Bulk Pass System SHALL display: intake details (all form fields), uploaded files summary (file name, row count, upload time), person list (name, Aadhaar, DOB, gender, mobile, vehicle, validation status), persons count, vehicles count, and the full status log history.

---

### Requirement 4

**User Story:** As an Applicant, I want to access the batch upload portal via a secure token URL without logging in, so that I can upload visitor Excel files without needing a system account.

#### Acceptance Criteria

1. WHEN an Applicant accesses `/bulk_pass/{token}` with a valid, active token, THE Bulk Pass System SHALL return HTTP 200 with the intake details (department, visitor type, company name, persons count, vehicles count, validity, pass type, purpose, reference number) in read-only format.

2. WHEN an Applicant accesses `/bulk_pass/{token}` with a token that does not exist in `bulk_pass_batches`, THE Bulk Pass System SHALL return HTTP 404 with the message `"Invalid link"`.

3. WHEN an Applicant accesses `/bulk_pass/{token}` where `tokenActive = false`, THE Bulk Pass System SHALL return HTTP 403 with the message `"Link expired or inactive"`.

4. WHEN the applicant portal page loads, THE Bulk Pass System SHALL present a download button that returns a pre-generated `.xlsx` Excel template file with the mandatory columns: Name, Aadhaar Number, Date of Birth, Gender, Mobile Number, Address, Photo; and optional columns: Vehicle Number, Vehicle Type.

5. WHEN an Applicant uploads files, THE Bulk Pass System SHALL accept a maximum of 5 files per upload session, accept only `.xlsx` and `.xls` extensions, and enforce a maximum file size of 15 MB per file.

---

### Requirement 5

**User Story:** As an Applicant, I want the system to parse my uploaded Excel files and validate every row including embedded photos, so that I can identify and correct errors before submitting.

#### Acceptance Criteria

1. WHEN Excel files are uploaded for parsing, THE Bulk Pass System SHALL parse all files together in a single combined pass, building a unified row list that includes the source file name and row number for each entry.

2. WHEN parsing embedded images from Excel cells, THE Bulk Pass System SHALL associate each image with the row in which it appears using the `ExcelJS` library's worksheet image positioning, and reject any row where the photo is expected but missing.

3. WHEN validating Aadhaar numbers, THE Bulk Pass System SHALL require exactly 12 numeric digits with no spaces, and flag any row with an invalid Aadhaar with the message `"Invalid Aadhaar: must be exactly 12 digits"`.

4. WHEN detecting duplicate Aadhaar numbers, THE Bulk Pass System SHALL detect duplicates both within a single file and across all uploaded files in the same parse request, and flag each duplicate row with the message `"Duplicate Aadhaar found in {fileName} Row {rowNumber}"`.

5. WHEN validating Date of Birth, THE Bulk Pass System SHALL reject any future DOB with the message `"Invalid DOB: future date not allowed"`, and reject any unparseable date with `"Invalid DOB: use DD/MM/YYYY format"`.

6. WHEN validating mobile numbers, THE Bulk Pass System SHALL require a 10-digit number starting with 6–9, and flag invalid entries with the message `"Invalid mobile number: must be 10 digits starting with 6–9"`.

7. WHEN a vehicle number is present in a row, THE Bulk Pass System SHALL validate it against the pattern `^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$` (case-insensitive) and flag invalid entries with the message `"Invalid vehicle number format"`.

8. WHEN validating embedded photos, THE Bulk Pass System SHALL apply all of the following rules and report the first failing rule as the row error: photo missing → `"Photo missing"`; format not JPEG or PNG → `"Unsupported image format"`; size exceeds 500 KB → `"Photo exceeds 500 KB"`; dimensions below 200×200 px → `"Photo dimensions too small"`; dimensions above 600×600 px → `"Photo dimensions exceed maximum allowed"`; aspect ratio outside 0.8:1 to 1.25:1 → `"Photo aspect ratio invalid"`.

9. WHEN the total number of valid rows across all uploaded files exceeds 1000, THE Bulk Pass System SHALL reject the upload with the message `"Total persons across files must not exceed 1000"`.

10. WHEN the number of rows in a single file exceeds 200, THE Bulk Pass System SHALL reject that file's rows beyond row 200 with a file-level error: `"File {fileName} exceeds 200 rows"`.

---

### Requirement 6

**User Story:** As an Applicant, I want to preview all parsed rows with validation results in a table before submitting, so that I can confirm accuracy or download an error report and re-upload corrected files.

#### Acceptance Criteria

1. WHEN the parse result is returned, THE Bulk Pass System SHALL include for each row: file source name, row number, photo thumbnail (base64 or object URL), name, Aadhaar, DOB, gender, mobile, vehicle number, a `validationStatus` field (`valid` or `invalid`), and an `errorMessage` field.

2. WHEN the Applicant clicks "Download Error Report", THE Bulk Pass System SHALL generate and return a downloadable `.xlsx` file containing all rows from the parse result plus an additional "Error" column, with each row's error message (empty string for valid rows).

3. WHEN all rows have `validationStatus = 'valid'`, THE Bulk Pass System SHALL enable the "Submit" button; IF any row has `validationStatus = 'invalid'`, THEN THE Bulk Pass System SHALL keep the "Submit" button disabled and display the count of errors.

4. WHEN an Applicant clicks "Re-upload", THE Bulk Pass System SHALL clear the current parse result and present the file upload section again, allowing replacement of files.

---

### Requirement 7

**User Story:** As an Applicant, I want to submit my validated batch so that it moves to the Department User's review queue.

#### Acceptance Criteria

1. WHEN an Applicant submits the batch with zero validation errors, THE Bulk Pass System SHALL create records in `bulk_pass_persons` for each valid row (including photo file path), create records in `bulk_pass_uploads` for each uploaded file, update the batch status from `DRAFT` to `SUBMITTED`, set `tokenActive = false`, log the status transition, and return HTTP 200.

2. WHEN the batch is submitted, THE Bulk Pass System SHALL send a "Submission Confirmation" email to the applicant email address containing the reference number, submitted persons count, and next-steps instructions.

3. WHEN an Applicant attempts to submit a batch that is not in `DRAFT` or `RETURNED_TO_APPLICANT` status, THE Bulk Pass System SHALL return HTTP 400 with the message `"Batch is not in a submittable state"`.

4. WHEN photos from the Excel file are stored after submission, THE Bulk Pass System SHALL save each embedded photo as a file to the uploads directory using a deterministic path pattern `uploads/bulk_pass/{batchId}/{aadhaar}_{rowIndex}.jpg`, and store the path in `bulk_pass_persons.photoPath`.

---

### Requirement 8

**User Story:** As a Traffic Officer, I want to see all Bulk Pass batches in my approval queue and approve or reject entire batches, so that I can efficiently process group port-entry pass requests.

#### Acceptance Criteria

1. WHEN a Traffic Officer accesses the Bulk Pass approval queue, THE Bulk Pass System SHALL return all batches with status `UNDER_REVIEW`, ordered by `createdAt` ascending (oldest first), including batch summary fields: reference number, company name, visitor type, department, submitted persons count, submitted vehicles count, and validity.

2. WHEN a Traffic Officer approves a batch, THE Bulk Pass System SHALL update the batch status to `COMPLETED`, generate a JWT-signed Group QR token using `QR_SECRET` with payload `{ ref_no, person_count, vehicle_count, validity, batch_id, department, type: "bulk_pass" }` and expiry matching `validityUpto`, generate a single multi-page PDF containing the reference number, QR code, validity, summary, batch details, and instructions, store the PDF path in `bulk_pass_batches.qrPdfPath`, log the transition, send an approval email with the PDF attached to the applicant, and return HTTP 200.

3. WHEN a Traffic Officer rejects a batch, THE Bulk Pass System SHALL require a non-empty `rejectionReason` in the request body, update the batch status to `REJECTED`, store `rejectionReason` on the batch, log the transition, send a rejection email containing the rejection reason to the applicant, and return HTTP 200.

4. WHEN a batch status transitions to `UNDER_REVIEW`, THE Bulk Pass System SHALL send an "Under Review" notification email to the applicant email address.

---

### Requirement 9

**User Story:** As a Department User, I want to edit and resubmit a rejected batch, so that I can correct issues and re-enter the approval flow.

#### Acceptance Criteria

1. WHEN a Department User edits a batch with status `REJECTED`, THE Bulk Pass System SHALL allow updating all intake form fields (visitor type, company name, applicant email, applicant mobile, ref doc no, work order required, no of persons, no of vehicles, payment mode, pass type, purpose, validity upto, remarks), validate the updated fields using the same rules as creation, and return HTTP 200 with the updated batch.

2. WHEN a Department User resubmits a `REJECTED` batch after editing, THE Bulk Pass System SHALL set `tokenActive = true`, update the batch status to `RETURNED_TO_APPLICANT`, log the status transition, and send the applicant a "Returned to Applicant" email with the upload link so they can re-upload corrected Excel files.

3. WHEN a Department User attempts to resubmit a batch that is not in `REJECTED` status, THE Bulk Pass System SHALL return HTTP 400 with the message `"Only rejected batches can be resubmitted"`.

---

### Requirement 10

**User Story:** As a Department User or applicant, I want to download the approved Group QR PDF, so that the visitor group can use it at the port gate.

#### Acceptance Criteria

1. WHEN a Department User or applicant requests the Group QR PDF for a batch with status `COMPLETED`, THE Bulk Pass System SHALL return the PDF file stored at `bulk_pass_batches.qrPdfPath` with content-type `application/pdf`.

2. WHEN the Group QR PDF is generated, THE Bulk Pass System SHALL include on the PDF: the BLK reference number, a scannable QR code encoding the JWT-signed Group QR token, validity datetime, batch summary (department, visitor type, company name, person count, vehicle count), and an "Authorized by Traffic Manager" footer, consistent with the existing `passQrService.js` PDF layout style.

3. IF a batch PDF is requested but `qrPdfPath` is null or the file does not exist on disk, THEN THE Bulk Pass System SHALL return HTTP 404 with the message `"PDF not yet generated"`.

---

### Requirement 11

**User Story:** As a developer, I want the Bulk Pass Module to follow the exact same code architecture, folder structure, DB patterns, and security standards as the Vendor Pass module, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE Bulk Pass System SHALL implement the backend as a new controller (`bulkPassController.js`), model schema (`bulkPassSchema.js`), and route file (`bulkPassRoutes.js`) inside `user_service/src/`, following the exact same raw-SQL `pool.query` pattern used in `vendorPassRequestSchema.js`.

2. THE Bulk Pass System SHALL register the bulk pass router in `user_service/src/routes/index.js` under the path prefix `/bulk-pass`, and all Traffic Officer endpoints in `approval-admin-service` under `/bulk-pass`.

3. THE Bulk Pass System SHALL extend `referenceNumberSchema.js` with a `generateBulkPassReference(client)` method that increments `daily_pass_counters.bulkPassCounter` and returns a reference in the format `BLK{DD}{MM}{YY}{NNNN}`.

4. THE Bulk Pass System SHALL add a migration file (`YYYYMMDDHHMMSS-add-bulk-pass-counter.js`) that adds the `bulkPassCounter INTEGER DEFAULT 0` column to `daily_pass_counters`, alongside migrations for `bulk_pass_batches`, `bulk_pass_persons`, `bulk_pass_uploads`, and `bulk_pass_status_logs`.

5. THE Bulk Pass System SHALL protect all Department User and Traffic Officer API endpoints with the existing `verifyToken` middleware and SHALL leave only the applicant token-validation, file-upload, parse-preview, template-download, and submission endpoints as public routes (no `verifyToken`).

6. THE Bulk Pass System SHALL add a `Bulk Pass` navigation item to the dashboard `layout.js` sidebar for the `"Pass Officer"` and `"Traffic Officer"` role groups, using the `Users` icon from `lucide-react`, linking to `/dashboard/bulk_pass`.

7. THE Bulk Pass System SHALL add email template files (`bulkPassInvitationTemplate.js`, `bulkPassSubmittedTemplate.js`, `bulkPassUnderReviewTemplate.js`, `bulkPassReturnedTemplate.js`, `bulkPassApprovedTemplate.js`, `bulkPassRejectedTemplate.js`) to `email_service/src/emailTemplates/`, following the existing HTML structure of `vendorPassLinkTemplate.js`.

8. WHEN file uploads are stored, THE Bulk Pass System SHALL use the existing `uploadMiddleware.js` multer configuration for the intake work order file, and SHALL use a dedicated `multer` instance scoped to `/tmp/bulk_pass_excel/` for Excel file uploads to prevent memory exhaustion from large multi-file uploads.

9. THE Bulk Pass System SHALL add a `bulkPassApi.js` file to `HEP_Frontend/src/lib/` containing all API call functions (matching the structure of `vendorPassApi.js`), and SHALL create the frontend pages at `HEP_Frontend/src/app/dashboard/bulk_pass/`, `HEP_Frontend/src/app/bulk_pass/[token]/`, and `HEP_Frontend/src/app/dashboard/bulk_pass/[id]/` following the existing Next.js App Router conventions.
