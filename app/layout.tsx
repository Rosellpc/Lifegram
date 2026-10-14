import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./components/BottomNav";
import NotificationsProvider from "./components/NotificationsProvider";

export const metadata: Metadata = {
  title: "Lifegram",
  description: "Tus momentos, tu comunidad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <NotificationsProvider>
        <div className="pb-20">
          {children}
        </div>
        <BottomNav />
        </NotificationsProvider>
      </body>
    </html>
  );
}
