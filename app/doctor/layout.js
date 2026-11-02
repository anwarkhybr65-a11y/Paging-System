import { RequireRole } from "../RequireRole";

export const metadata = {
  title: "لوحة الطبيب",
};

export default function DoctorLayout({ children }) {
  return <RequireRole allow={["doctor", "admin"]}>{children}</RequireRole>;
}
