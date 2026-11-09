import { RequireRole } from "../RequireRole";
import { ROLES } from "@/lib/auth";

export const metadata = {
  title: "لوحة الشاشات",
};

export default function ScreensLayout({ children }) {
  return <RequireRole allow={[ROLES.admin, ROLES.display]}>{children}</RequireRole>;
}
