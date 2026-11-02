import { RequireRole } from "../RequireRole";

export const metadata = {
  title: "لوحة الإدارة",
};

export default function AdminLayout({ children }) {
  return <RequireRole allow={["admin"]}>{children}</RequireRole>;
}
