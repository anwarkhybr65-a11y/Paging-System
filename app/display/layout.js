import { RequireRole } from "../RequireRole";

export const metadata = {
  title: "شاشة العرض",
};

export default function DisplayLayout({ children }) {
  return (
    <RequireRole allow={["admin"]} allowPublic>
      {children}
    </RequireRole>
  );
}
