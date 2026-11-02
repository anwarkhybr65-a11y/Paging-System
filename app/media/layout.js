import { RequireRole } from "../RequireRole";

export const metadata = {
  title: "إدارة الصور",
};

export default function MediaLayout({ children }) {
  return <RequireRole allow={["admin"]}>{children}</RequireRole>;
}
