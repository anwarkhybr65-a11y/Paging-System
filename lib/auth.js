export const STAFF_COLLECTION = "staff";

export const ROLES = {
  admin: "admin",
  reception: "reception",
  doctor: "doctor",
};

export const ROLE_LABELS = {
  admin: "الإدارة",
  reception: "الاستقبال",
  doctor: "الطبيب",
};

export function homeForRole(role) {
  if (role === ROLES.admin) return "/admin";
  if (role === ROLES.reception) return "/reception";
  if (role === ROLES.doctor) return "/doctor";
  return "/";
}
