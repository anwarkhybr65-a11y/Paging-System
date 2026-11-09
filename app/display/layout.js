import { RequireRole } from "../RequireRole";
import { ROLES } from "@/lib/auth";

export const metadata = {
  title: "شاشة العرض",
};

export default function DisplayLayout({ children }) {
  return (
    <RequireRole allow={[ROLES.admin, ROLES.display]} allowPublic>
      {children}
    </RequireRole>
  );
}
