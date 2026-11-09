import { RequireRole } from "../RequireRole";
import { ROLES } from "@/lib/auth";

export const metadata = {
  title: "إدارة الصور",
};

export default function MediaLayout({ children }) {
  return <RequireRole allow={[ROLES.admin, ROLES.display]}>{children}</RequireRole>;
}
