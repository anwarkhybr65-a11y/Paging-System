export const STAFF_COLLECTION = "staff";

export const ROLES = {
  admin: "admin",
  reception: "reception",
  doctor: "doctor",
  display: "display",
};

export const ROLE_LABELS = {
  admin: "الإدارة",
  reception: "الاستقبال",
  doctor: "الطبيب",
  display: "الشاشات",
};

export function homeForRole(role) {
  if (role === ROLES.admin) return "/admin";
  if (role === ROLES.reception) return "/reception";
  if (role === ROLES.doctor) return "/doctor";
  if (role === ROLES.display) return "/screens";
  return "/";
}

const LOGIN_ROLE_ORDER = {
  [ROLES.admin]: 0,
  [ROLES.reception]: 1,
  [ROLES.display]: 2,
  [ROLES.doctor]: 3,
};

export function sortLoginAccounts(accounts) {
  return [...(accounts || [])].sort((left, right) => {
    const roleDiff = (LOGIN_ROLE_ORDER[left.role] ?? 9) - (LOGIN_ROLE_ORDER[right.role] ?? 9);
    if (roleDiff) return roleDiff;
    return String(left.name || left.username || "").localeCompare(
      String(right.name || right.username || ""),
      "ar",
    );
  });
}

export function accountLoginLabel(account) {
  const name = account?.name || account?.username || "حساب";
  const role = ROLE_LABELS[account?.role] || "";
  if (!role || role === name) return name;
  return `${name} · ${role}`;
}
