# Implementation Plan

- [x] 1. Database migrations and reference number extension
  - Create migration `YYYYMMDDHHMMSS-add-bulk-pass-counter.js` — adds `bulkPassCounter INTEGER DEFAULT 0` to `daily_pass_counters`
  - Create migration `YYYYMMDDHHMMSS-create-bulk-pass-batches.js` — creates `bulk_pass_batches` table with all columns and indexes on `token`, `status`, `createdByUserId`, `departmentId`
  - Create migration `YYYYMMDDHHMMSS-create-bulk-pass-persons.js` — creates `bulk_pass_persons` table with FK to `bulk_pass_batches`
  - Create migration `YYYYMMDDHHMMSS-create-bulk-pass-uploads.js` — creates `bulk_pass_uploads` table with FK to `bulk_pass_batches`
  - Create migration `YYYYMMDDHHMMSS-create-bulk-pass-status-logs.js` — creates `bulk_pass_status_logs` table with FK to `bulk_pass_batches`
  - Add `generateBulkPassReference(client)` method to `referenceNumberSchema.js` that increments `bulkPassCounter` and returns `BLK{DD}{MM}{YY}{NNNN}`
  - _Requirements: 1.1, 11.3, 11.4_

- [x] 2. Backend data layer — bulkPassSchema.js
  - Create `user_service/src/models/bulkPassSchema.js` with methods: `createBatch`, `getById`, `getByToken`, `list`, `updateBatch`, `setStatus`, `logTransition`, `insertPersons`, `insertUpload`, `getPersonsByBatch`, `getUploadsByBatch`, `getStatusLog`
  - All methods use raw `pool.query` parameterized SQL, mirroring `vendorPassRequestSchema.js` style exactly
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 3.3, 7.1, 11.1_

- [x] 2.1 Write property test for batch creation round-trip
  - **Property 1: Batch creation produces a valid BLK reference and DRAFT status**
  - **Validates: Requirements 1.1, 1.9**

- [x] 2.2 Write property test for list ordering
  - **Property 5: List ordering — batches always returned newest-first**
  - **Validates: Requirements 2.1**

- [x] 2.3 Write property test for filter predicate
  - **Property 6: Filter predicate — every returned record satisfies applied filters**
  - **Validates: Requirements 2.2**

- [x] 3. Validation utilities
  - Create `user_service/src/utils/bulkPassValidators.js` with exported functions: `validateEmail(s)`, `validateMobile(s)`, `validateAadhaar(s)`, `validateDOB(s)`, `validateVehicleNumber(s)`
  - Each validator returns `{ valid: boolean, error: string | null }`
  - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 5.3, 5.5, 5.6, 5.7_

- [x] 3.1 Write property test for email validator
  - **Property 2: Input validation rejects invalid email formats**
  - **Validates: Requirements 1.4**

- [x] 3.2 Write property test for mobile validator
  - **Property 3: Input validation rejects invalid mobile numbers**
  - **Validates: Requirements 1.5, 1.6, 1.7**

- [x] 3.3 Write property test for validity date validator
  - **Property 4: Input validation rejects non-future validity dates**
  - **Validates: Requirements 1.8**

- [x] 3.4 Write property test for Aadhaar validator
  - **Property 13: Aadhaar validator accepts exactly 12-digit numeric strings**
  - **Validates: Requirements 5.3**

- [x] 3.5 Write property test for DOB validator
  - **Property 15: DOB validator rejects future dates**
  - **Validates: Requirements 5.5**

- [x] 3.6 Write property test for mobile validator correctness
  - **Property 16: Mobile validator accepts only 10-digit numbers starting with 6–9**
  - **Validates: Requirements 5.6**

- [ ] 4. Photo validation service
  - Create `user_service/src/services/photoValidationService.js`
  - Install `sharp` if not present (add to `package.json`)
  - Implement `validateEmbeddedPhoto(buffer)` checking: format (jpeg/png), size ≤ 500 KB, width ≥ 200, height ≥ 200, width ≤ 600, height ≤ 600, aspect ratio 0.8–1.25
  - Returns first failing rule's error message exactly as specified in Requirements 5.8
  - _Requirements: 5.8_

- [x] 4.1 Write property test for photo validation
  - **Property 17: Photo validation returns first failing rule's error message**
  - **Validates: Requirements 5.8**

- [x] 5. Excel parsing service
  - Create `user_service/src/services/excelParserService.js`
  - Install `exceljs` if not present (add to `package.json`)
  - Implement `parseAndValidate(filePaths, fileNames)`: reads each file with streaming ExcelJS reader, extracts rows and embedded images via `worksheet.getImages()`, associates images to rows by anchor row index
  - Validate each row using `bulkPassValidators.js` and `photoValidationService.js`
  - Track seen Aadhaar numbers in a `Set` across all files for cross-file duplicate detection
  - Enforce: max 200 rows per file, max 1000 total rows
  - Return `{ rows: ParsedRow[], summary: { total, valid, invalid } }`
  - Implement `buildErrorReport(rows)`: creates xlsx buffer with original columns + "Error" column
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 6.1, 6.2_

- [x] 5.1 Write property test for parse row count
  - **Property 12: Parsed row count equals sum of rows across all files**
  - **Validates: Requirements 5.1**

- [x] 5.2 Write property test for cross-file duplicate Aadhaar detection
  - **Property 14: Cross-file duplicate Aadhaar detection**
  - **Validates: Requirements 5.4**

- [x] 5.3 Write property test for every parse result row having required fields
  - **Property 18: Every parse result row contains all required fields**
  - **Validates: Requirements 6.1**

- [x] 5.4 Write property test for error report
  - **Property 19: Error report contains all rows plus an error column**
  - **Validates: Requirements 6.2**

- [x] 5.5 Write property test for canSubmit derivation
  - **Property 20: canSubmit flag equals all-rows-valid**
  - **Validates: Requirements 6.3**

- [x] 6. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Bulk Pass controller and routes — user_service
  - Create `user_service/src/controllers/bulkPassController.js` with all functions: `createIntake`, `listBatches`, `getBatchDetail`, `updateBatch`, `forwardToApproval`, `returnToApplicant`, `resubmitBatch`, `getPublicByToken`, `downloadTemplate`, `uploadFiles`, `previewParsed`, `submitBatch`, `downloadErrorReport`, `downloadPdf`
  - Create `user_service/src/routes/bulkPassRoutes.js`: public routes (no verifyToken) first, then protected routes with verifyToken
  - Register in `user_service/src/routes/index.js` under `/bulk-pass`
  - Upload middleware: reuse existing `uploadMiddleware.js` for work order file; use a dedicated multer instance with `diskStorage` pointing to `/tmp/bulk_pass_excel/` for Excel files
  - Add `BULK_VISITOR_TYPES` constant array to `constants.js`
  - _Requirements: 1.1–1.10, 2.1, 2.2, 3.1–3.4, 4.1–4.5, 7.1–7.4, 9.1–9.3, 10.1–10.3, 11.1, 11.2, 11.5, 11.8_

- [x] 7.1 Write property test for forward-to-approval state change
  - **Property 7: Forward-to-approval produces UNDER_REVIEW and deactivates token**
  - **Validates: Requirements 3.1**

- [x] 7.2 Write property test for return-to-applicant state change
  - **Property 8: Return-to-applicant produces RETURNED_TO_APPLICANT and activates token**
  - **Validates: Requirements 3.2**

- [x] 7.3 Write property test for audit log entries
  - **Property 9: Every status transition produces an audit log entry**
  - **Validates: Requirements 3.3**

- [x] 7.4 Write property test for token lookup round-trip
  - **Property 10: Public token lookup returns intake for valid active tokens**
  - **Validates: Requirements 4.1**

- [x] 7.5 Write property test for file upload constraints
  - **Property 11: File upload constraints are enforced**
  - **Validates: Requirements 4.5**

- [x] 7.6 Write property test for submission state change
  - **Property 21: Successful submission creates person records and sets SUBMITTED status**
  - **Validates: Requirements 7.1, 7.4**

- [x] 7.7 Write property test for non-submittable state rejection
  - **Property 22: Submission rejected when batch not in submittable state**
  - **Validates: Requirements 7.3**

- [x] 7.8 Write property test for resubmit state change
  - **Property 26: Resubmit activates token and sets RETURNED_TO_APPLICANT**
  - **Validates: Requirements 9.2**

- [x] 7.9 Write property test for PDF download
  - **Property 27: PDF download returns PDF content for COMPLETED batches**
  - **Validates: Requirements 10.1**

- [x] 8. Email templates and email service integration
  - Create six template files in `email_service/src/emailTemplates/`: `bulkPassInvitationTemplate.js`, `bulkPassSubmittedTemplate.js`, `bulkPassUnderReviewTemplate.js`, `bulkPassReturnedTemplate.js`, `bulkPassApprovedTemplate.js`, `bulkPassRejectedTemplate.js`
  - Each template follows the HTML structure of `vendorPassLinkTemplate.js` (orange gradient header, table for key info, CTA button)
  - Add route handlers in the email service to dispatch each template: `sendBulkPassInvitation`, `sendBulkPassSubmitted`, `sendBulkPassUnderReview`, `sendBulkPassReturned`, `sendBulkPassApproved`, `sendBulkPassRejected`
  - Wire each email dispatch into the corresponding `bulkPassController.js` action
  - _Requirements: 1.10, 3.2, 7.2, 8.2, 8.3, 8.4, 11.7_

- [x] 9. QR service — Group QR PDF generation
  - Add `generateBulkPass(batchId, userServiceUrl)` function to `qr-service/src/services/passQrService.js`
  - Function fetches batch data from user_service, signs JWT payload `{ ref_no, person_count, vehicle_count, validity, batch_id, department, type: "bulk_pass" }` with `QR_SECRET`, generates QR code, builds PDF using PDFKit with same header as existing person passes
  - PDF includes: BLK reference number, QR code, validity, batch summary table (dept, visitor type, company, counts), "Authorized by Traffic Manager" footer
  - Writes PDF to `uploads/bulk_pass_pdfs/{refNo}.pdf` and returns buffer
  - Add route `POST /api/qr/bulk-pass/:batchId` in qr-service to expose the function
  - _Requirements: 8.2, 10.1, 10.2, 11.2_

- [x] 10. Traffic Officer approval — approval-admin-service
  - Create `approval-admin-service/src/controllers/bulkPassApprovalController.js` with: `getQueue(req, res)`, `approveBatch(req, res)`, `rejectBatch(req, res)`
  - `approveBatch`: calls user_service to set COMPLETED, calls qr-service to generate PDF, calls email service to send approval email with PDF
  - `rejectBatch`: requires `rejectionReason`, calls user_service to set REJECTED, sends rejection email
  - Create `approval-admin-service/src/routes/bulkPassRoutes.js` with routes: `GET /queue`, `POST /:id/approve`, `POST /:id/reject` — all protected by verifyToken
  - Register in `approval-admin-service/src/routes/index.js` under `/bulk-pass`
  - _Requirements: 8.1–8.4, 11.2_

- [x] 10.1 Write property test for traffic queue ordering
  - **Property 23: Traffic approval queue returns UNDER_REVIEW batches oldest-first**
  - **Validates: Requirements 8.1**

- [x] 10.2 Write property test for approval state change
  - **Property 24: Approval produces COMPLETED status and non-null qrPdfPath**
  - **Validates: Requirements 8.2**

- [x] 10.3 Write property test for rejection state change
  - **Property 25: Rejection produces REJECTED status and stores reason**
  - **Validates: Requirements 8.3**

- [x] 11. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Frontend API client
  - Create `HEP_Frontend/src/lib/bulkPassApi.js` with all API call functions mirroring `vendorPassApi.js` style: `getBulkVisitorTypes`, `createBulkIntake`, `listBulkBatches`, `getBulkBatchDetail`, `updateBulkBatch`, `forwardToApproval`, `returnToApplicant`, `resubmitBatch`, `getPublicBatch`, `uploadExcelFiles`, `parsePreview`, `submitBulkBatch`, `downloadTemplate`, `downloadErrorReport`, `downloadBulkPdf`
  - Uses `axios` with `authHeaders()` helper for authenticated calls; public calls omit auth header
  - _Requirements: 11.9_

- [x] 13. Dashboard navigation update
  - Add `Bulk Pass` navigation item to `HEP_Frontend/src/app/dashboard/layout.js` `getNavigationItems` function
  - Add to the `"Pass Officer"` role array: `{ name: "Bulk Pass", href: "/dashboard/bulk_pass", icon: Users }`
  - Add to the `"Traffic Officer"` role array: `{ name: "Bulk Pass", href: "/dashboard/bulk_pass", icon: Users }`
  - Import `Users` from `lucide-react` in the layout file
  - _Requirements: 11.6_

- [x] 14. Department User UI — Bulk Pass list page
  - Create `HEP_Frontend/src/app/dashboard/bulk_pass/page.js`
  - List page with: search bar (ref number, company name), status filter dropdown, date range filter, paginated table
  - Status chips with correct colors: DRAFT (grey), SUBMITTED (blue), UNDER_REVIEW (amber), RETURNED_TO_APPLICANT (orange), REJECTED (red), COMPLETED (green)
  - Action buttons per status row: Edit (DRAFT/RETURNED), Forward to Approval + Return to Applicant (SUBMITTED), Edit & Resubmit (REJECTED), Download QR PDF (COMPLETED)
  - Calls `listBulkBatches(filters)` from `bulkPassApi.js`
  - Matches existing card shell, rounded-3xl styling from dashboard page.js
  - _Requirements: 2.1–2.7_

- [x] 15. Department User UI — Create Bulk Pass form
  - Create `HEP_Frontend/src/app/dashboard/bulk_pass/create/page.js`
  - Form fields: Department (auto-filled, read-only), Type of Visitors (dropdown), Company Name, Applicant Email, Applicant Mobile, Ref Doc No (optional), Work Order Required (radio yes/no), No. of Persons (0–50), No. of Vehicles (0–20), Payment Mode (Cash/Free), Pass Type (Multiple/Single), Purpose of Visit (textarea), Validity Upto (datetime), Remarks (optional)
  - Client-side validation matching backend rules (email regex, 10-digit mobile, ranges, future date)
  - On submit calls `createBulkIntake(formData)`, shows success toast with ref number, redirects to list
  - _Requirements: 1.1–1.10_

- [x] 16. Department User UI — Batch detail page
  - Create `HEP_Frontend/src/app/dashboard/bulk_pass/[id]/page.js`
  - Displays: intake details (all form fields read-only), uploaded files summary (name, row count, upload time), person list table (name, Aadhaar, DOB, gender, mobile, vehicle, photo thumbnail), counts, status log history timeline
  - Action buttons based on current status (Forward to Approval, Return to Applicant with remarks modal, Download QR PDF)
  - Calls `getBulkBatchDetail(id)` and respective action API functions
  - _Requirements: 3.4, 10.1_

- [x] 17. Applicant Portal UI — public bulk pass page
  - Create `HEP_Frontend/src/app/bulk_pass/[token]/page.js`
  - On load: calls `getPublicBatch(token)` — shows "Invalid link" or "Link expired or inactive" for error states
  - Valid state: read-only intake info card, download template button, file upload section (max 5 files, .xlsx/.xls, 15 MB each, drag-and-drop + click to select)
  - After upload: "Parse & Preview" button calls `parsePreview(token, files)` and renders preview table
  - Preview table columns: File Source, Row #, Photo Thumbnail, Name, Aadhaar, DOB, Gender, Mobile, Vehicle, Status chip (Valid/Invalid), Error Message
  - Error count badge at top of table; "Download Error Report" button
  - "Re-upload" button clears state and shows upload section again
  - "Submit" button enabled only when all rows valid; on submit calls `submitBulkBatch(token)` then shows confirmation
  - Matches existing HEP UI style (Montserrat font, amber accent, rounded-3xl cards)
  - _Requirements: 4.1–4.5, 5.1–5.10, 6.1–6.4, 7.1–7.4_

- [x] 18. Final Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
