/**
 * Column + filter specifications for each data tab. Filter `key`s double as the
 * URL query key and the API query parameter. Column `sortKey`s are whitelisted
 * server-side in trafficAnalyticsSchema.js.
 */
import { fmtMinutes, fmtNum, fmtWeight } from "./format";

const yesNo = ["Yes", "No"];

export const TABLE_SPECS = {
  eir: {
    title: "EIR — terminal gate movements",
    subtitle: "Equipment Interchange Receipts pushed by CITPL / CCTPL / CCTL",
    endpoint: "/eir",
    exportName: "eir",
    defaultSort: { by: "inGate", order: "DESC" },
    filters: [
      { key: "line", label: "Shipping line", type: "select", optionsKey: "lines" },
      { key: "fullEmpty", label: "Full / Empty", type: "select", options: ["Full", "Empty"] },
      { key: "oocStatus", label: "OOC status", type: "select", options: yesNo },
      { key: "markedForScanning", label: "Scan flag", type: "select", options: yesNo },
      { key: "destinationGroup", label: "Destination group", type: "select", optionsKey: "destinationGroups" },
      { key: "containerNumber", label: "Container", type: "text", placeholder: "MSCU…" },
      { key: "trailerNumber", label: "Trailer", type: "text", placeholder: "TN01…" },
      { key: "openOnly", label: "Still inside (no gate-out)", type: "toggle" },
    ],
    columns: [
      { key: "eirNo", label: "EIR No", mono: true },
      { key: "terminal", label: "Terminal", sortKey: "terminal", badge: true },
      { key: "containerNumber", label: "Container", sortKey: "containerNumber", mono: true, strong: true },
      { key: "containerSize", label: "Size", align: "center" },
      { key: "movementType", label: "Movement", pill: { Export: "blue", Import: "orange" } },
      { key: "fullEmpty", label: "F/E", pill: { Full: "slate", Empty: "muted" } },
      { key: "line", label: "Line", sortKey: "line" },
      { key: "trailerNumber", label: "Trailer", sortKey: "trailerNumber", mono: true },
      { key: "inGate", label: "Gate in (IST)", sortKey: "inGate" },
      { key: "outGate", label: "Gate out (IST)", sortKey: "outGate", empty: "Inside" },
      { key: "dwellMinutes", label: "Dwell", sortKey: "dwellMinutes", align: "right", format: (v) => (v === null ? "—" : fmtMinutes(v)) },
      { key: "oocStatus", label: "OOC", pill: { Yes: "green", No: "red" }, empty: "n/a" },
      { key: "markedForScanning", label: "Scan", pill: { Yes: "amber", No: "muted" } },
      { key: "destinationGroup", label: "Dest. group", hidden: true },
      { key: "destinationName", label: "Destination", hidden: true },
      { key: "operator", label: "Pushed by", hidden: true },
      { key: "receivedAt", label: "Received (IST)", sortKey: "receivedAt", hidden: true },
    ],
    journey: (row) => ({ container: row.containerNumber }),
  },

  form13: {
    title: "Form 13 — export gate permits",
    subtitle: "One row per container listed on a Form 13",
    endpoint: "/form13",
    exportName: "form13",
    defaultSort: { by: "receivedAt", order: "DESC" },
    filters: [
      { key: "containerNumber", label: "Container", type: "text", placeholder: "MSCU…" },
      { key: "trailerNumber", label: "Trailer", type: "text", placeholder: "TN01…" },
    ],
    columns: [
      { key: "form13No", label: "Form 13 No", sortKey: "form13No", mono: true },
      { key: "terminal", label: "Terminal", sortKey: "terminal", badge: true },
      { key: "trailerNumber", label: "Trailer", sortKey: "trailerNumber", mono: true },
      { key: "containerNumber", label: "Container", sortKey: "containerNumber", mono: true, strong: true, empty: "—" },
      { key: "containerSize", label: "Size", align: "center" },
      { key: "containerISO", label: "ISO" },
      { key: "containerType", label: "Type", empty: "—" },
      { key: "movementType", label: "Movement", pill: { Export: "blue", Import: "orange" } },
      { key: "containersOnForm", label: "On form", align: "right" },
      { key: "operator", label: "Pushed by", hidden: true },
      { key: "receivedAt", label: "Received (IST)", sortKey: "receivedAt" },
    ],
    journey: (row) => (row.containerNumber ? { container: row.containerNumber } : { vehicle: row.trailerNumber }),
  },

  weighbridge: {
    title: "Weighbridge — weighment tickets",
    subtitle: "Gross / tare / net from iPortman weighbridge operators",
    endpoint: "/weighbridge",
    exportName: "weighbridge",
    defaultSort: { by: "weighedAt", order: "DESC" },
    filters: [
      { key: "cargo", label: "Cargo", type: "select", optionsKey: "cargos" },
      { key: "clientName", label: "Client", type: "text", placeholder: "Client name" },
      { key: "vehicleNumber", label: "Vehicle", type: "text", placeholder: "TN01…" },
      { key: "serialNo", label: "Serial no", type: "text", placeholder: "SN-…" },
      { key: "minNet", label: "Min net (kg)", type: "number" },
      { key: "maxNet", label: "Max net (kg)", type: "number" },
      { key: "mismatchOnly", label: "Net ≠ gross − tare", type: "toggle" },
    ],
    columns: [
      { key: "serialNo", label: "Serial", sortKey: "serialNo", mono: true },
      { key: "weighBridgeName", label: "Weighbridge", sortKey: "weighBridgeName", badge: true },
      { key: "weighedAt", label: "Weighed (IST)", sortKey: "weighedAt" },
      { key: "vehicleNumber", label: "Vehicle", sortKey: "vehicleNumber", mono: true, strong: true },
      { key: "movementType", label: "Movement", pill: { Export: "blue", Import: "orange" } },
      { key: "cargo", label: "Cargo", sortKey: "cargo" },
      { key: "clientName", label: "Client", sortKey: "clientName" },
      { key: "grossWeight", label: "Gross", sortKey: "grossWeight", align: "right", format: (v, r) => `${fmtNum(v, 3)} ${r.weightUnit}` },
      { key: "tareWeight", label: "Tare", align: "right", format: (v, r) => `${fmtNum(v, 3)} ${r.weightUnit}` },
      { key: "netWeight", label: "Net", align: "right", format: (v, r) => `${fmtNum(v, 3)} ${r.weightUnit}`, strong: true },
      { key: "netKg", label: "Net (t)", sortKey: "netKg", align: "right", format: (v) => fmtWeight(v) },
      { key: "weightVariance", label: "Variance", align: "right", format: (v) => (Math.abs(v) < 1 ? "0" : fmtNum(v, 2)), flagIf: (v, r) => Math.abs(v) > Math.max(1, 0.01 * r.grossWeight) },
      { key: "operatorLogin", label: "Operator", hidden: true },
    ],
    journey: (row) => ({ vehicle: row.vehicleNumber }),
  },

  customs: {
    title: "Customs — OOC, Rapiscan & examinations",
    subtitle: "Unified feed from the Customs integration",
    endpoint: "/customs",
    exportName: "customs",
    defaultSort: { by: "eventAt", order: "DESC" },
    filters: [
      { key: "recordType", label: "Record type", type: "select", options: ["OOC", "RAPISCAN", "EXAMINATION"] },
      { key: "status", label: "Status", type: "select", options: ["Out of Charge", "Clean", "Mismatch", "Discrepancy", "No Discrepancy"] },
      { key: "containerNumber", label: "Container", type: "text", placeholder: "MSCU…" },
    ],
    columns: [
      { key: "recordType", label: "Record", sortKey: "recordType", pill: { OOC: "blue", RAPISCAN: "violet", EXAMINATION: "amber" } },
      { key: "containerNumber", label: "Container", sortKey: "containerNumber", mono: true, strong: true },
      { key: "containerSize", label: "Size", align: "center", empty: "—" },
      { key: "status", label: "Status", sortKey: "status", pill: { Clean: "green", Mismatch: "red", Discrepancy: "red", "No Discrepancy": "green", "Out of Charge": "green" } },
      { key: "reference", label: "Reference", mono: true, empty: "—" },
      { key: "eventAt", label: "Event (IST)", sortKey: "eventAt" },
      { key: "details", label: "Details", empty: "—", wide: true },
      { key: "receivedAt", label: "Received (IST)", sortKey: "receivedAt", hidden: true },
    ],
    journey: (row) => ({ container: row.containerNumber }),
  },

  gate: {
    title: "Gate events — hardware verifications",
    subtitle: "ANPR, container OCR, QR and face reads pushed by gate devices",
    endpoint: "/gate-events",
    exportName: "gate_events",
    defaultSort: { by: "occurredAt", order: "DESC" },
    filters: [
      { key: "gateCode", label: "Gate", type: "select", optionsKey: "gates", optionValue: "value", optionLabel: "label" },
      { key: "verificationType", label: "Type", type: "select", options: ["VEHICLE", "CONTAINER", "CARGO", "QR", "FACE"] },
      { key: "status", label: "Outcome", type: "select", options: ["PASSED", "FAILED", "PENDING"] },
      { key: "identifier", label: "Identifier", type: "text", placeholder: "Plate / container / card" },
    ],
    columns: [
      { key: "occurredAt", label: "Time (IST)", sortKey: "occurredAt" },
      { key: "gateName", label: "Gate", sortKey: "gateCode", badge: true },
      { key: "laneName", label: "Lane", empty: "—" },
      { key: "verificationType", label: "Type", sortKey: "verificationType", pill: { VEHICLE: "blue", CONTAINER: "violet", CARGO: "amber", QR: "slate", FACE: "slate" } },
      { key: "identifier", label: "Identifier", sortKey: "identifier", mono: true, strong: true },
      { key: "status", label: "Outcome", sortKey: "status", pill: { PASSED: "green", FAILED: "red", PENDING: "amber" } },
      { key: "matchScore", label: "Score", sortKey: "matchScore", align: "right", empty: "—" },
      { key: "reason", label: "Reason", empty: "—", wide: true },
      { key: "deviceId", label: "Device", hidden: true },
      { key: "source", label: "Source", hidden: true },
    ],
    journey: (row) =>
      row.verificationType === "CONTAINER" || row.verificationType === "CARGO"
        ? { container: row.identifier }
        : { vehicle: row.identifier },
  },
};

export const PILL_STYLES = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/30",
  orange: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-400/30",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30",
  red: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/30",
  amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/30",
  violet: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/30",
  slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-600",
  muted: "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
};
