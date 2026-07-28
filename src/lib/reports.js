export const reports = [
  {
    slug: "registered-users",
    title: "Registered Users",
    description: "Company and user account information.",
  },
  {
    slug: "type-of-pass-issued",
    title: "Type of Pass Issued",
    description: "Pass issuance grouped by pass type.",
  },
];

export const getReport = (slug) =>
  reports.find((report) => report.slug === slug);
