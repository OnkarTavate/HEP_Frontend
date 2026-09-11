/**
 * Centralized Role Routing & Route Guard System for APACS / HEP System.
 * 
 * Ensures strict multi-portal separation so that users logged in with a given role
 * cannot navigate or redirect to unauthorized portals.
 */

export const TRAFFIC_DEPT_IDS = [9, 10, 11, 12, 13, 14, 15];
export const MARINE_DEPT_ID = 7;
export const VENDOR_ONLY_DEPT_IDS = [3, 4, 5, 6, 16];

export const TM_ROLES = ["tm", "traffic manager", "traffic_manager"];
export const SHIPPING_CONTROL_ROLES = ["ss", "sm", "asm"];
export const TRAFFIC_APPROVAL_ROLES = [
  "approval",
  "safety officer",
  "fire safety officer",
  "senior deputy traffic manager",
];
export const PASS_SECTION_ROLES = ["atm", "pass admin", "pass officer", "pass section"];

/**
 * Returns the canonical home route for a given user or token payload.
 */
export function resolveHome(user) {
  if (!user) return "/";

  const role = String(user.role || "").toLowerCase().trim();
  const deptId = Number(user.departmentId);
  const deptName = String(user.departmentName || "").toLowerCase().trim();
  const loginId = String(user.username || user.loginId || "").trim();

  // 1. Global Admin
  if (role === "admin" || role === "administrator") {
    return "/admin";
  }

  // 2. Head of Department
  if (role === "hod") {
    return "/hod";
  }

  // 3. Traffic Manager (Executive Dashboard)
  if (TM_ROLES.includes(role)) {
    return "/traffic_manager";
  }

  // 4. Assistant Traffic Manager (ATM)
  if (role === "atm") {
    return "/atm_dashboard";
  }

  // 5. Pass Section Manager / Pass Admin
  if (role.includes("pass") && !role.includes("vendor")) {
    return "/pass_section";
  }

  // 6. Shipping Control (SS / SM / ASM)
  if (SHIPPING_CONTROL_ROLES.includes(role)) {
    return "/traffic_approval/dashboard";
  }

  // 7. Traffic Approval Officers
  if (
    (TRAFFIC_APPROVAL_ROLES.includes(role) && TRAFFIC_DEPT_IDS.includes(deptId)) ||
    (role === "approval" && deptName.includes("traffic"))
  ) {
    return "/traffic_approval/dashboard";
  }

  // 8. Marine Approval Officers
  if (
    (role === "approval" && deptId === MARINE_DEPT_ID) ||
    (role === "approval" && deptName.includes("marine"))
  ) {
    return "/marine_approval";
  }

  // 9. Port Ops / Specialized Department Roles
  if (role === "cisf" || deptName.includes("cisf")) {
    return "/cisf_dashboard";
  }
  if (role === "gate operator" || role === "weigh bridge" || deptName.includes("gate")) {
    return "/gate_dashboard";
  }
  if (role === "safety officer" || role === "fire safety officer" || deptName.includes("safety")) {
    return "/safety_dashboard";
  }
  if (role === "finance" || deptName.includes("finance")) {
    return "/finance_dashboard";
  }

  // 10. Department approval for Civil, Mechanical, Gen Admin, etc.
  if (role === "approval") {
    return "/admin/vendor_pass";
  }

  // 11. External Agent / Company applicant (loginId starts with 190 or role is agent)
  if (loginId.startsWith("190") || role === "agent" || role === "applicant" || role === "user") {
    return "/dashboard";
  }

  // Fallback
  return "/dashboard";
}

/**
 * Checks if the user has permission to access a specific portal area.
 */
export function canAccess(portalKey, user) {
  if (!user) return false;

  const role = String(user.role || "").toLowerCase().trim();
  const deptId = Number(user.departmentId);
  const deptName = String(user.departmentName || "").toLowerCase().trim();
  const loginId = String(user.username || user.loginId || "").trim();
  const isAdmin = role === "admin" || role === "administrator";

  switch (portalKey) {
    case "traffic_manager":
      // Strictly Traffic Manager role (or Super Admin)
      return TM_ROLES.includes(role) || isAdmin;

    case "traffic_approval":
      // Traffic approval officers, shipping control, or admin
      if (isAdmin) return true;
      if (SHIPPING_CONTROL_ROLES.includes(role)) return true;
      if (TRAFFIC_APPROVAL_ROLES.includes(role) && TRAFFIC_DEPT_IDS.includes(deptId)) return true;
      if (role === "approval" && deptName.includes("traffic")) return true;
      return false;

    case "atm_dashboard":
      // ATM role or Super Admin
      return role === "atm" || isAdmin;

    case "pass_section":
      // ATM, Pass Admin, Pass Officer, or Super Admin
      return role === "atm" || role.includes("pass") || isAdmin;

    case "admin":
      // Super Admin, or Approval department user on /admin/vendor_pass
      return isAdmin || role === "approval";

    case "dashboard":
      // Strictly external Agents / Companies (loginId starts with 190, or role agent/applicant)
      // Internal port staff (ATM, TM, Approval, CISF, Admin, etc.) MUST NOT access agent dashboard!
      if (isAdmin || TM_ROLES.includes(role) || role === "atm" || role === "approval" || role === "cisf" || role === "hod") {
        return false;
      }
      return loginId.startsWith("190") || role === "agent" || role === "applicant" || role === "user";

    case "marine_approval":
      if (isAdmin) return true;
      return (role === "approval" && deptId === MARINE_DEPT_ID) || (role === "approval" && deptName.includes("marine"));

    case "hod":
      return role === "hod" || isAdmin;

    case "cisf":
      return role === "cisf" || deptName.includes("cisf") || isAdmin;

    case "gate":
      return role === "gate operator" || role === "weigh bridge" || deptName.includes("gate") || isAdmin;

    case "safety":
      return role === "safety officer" || role === "fire safety officer" || deptName.includes("safety") || isAdmin;

    case "finance":
      return role === "finance" || deptName.includes("finance") || isAdmin;

    default:
      return false;
  }
}

/**
 * Executes standard route protection inside portal layouts.
 * If unauthorized, alerts user and redirects to their own authorized home portal.
 */
export function enforceRouteGuard(portalKey, router, setUser, setShowPasswordChangeModal) {
  if (typeof window === "undefined") return;

  const storedUser = localStorage.getItem("user");
  if (!storedUser) {
    setTimeout(() => router.push("/"), 0);
    return false;
  }

  try {
    const user = JSON.parse(storedUser);
    const hasAccess = canAccess(portalKey, user);

    if (!hasAccess) {
      const properHome = resolveHome(user);
      // Dynamically call toast only on the client side to avoid SSR issues
      if (typeof window !== "undefined") {
        import("sonner").then(({ toast }) => {
          toast.error("Access Restricted: You are not authorized to access this portal.");
        }).catch(() => {});
      }
      setTimeout(() => router.push(properHome), 0);
      return false;
    }

    if (setUser) setUser(user);
    if (setShowPasswordChangeModal && user.isPasswordChanged === false) {
      setShowPasswordChangeModal(true);
    }
    return true;
  } catch (err) {
    console.error("Route guard parse error:", err);
    setTimeout(() => router.push("/"), 0);
    return false;
  }
}
