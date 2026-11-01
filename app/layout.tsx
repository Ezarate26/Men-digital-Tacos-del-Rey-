import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tacos del Rey",
  description: "Menú digital de Tacos del Rey",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
