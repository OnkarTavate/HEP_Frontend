// Reports shown here must have a working backend route and real database query.
export const reports = [
  {
    slug: "card-penalty-report",
    title: "Pass Penalty Report",
    description: "Blacklist and overstay penalties associated with passes.",
    implemented: true,
  },
  {
    slug: "registered-users",
    title: "Registered Users",
    description: "Company and user account information.",
    implemented: true,
  },
  {
    slug: "type-of-pass-issued",
    title: "Type of Pass Issued",
    description: "Pass issuance grouped by pass type.",
    implemented: true,
  },
  {
    slug: "revenue-report",
    title: "Revenue Report",
    description: "Revenue generated from issued person and vehicle passes.",
    implemented: true,
  },
  {
    slug: "pass-approval-report",
    title: "Pass Approval Report",
    description: "Approval status across person and vehicle pass requests.",
    implemented: true,
  },
  {
    slug: "gate-wise-in-out-summary",
    title: "Gate In/Out Summary",
    description: "Available QR scan activity summarized by gate.",
    implemented: true,
  },
  {
    slug: "gate-lane-wise-in-out-summary",
    title: "Gate Lane-wise In/Out Summary",
    description: "Available QR scan activity summarized by gate lane.",
    implemented: true,
  },
  {
    slug: "card-inventory-summary",
    title: "QR Pass Inventory Summary",
    description: "Issued, pending, and revoked QR passes by holder type.",
    implemented: true,
  },
  {
    slug: "all-pass-issuance-report",
    title: "All Pass Issuance Report",
    description: "Combined issuance report for all supported pass types.",
    implemented: true,
  },
  {
    slug: "shift-wise-approval-rejection",
    title: "Shift-Wise Daily Approval and Rejection Report",
    description: "Daily pass decisions grouped by employee and derived work shift.",
    implemented: true,
  },
  {
    slug: "vehicle-master",
    title: "Vehicle Report",
    description: "Vehicle registration, type, insurance, RC validity, and RC document details.",
    implemented: true,
  },
  {
    slug: "bulk-pass-report",
    title: "Bulk Pass Report",
    description: "Bulk person, driver, and vehicle pass records.",
    implemented: true,
  },
  {
    slug: "blacklisting-report",
    title: "Blacklisting Report",
    description: "Blacklisted persons and vehicles with action date and time.",
    implemented: true,
  },
  {
    slug: "material-movement-report",
    title: "Material Movement Report",
    description: "Material pass movements with scan date and time.",
    implemented: true,
  },
];

export const getReport = (slug) =>
  reports.find((report) => report.slug === slug);
