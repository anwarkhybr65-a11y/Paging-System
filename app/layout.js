import { Cairo } from "next/font/google";
import { AuthProvider } from "./AuthProvider";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "نظام النداء",
    template: "%s | نظام النداء",
  },
  description: "نظام عربي لنداء المرضى وإدارة أرقام الانتظار",
};

export const viewport = {
  themeColor: "#347ea0",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
