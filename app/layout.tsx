import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tra cứu Giấy chứng nhận | Fly To Sky",
  description: "Cổng thông tin tra cứu giấy chứng nhận và sao kê tài khoản Fly To Sky",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
