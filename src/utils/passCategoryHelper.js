/**
 * Helper utilities for Pass Request Visual Color Coding System
 * 
 * Color Hierarchy:
 * 1. Foreigner Pass -> Pink (#ec4899 / bg-pink-500 / bg-pink-100)
 * 2. Monthly / Yearly Pass -> Red (#ef4444 / bg-red-500 / bg-red-100)
 * 3. Daily Pass -> Blue (#3b82f6 / bg-blue-500 / bg-blue-100)
 */

export const isForeignerPerson = (person) => {
  if (!person) return false;
  const nat = String(person.nationality || "").trim().toUpperCase();
  if (nat && nat !== "INDIAN" && nat !== "INDIA" && nat !== "IND") return true;
  if (person.visaNo || person.passportPath || person.passportNo || person.passportName) return true;
  if (String(person.hepTypeId) === "3" || String(person.hepType) === "3" || String(person.hepTypeName || "").toUpperCase().includes("FOREIGN")) return true;
  return false;
};

export const isLongTermPass = (passType) => {
  if (!passType) return false;
  const str = String(passType).trim().toUpperCase();
  return str === "2" || str === "3" || str === "MONTHLY" || str === "YEARLY" || str === "ANNUAL";
};

export const getPassRequestCategory = (pass) => {
  if (!pass) {
    return {
      category: "DAILY",
      label: "Daily Pass",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      borderAccent: "border-l-4 border-l-blue-500",
      bgSubtle: "bg-blue-50/30 dark:bg-blue-950/10",
      textClass: "text-blue-700 dark:text-blue-400",
      badgeColor: "blue",
    };
  }

  const persons = Array.isArray(pass.persons) ? pass.persons : [];
  const vehicles = Array.isArray(pass.vehicles) ? pass.vehicles : [];

  // Check 1: Foreigner Pass (Pink - Highest Priority)
  const hasForeigner = persons.some(isForeignerPerson) || isForeignerPerson(pass);
  if (hasForeigner) {
    return {
      category: "FOREIGNER",
      label: "Foreigner Pass",
      badgeClass: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800",
      borderAccent: "border-l-4 border-l-pink-500",
      bgSubtle: "bg-pink-50/30 dark:bg-pink-950/10",
      textClass: "text-pink-700 dark:text-pink-400",
      badgeColor: "pink",
    };
  }

  // Check 2: Monthly or Yearly Pass (Red - Second Priority)
  const hasLongTerm =
    persons.some((p) => isLongTermPass(p.passType)) ||
    vehicles.some((v) => isLongTermPass(v.passType)) ||
    isLongTermPass(pass.passType);

  if (hasLongTerm) {
    return {
      category: "LONG_TERM",
      label: "Monthly / Yearly Pass",
      badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
      borderAccent: "border-l-4 border-l-red-500",
      bgSubtle: "bg-red-50/30 dark:bg-red-950/10",
      textClass: "text-red-700 dark:text-red-400",
      badgeColor: "red",
    };
  }

  // Default 3: Daily Pass Only (Blue)
  return {
    category: "DAILY",
    label: "Daily Pass",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    borderAccent: "border-l-4 border-l-blue-500",
    bgSubtle: "bg-blue-50/30 dark:bg-blue-950/10",
    textClass: "text-blue-700 dark:text-blue-400",
    badgeColor: "blue",
  };
};

export const getItemCategoryTag = (item, isPerson = true) => {
  if (!item) return null;

  if (isPerson && isForeignerPerson(item)) {
    return {
      label: "Foreigner Pass",
      tagClass: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
      btnClass: "bg-pink-600 hover:bg-pink-700 text-white shadow-sm",
      color: "pink",
    };
  }

  if (isLongTermPass(item.passType)) {
    const typeStr = String(item.passType).trim().toUpperCase();
    const periodLabel = typeStr === "3" || typeStr === "YEARLY" || typeStr === "ANNUAL" ? "Yearly Pass" : "Monthly Pass";
    return {
      label: periodLabel,
      tagClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
      btnClass: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
      color: "red",
    };
  }

  return {
    label: "Daily Pass",
    tagClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    color: "blue",
  };
};
