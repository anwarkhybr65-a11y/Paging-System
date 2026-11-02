import { RequireRole } from "../RequireRole";

export const metadata = {
  title: "الاستقبال",
};

export default function ReceptionLayout({ children }) {
  return <RequireRole allow={["reception", "admin"]}>{children}</RequireRole>;
}
