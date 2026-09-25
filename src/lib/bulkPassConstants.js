/**
 * bulkPassConstants.js
 * --------------------
 * Bulk Pass ceilings and defaults, mirroring BULK_PASS_LIMITS in
 * user_service/src/constants/constants.js.
 *
 * A Bulk Pass declares how many persons and vehicles it allows IN TOTAL — any
 * size the department approves. Each individual submission (batch) against
 * the pass is capped at 30 persons and 30 vehicles, so a 100-person pass is
 * used up over several batches. A single-submission pass carries exactly one
 * batch, so its totals cannot exceed the per-batch ceiling.
 */

export const BULK_PASS_LIMITS = Object.freeze({
  // Hard ceiling for one submission.
  MAX_PERSONS_PER_BATCH: 30,
  MAX_VEHICLES_PER_BATCH: 30,
  // Legacy aliases for the per-batch ceiling.
  MAX_PERSONS: 30,
  MAX_VEHICLES: 30,
  // Defaults for the pass-level totals on the create forms.
  DEFAULT_MAX_PERSONS: 30,
  DEFAULT_MAX_VEHICLES: 30,
  // Sanity ceiling for a pass-level total.
  MAX_TOTAL_PERSONS: 10000,
  MAX_TOTAL_VEHICLES: 10000,
});

/**
 * Validate the pass-level totals the way the server does. Returns
 * { noOfPersons?, noOfVehicles? } error messages, empty when fine.
 */
export function validatePassTotals(persons, vehicles, isReusable) {
  const errors = {};
  const p = Number(persons);
  const v = Number(vehicles);
  const perBatchP = BULK_PASS_LIMITS.MAX_PERSONS_PER_BATCH;
  const perBatchV = BULK_PASS_LIMITS.MAX_VEHICLES_PER_BATCH;

  if (!Number.isInteger(p) || p < 1) {
    errors.noOfPersons = `${BULK_PASS_LABELS.MAX_PERSONS} must be a whole number of at least 1.`;
  } else if (isReusable && p > BULK_PASS_LIMITS.MAX_TOTAL_PERSONS) {
    errors.noOfPersons = `${BULK_PASS_LABELS.MAX_PERSONS} cannot exceed ${BULK_PASS_LIMITS.MAX_TOTAL_PERSONS}.`;
  } else if (!isReusable && p > perBatchP) {
    errors.noOfPersons = `A single-submission bulk pass carries one batch of at most ${perBatchP} persons. Enable multiple submissions to allow more.`;
  }

  if (!Number.isInteger(v) || v < 0) {
    errors.noOfVehicles = `${BULK_PASS_LABELS.MAX_VEHICLES} must be a whole number of 0 or more.`;
  } else if (isReusable && v > BULK_PASS_LIMITS.MAX_TOTAL_VEHICLES) {
    errors.noOfVehicles = `${BULK_PASS_LABELS.MAX_VEHICLES} cannot exceed ${BULK_PASS_LIMITS.MAX_TOTAL_VEHICLES}.`;
  } else if (!isReusable && v > perBatchV) {
    errors.noOfVehicles = `A single-submission bulk pass carries one batch of at most ${perBatchV} vehicles. Enable multiple submissions to allow more.`;
  }
  return errors;
}

/**
 * How many batches a total needs at the per-batch ceiling, phrased for a form
 * hint. Returns null when there is nothing worth saying.
 */
export function batchesNeededHint(persons, vehicles, isReusable) {
  if (!isReusable) return null;
  const p = Number(persons) || 0;
  const v = Number(vehicles) || 0;
  const perBatchP = BULK_PASS_LIMITS.MAX_PERSONS_PER_BATCH;
  const perBatchV = BULK_PASS_LIMITS.MAX_VEHICLES_PER_BATCH;
  const needed = Math.max(Math.ceil(p / perBatchP), Math.ceil(v / perBatchV));
  if (needed <= 1) return null;
  return `Each batch carries up to ${perBatchP} persons and ${perBatchV} vehicles, so this pass will take at least ${needed} batches to use up.`;
}

// Field labels, kept in one place so every Bulk Pass surface uses the same words.
export const BULK_PASS_LABELS = Object.freeze({
  MAX_PERSONS: "Max No. of Persons",
  MAX_VEHICLES: "Max No. of Vehicles",
  PERSONS_SUBMITTED: "Persons Submitted",
  VEHICLES_SUBMITTED: "Vehicles Submitted",
  PER_BATCH_NOTE: `Up to ${BULK_PASS_LIMITS.MAX_PERSONS_PER_BATCH} persons and ${BULK_PASS_LIMITS.MAX_VEHICLES_PER_BATCH} vehicles in each batch`,
});

/**
 * Pick the right labels for a batch row.
 *
 * On a Bulk Pass the numbers are the ceiling for each batch; on one of the
 * batches inside it they are what the applicant actually sent. Same columns,
 * different meaning — so the label has to follow the row.
 */
export function countLabelsFor(batch) {
  const isChildSubmission = !!(batch?.parentRequestId ?? batch?.parent_request_id);
  return isChildSubmission
    ? { persons: BULK_PASS_LABELS.PERSONS_SUBMITTED, vehicles: BULK_PASS_LABELS.VEHICLES_SUBMITTED }
    : { persons: BULK_PASS_LABELS.MAX_PERSONS, vehicles: BULK_PASS_LABELS.MAX_VEHICLES };
}
